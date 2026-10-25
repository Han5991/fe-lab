/**
 * `supabase/migrations/` 전체를 PGlite(WASM Postgres)에 실제로 적용하고 그 위에서 RPC를 부른다 — 마이그레이션이
 * PGlite에 없는 확장을 요구하면 여기서부터 깨진다.
 *
 * - increment_view_count는 형식 밖 slug를 에러 없이 버린다(fail-soft) — 검증이 틀려도 다른 신호가 없어서,
 *   anon으로 불러 쌓인 행을 센다.
 * - get_posts_trends는 admin 추이를 json 하나로 낸다 — 날짜 경계(KST·365일 창)와 거르기, service_role 전용 권한을
 *   값으로 잠근다. 옛 get_all_posts_trends는 지워졌고(20261025010000) 더는 없다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  isPostTrendRows,
  MAX_SLUG_LENGTH,
  type PostTrendRow,
} from './adminActions';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);

// Supabase가 미리 만들어 두는 역할과 public 스키마 기본 권한 — 마이그레이션은 이 위에서 돈다.
const SUPABASE_BASELINE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_BASELINE);
  const files = readdirSync(MIGRATIONS)
    .filter(f => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
  }
  // PUBLIC만 가진 역할 — 명시한 역할 밖에서 RPC를 부를 수 없는지 본다.
  await db.exec('create role stranger nologin');
}, 60_000);

afterAll(() => db.close());

describe('increment_view_count', () => {
  interface Recorded {
    views: number;
    logs: number;
  }

  async function totals(): Promise<Recorded> {
    const { rows } = await db.query<Recorded>(`
      select (select coalesce(sum(view_count), 0) from public.post_views)::int as views,
             (select count(*) from public.post_view_logs)::int as logs
    `);
    return rows[0];
  }

  /** 공개 페이지처럼 anon으로 한 번 부르고, 두 테이블에 새로 쌓인 양을 돌려준다. */
  async function recordView(slug: string | null): Promise<Recorded> {
    const before = await totals();
    await db.transaction(async tx => {
      await tx.exec('set local role anon');
      await tx.query('select public.increment_view_count($1)', [slug]);
    });
    const after = await totals();
    return {
      views: after.views - before.views,
      logs: after.logs - before.logs,
    };
  }

  test.each([
    ['영문 slug', 'javascript-error'],
    ['점이 든 slug', 'vue-3.0'],
    ['한글·공백·괄호가 든 경로 slug', 'react/component/에러 경계 (1편)'],
    ['공백 문자가 섞였을 뿐인 slug', 'a b'],
    ['상한 길이', '가'.repeat(MAX_SLUG_LENGTH)],
  ])('%s는 집계한다', async (_, slug) => {
    expect(await recordView(slug)).toStrictEqual({ views: 1, logs: 1 });
  });

  test.each([
    ['NULL', null],
    ['빈 문자열', ''],
    ['ASCII 공백뿐', '   '],
    ['NBSP뿐', ' '],
    ['전각 공백뿐', '　'],
    ['제로폭 공백뿐', '​'],
    ['BOM뿐', '﻿'],
    ['유니코드 공백 섞음', '  　 '],
    ['상한 초과', '가'.repeat(MAX_SLUG_LENGTH + 1)],
    ['줄바꿈 포함', 'a\nb'],
    ['제어 문자 포함', 'a\u0001b'],
  ])('%s는 버린다', async (_, slug) => {
    expect(await recordView(slug)).toStrictEqual({ views: 0, logs: 0 });
  });

  test('anon 등 명시한 역할 밖(PUBLIC)은 실행할 수 없다', async () => {
    await expect(
      db.transaction(async tx => {
        await tx.exec('set local role stranger');
        await tx.query('select public.increment_view_count($1)', ['x']);
      }),
    ).rejects.toThrow(/permission denied for function increment_view_count/);
  });
});

describe('get_posts_trends', () => {
  /** 시드에 쓴 KST 날짜들 — 같은 트랜잭션의 now()에서 뽑아 기대값을 만든다. */
  interface SeedDates {
    first: string;
    beforeMidnight: string;
    afterMidnight: string;
    today: string;
  }

  /**
   * 창의 경계·KST 자정·UTC와 날짜가 갈리는 시각에 기록을 심는다. 시각은 KST 벽시계로 적고 timestamptz로 바꾼다.
   * 트랜잭션 안에서만 쓰므로 now()가 시드와 조회에서 같다(KST 자정을 넘나들며 돌아도 경계가 밀리지 않는다).
   */
  async function seed(tx: Transaction): Promise<SeedDates> {
    await tx.exec(`
      with d as (
        select ((now() at time zone 'Asia/Seoul') - interval '365 days')::date as d0,
               (now() at time zone 'Asia/Seoul')::date as today
      )
      insert into public.post_view_logs (slug, viewed_at)
      select v.slug, v.kst at time zone 'Asia/Seoul'
      from d, lateral (values
        ('trend-a', d0::timestamp),                                     -- 창의 첫 순간: 포함
        ('trend-a', d0::timestamp - interval '1 microsecond'),          -- 그 직전(KST 전날): 제외
        ('trend-a', (d0 + 10)::timestamp + interval '23:59:59.999999'), -- KST 자정 직전
        ('trend-a', (d0 + 11)::timestamp),                              -- KST 자정
        ('trend-b', today::timestamp + interval '00:00:01'),            -- UTC로는 전날
        ('trend-b', today::timestamp + interval '08:59:59'),            -- UTC로는 전날
        ('trend-b', today::timestamp + interval '09:00'),               -- UTC로는 같은 날
        ('trend/한글 경로 (1편)', (d0 + 100)::timestamp + interval '12:00'),
        ('trend-v3.0', (d0 + 200)::timestamp + interval '12:00'),
        ('trend-old', d0::timestamp - interval '1 day')                 -- 창 밖뿐인 글
      ) as v(slug, kst)
    `);
    const { rows } = await tx.query<SeedDates>(`
      with d as (
        select ((now() at time zone 'Asia/Seoul') - interval '365 days')::date as d0,
               (now() at time zone 'Asia/Seoul')::date as today
      )
      select d0::text as first, (d0 + 10)::text as "beforeMidnight",
             (d0 + 11)::text as "afterMidnight", today::text as today
      from d
    `);
    return rows[0];
  }

  /** service_role(Edge Function)로 get_posts_trends를 부른다. */
  async function trendsRpc(
    tx: Transaction,
    slugs: readonly string[] | null,
  ): Promise<PostTrendRow[]> {
    await tx.exec('set local role service_role');
    const result = await tx.query<{ rows: PostTrendRow[] }>(
      'select public.get_posts_trends($1::text[]) as rows',
      [slugs === null ? null : [...slugs]],
    );
    await tx.exec('reset role');
    return result.rows[0].rows;
  }

  /** 시드를 심고 조회한 뒤 되돌린다 — 다른 테스트가 이 행을 보지 않게. */
  async function inSeededTransaction<T>(
    run: (tx: Transaction, dates: SeedDates) => Promise<T>,
  ): Promise<T> {
    return db.transaction(async tx => {
      const dates = await seed(tx);
      const result = await run(tx, dates);
      await tx.rollback();
      return result;
    });
  }

  test('옛 get_all_posts_trends는 지워졌다', async () => {
    const { rows } = await db.query<{ gone: boolean }>(
      "select to_regprocedure('public.get_all_posts_trends()') is null as gone",
    );
    expect(rows[0].gone).toBe(true);
  });

  test('slug 목록을 주면 그 글만, 주지 않으면(null) 기록이 있는 모든 글을 싣는다', async () => {
    const { everything, picked, none, empty } = await inSeededTransaction(
      async tx => ({
        // 같은 DB에 다른 테스트가 남긴 기록(increment_view_count)이 섞이므로 이 테스트의 시드만 본다.
        everything: new Set(
          (await trendsRpc(tx, null))
            .map(r => r.slug)
            .filter(slug => slug.startsWith('trend')),
        ),
        picked: new Set(
          (await trendsRpc(tx, ['trend-a', 'trend-v3.0'])).map(r => r.slug),
        ),
        none: await trendsRpc(tx, ['no-such-post']),
        empty: await trendsRpc(tx, []),
      }),
    );
    // 창 밖 기록뿐인 trend-old는 어느 쪽에도 없다.
    expect(everything).toStrictEqual(
      new Set(['trend-a', 'trend-b', 'trend/한글 경로 (1편)', 'trend-v3.0']),
    );
    expect(picked).toStrictEqual(new Set(['trend-a', 'trend-v3.0']));
    expect(none).toStrictEqual([]);
    expect(empty).toStrictEqual([]);
  });

  test('한글·공백·괄호가 든 경로 slug도 그대로 거른다', async () => {
    const rows = await inSeededTransaction(tx =>
      trendsRpc(tx, ['trend/한글 경로 (1편)']),
    );
    expect(rows.map(r => r.slug)).toStrictEqual(['trend/한글 경로 (1편)']);
  });

  test('KST 날짜로 묶고, 365일 창의 첫 순간부터 싣는다', async () => {
    const { rows, dates } = await inSeededTransaction(async (tx, dates) => {
      const rows = await trendsRpc(tx, ['trend-a', 'trend-b', 'trend-old']);
      return { rows, dates };
    });
    // Edge Function·클라이언트가 이 json을 좁히는 가드가 실제 RPC 출력을 받아들인다(bigint는 JSON number).
    expect(isPostTrendRows(rows)).toBe(true);
    expect(rows).toStrictEqual([
      { slug: 'trend-a', view_date: dates.first, view_count: 1 },
      { slug: 'trend-a', view_date: dates.beforeMidnight, view_count: 1 },
      { slug: 'trend-a', view_date: dates.afterMidnight, view_count: 1 },
      { slug: 'trend-b', view_date: dates.today, view_count: 3 },
    ]);
  });

  test.each(['anon', 'authenticated', 'stranger'])(
    '%s는 실행할 수 없다(service_role 전용)',
    async role => {
      await expect(
        db.transaction(async tx => {
          await tx.exec(`set local role ${role}`);
          await tx.query('select public.get_posts_trends(null)');
        }),
      ).rejects.toThrow(/permission denied for function get_posts_trends/);
    },
  );
});
