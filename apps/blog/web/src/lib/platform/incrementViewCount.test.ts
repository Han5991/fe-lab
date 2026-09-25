/**
 * increment_view_count는 형식 밖 slug를 에러 없이 버린다(fail-soft) — 검증이 틀려도 다른 신호가 없어서,
 * 마이그레이션 전체를 PGlite(WASM Postgres)에 실제로 적용하고 anon으로 불러 쌓인 행을 센다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { MAX_SLUG_LENGTH } from './adminActions';

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

interface Recorded {
  views: number;
  logs: number;
}

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
}, 60_000);

afterAll(() => db.close());

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
  return { views: after.views - before.views, logs: after.logs - before.logs };
}

test.each([
  ['영문 slug', 'javascript-error'],
  ['점이 든 slug', 'vue-3.0'],
  ['한글·공백·괄호가 든 경로 slug', 'react/component/에러 경계 (1편)'],
  ['공백 문자가 섞였을 뿐인 slug', 'a b'],
  ['상한 길이', '가'.repeat(MAX_SLUG_LENGTH)],
])('%s는 집계한다', async (_, slug) => {
  expect(await recordView(slug)).toStrictEqual({ views: 1, logs: 1 });
});

test.each([
  ['NULL', null],
  ['빈 문자열', ''],
  ['ASCII 공백뿐', '   '],
  ['NBSP뿐', ' '],
  ['전각 공백뿐', '　'],
  ['제로폭 공백뿐', '​'],
  ['BOM뿐', '﻿'],
  ['유니코드 공백 섞음', '  　 '],
  ['상한 초과', '가'.repeat(MAX_SLUG_LENGTH + 1)],
  ['줄바꿈 포함', 'a\nb'],
  ['제어 문자 포함', 'a\u0001b'],
])('%s는 버린다', async (_, slug) => {
  expect(await recordView(slug)).toStrictEqual({ views: 0, logs: 0 });
});

test('anon 등 명시한 역할 밖(PUBLIC)은 실행할 수 없다', async () => {
  await db.exec('create role stranger nologin');

  await expect(
    db.transaction(async tx => {
      await tx.exec('set local role stranger');
      await tx.query('select public.increment_view_count($1)', ['x']);
    }),
  ).rejects.toThrow(/permission denied for function increment_view_count/);
});
