/**
 * adminActions — Edge Function과 클라이언트가 공유하는 action 계약 테스트
 */

import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  ADMIN_ACTION_RPCS,
  isPostTrendRows,
  MAX_FILTER_SLUGS,
  MAX_SLUG_LENGTH,
  isAdminAction,
  isSlugList,
  parseAdminRequest,
} from './adminActions';

test('isAdminAction: 등록된 action만 통과한다', () => {
  for (const action of Object.keys(ADMIN_ACTION_RPCS)) {
    expect(isAdminAction(action), `${action}은 등록된 action`).toBeTruthy();
  }
  expect(
    isAdminAction('get_all_post_stats'),
    'RPC 이름은 action이 아니다',
  ).toBe(false);
  expect(isAdminAction('')).toBe(false);
  expect(isAdminAction(undefined)).toBe(false);
  expect(isAdminAction(null)).toBe(false);
  expect(isAdminAction(42)).toBe(false);
  expect(isAdminAction({ action: 'posts_overview' })).toBe(false);
  // 통계·추이를 따로 부르던 옛 action 이름은 더는 등록돼 있지 않다.
  expect(isAdminAction('all_post_stats')).toBe(false);
  expect(isAdminAction('all_posts_trends')).toBe(false);
});

test('isAdminAction: 프로토타입 키(toString 등)는 거른다', () => {
  // `in` 연산자로 짰다면 'toString' in {} === true라 뚫린다. Object.hasOwn이어야 한다.
  expect(isAdminAction('toString')).toBe(false);
  expect(isAdminAction('constructor')).toBe(false);
  expect(isAdminAction('__proto__')).toBe(false);
});

test('adminActions.ts에는 import가 없다 (Deno Edge Function이 그대로 읽는다)', () => {
  // 이 파일은 supabase/functions 밖에 있지만 Edge Function이 상대 경로로 import
  // 하고, 번들러가 import 그래프를 따라 집어 간다. Deno는 확장자 없는 상대
  // import를 해석하지 못하므로 여기에 import가 생기면 **배포/서빙 시점에야**
  // 깨진다 — tsc(bundler resolution)도 eslint(supabase/** ignore)도 못 잡는다.
  //
  // 그래서 타입이 아니라 소스 텍스트로 잠근다. 타입 전용 import도 막는 이유:
  // 확장자를 빼먹기 쉬운 건 마찬가지고, 이 파일은 상수 표 하나라 필요가 없다.
  const source = readFileSync(
    new URL('./adminActions.ts', import.meta.url),
    'utf8',
  );
  // 주석 안의 'import'라는 낱말(설명문)까지 잡지 않도록 주석을 먼저 걷어낸다.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

  expect(code, 'import 문이 없어야 한다').not.toMatch(/^\s*import\s/m);
  expect(code, "from '…' 절이 없어야 한다").not.toMatch(/\bfrom\s+['"]/);
  expect(code, 'require()가 없어야 한다').not.toMatch(/\brequire\s*\(/);
});

test('ADMIN_ACTION_RPCS: 모든 action이 서로 다른 get_* RPC에 대응한다', () => {
  const rpcs = Object.values(ADMIN_ACTION_RPCS).flat();
  expect(new Set(rpcs).size, 'RPC 이름 중복 없음').toBe(rpcs.length);
  for (const rpc of rpcs) {
    expect(rpc, `${rpc}: admin 대리 호출은 읽기 전용 RPC만`).toMatch(/^get_/);
  }
});

test('isSlugList: 거를 slug 목록으로 쓸 수 있는 문자열 배열만 통과한다', () => {
  expect(isSlugList([])).toBe(true);
  expect(isSlugList(['a', 'series/b', '공백 있는 글'])).toBe(true);
  expect(isSlugList(['x'.repeat(MAX_SLUG_LENGTH)])).toBe(true);

  // JSON에서 온 값이다 — 모양이 어긋나면 필터 없이 진행하지 말고 거절해야 한다.
  expect(isSlugList(undefined)).toBe(false);
  expect(isSlugList('a')).toBe(false);
  expect(isSlugList({ 0: 'a', length: 1 })).toBe(false);
  expect(isSlugList(['a', 1])).toBe(false);
  expect(isSlugList([''])).toBe(false);
  expect(isSlugList(['x'.repeat(MAX_SLUG_LENGTH + 1)])).toBe(false);
  expect(
    isSlugList(Array.from({ length: MAX_FILTER_SLUGS + 1 }, (_, i) => `p${i}`)),
  ).toBe(false);
});

test('parseAdminRequest: 등록되지 않은 action·객체가 아닌 body는 거절한다', () => {
  for (const body of [
    null,
    'posts_overview',
    {},
    { action: 'get_all_post_stats' },
    { action: 'toString' },
  ]) {
    const parsed = parseAdminRequest(body);
    expect(parsed.ok, JSON.stringify(body)).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/^알 수 없는 action/);
  }
});

test('parseAdminRequest: posts_overview는 slugs가 없으면 필터 없이, 있으면 검증해 싣는다', () => {
  expect(parseAdminRequest({ action: 'posts_overview' })).toEqual({
    ok: true,
    request: { action: 'posts_overview' },
  });
  // params가 객체가 아니면 slugs가 없는 것과 같다.
  expect(parseAdminRequest({ action: 'posts_overview', params: null })).toEqual(
    { ok: true, request: { action: 'posts_overview' } },
  );
  expect(
    parseAdminRequest({
      action: 'posts_overview',
      params: { slugs: ['a', 'b'] },
    }),
  ).toEqual({
    ok: true,
    request: { action: 'posts_overview', params: { slugs: ['a', 'b'] } },
  });

  // 모양이 어긋난 필터로 거르지 않은 채 진행하지 않는다.
  const bad = parseAdminRequest({
    action: 'posts_overview',
    params: { slugs: 'a' },
  });
  expect(bad.ok).toBe(false);
  if (!bad.ok) expect(bad.error).toMatch(/slugs 파라미터/);
});

test('parseAdminRequest: slug action은 비어 있지 않은 문자열 slug가 있어야 한다', () => {
  expect(
    parseAdminRequest({
      action: 'post_hourly_distribution',
      params: { slug: 'a' },
    }),
  ).toEqual({
    ok: true,
    request: { action: 'post_hourly_distribution', params: { slug: 'a' } },
  });
  for (const params of [undefined, {}, { slug: '' }, { slug: 1 }]) {
    const parsed = parseAdminRequest({
      action: 'post_dow_distribution',
      params,
    });
    expect(parsed.ok, JSON.stringify(params)).toBe(false);
    if (!parsed.ok) expect(parsed.error).toBe('slug 파라미터가 필요합니다.');
  }
});

test('isPostTrendRows: 열 셋의 값 타입까지 맞는 행 배열만 통과한다', () => {
  const row = { slug: 'a', view_date: '2026-05-01', view_count: 3 };
  expect(isPostTrendRows([])).toBe(true);
  expect(isPostTrendRows([row, { ...row, slug: 'b' }])).toBe(true);

  // get_posts_trends는 Json을 돌려준다 — 배열이 아니거나 행이 어긋나면 받지 않는다.
  expect(isPostTrendRows(null)).toBe(false);
  expect(isPostTrendRows({ rows: [row] })).toBe(false);
  expect(isPostTrendRows([null])).toBe(false);
  expect(isPostTrendRows(['a'])).toBe(false);
  expect(isPostTrendRows([{ slug: 'a', view_count: 3 }])).toBe(false);
  expect(isPostTrendRows([{ ...row, view_count: '3' }])).toBe(false);
  expect(isPostTrendRows([{ ...row, view_date: 20260501 }])).toBe(false);
  expect(isPostTrendRows([{ ...row, slug: null }])).toBe(false);
  expect(isPostTrendRows([row, { slug: 'b' }])).toBe(false);
});
