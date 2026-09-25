/**
 * 잠금(20260524120000) 뒤의 마이그레이션이 만드는 함수는 같은 파일에서 PUBLIC 실행 권한을 명시적으로 걷는다.
 * Postgres는 새 함수에 PUBLIC EXECUTE를 기본으로 주고, 이를 전역 기본값으로 막으면 확장이 만드는 함수까지 잠긴다 —
 * 그래서 DB 설정 대신 작성 시점에 잡는다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const MIGRATIONS_DIR = join(REPO_ROOT, 'apps/blog/web/supabase/migrations');
const LOCKDOWN = '20260524120000';

const CREATE_FUNCTION =
  /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?\s*\(/gi;

/** `sql`이 만드는 함수 중 PUBLIC에서 실행 권한을 걷지 않은 이름. */
export function functionsMissingPublicRevoke(sql: string): string[] {
  const names = new Set([...sql.matchAll(CREATE_FUNCTION)].map(m => m[1]));
  return [...names].filter(
    name =>
      !new RegExp(
        `revoke\\s+(?:all|execute)[^;]*\\bon\\s+function\\s+(?:public\\.)?"?${name}"?\\b[^;]*\\bfrom\\s+[^;]*\\bpublic\\b`,
        'i',
      ).test(sql),
  );
}

const newerMigrations = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql') && f.slice(0, LOCKDOWN.length) > LOCKDOWN)
  .sort();

test.each(newerMigrations)('%s: 새 함수는 PUBLIC 실행 권한을 걷는다', file => {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  expect(functionsMissingPublicRevoke(sql)).toStrictEqual([]);
});

test('검사기는 REVOKE 없는 함수를 잡고, 있는 함수는 통과시킨다', () => {
  expect(
    functionsMissingPublicRevoke(`
      create or replace function public.leaky(x text) returns void as $$ $$;
      create function public.safe() returns void as $$ $$;
      revoke all on function public.safe() from public, anon;
    `),
  ).toStrictEqual(['leaky']);
});
