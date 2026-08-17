/**
 * adminActions — Edge Function과 클라이언트가 공유하는 action 계약 테스트
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ADMIN_ACTION_RPC, isAdminAction } from './adminActions';

test('isAdminAction: 등록된 action만 통과한다', () => {
  for (const action of Object.keys(ADMIN_ACTION_RPC)) {
    assert.ok(isAdminAction(action), `${action}은 등록된 action`);
  }
  assert.equal(
    isAdminAction('get_all_post_stats'),
    false,
    'RPC 이름은 action이 아니다',
  );
  assert.equal(isAdminAction(''), false);
  assert.equal(isAdminAction(undefined), false);
  assert.equal(isAdminAction(null), false);
  assert.equal(isAdminAction(42), false);
  assert.equal(isAdminAction({ action: 'all_post_stats' }), false);
});

test('isAdminAction: 프로토타입 키(toString 등)는 거른다', () => {
  // `in` 연산자로 짰다면 'toString' in {} === true라 뚫린다. Object.hasOwn이어야 한다.
  assert.equal(isAdminAction('toString'), false);
  assert.equal(isAdminAction('constructor'), false);
  assert.equal(isAdminAction('__proto__'), false);
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

  assert.doesNotMatch(code, /^\s*import\s/m, 'import 문이 없어야 한다');
  assert.doesNotMatch(code, /\bfrom\s+['"]/, "from '…' 절이 없어야 한다");
  assert.doesNotMatch(code, /\brequire\s*\(/, 'require()가 없어야 한다');
});

test('ADMIN_ACTION_RPC: 모든 action이 서로 다른 get_* RPC에 대응한다', () => {
  const rpcs = Object.values(ADMIN_ACTION_RPC);
  assert.equal(new Set(rpcs).size, rpcs.length, 'RPC 이름 중복 없음');
  for (const rpc of rpcs) {
    assert.match(rpc, /^get_/, `${rpc}: admin 대리 호출은 읽기 전용 RPC만`);
  }
});
