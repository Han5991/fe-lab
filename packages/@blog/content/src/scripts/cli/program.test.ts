/**
 * CLI 표면의 계약 테스트.
 *
 * 서브커맨드 이름은 앱 package.json의 스크립트가 문자열로 부르는 값이라, 여기서
 * 이름이 바뀌면 앱이 조용히 깨진다(`blog-content build` 같은 문자열은 tsc가 못
 * 본다). 단계 모듈이 실제로 `main`을 내놓는지는 반대로 tsc가 본다 — 동적
 * import여도 모듈 타입은 정적으로 해석되기 때문에 여기서 다시 확인하지 않는다.
 */
import { expect, test } from 'vitest';
import { buildProgram } from './program.ts';

const names = () => buildProgram().commands.map(c => c.name());

test('서브커맨드 목록 — 앱 스크립트와 build 파이프라인이 부르는 이름', () => {
  expect([...names()].sort()).toStrictEqual([
    'build',
    'check-seo',
    'llms',
    'llms-full',
    'new-post',
    'og-images',
    'rss',
    'search-index',
    'sitemap',
    'sync-posts',
    'thumbnails',
    'validate',
  ]);
});

test('이름은 소문자·하이픈만 쓴다 (셸에서 그대로 치는 이름)', () => {
  for (const name of names()) expect(name, name).toMatch(/^[a-z][a-z0-9-]*$/);
});

test('build는 파이프라인 플래그 3개를 받는다', () => {
  const build = buildProgram().commands.find(c => c.name() === 'build');
  const flags = build?.options.map(o => o.long) ?? [];
  expect(flags).toContain('--strict');
  expect(flags).toContain('--skip-validate');
  expect(flags).toContain('--force');
});

test('new-post의 --status는 세 값만 받는다', () => {
  const cmd = buildProgram().commands.find(c => c.name() === 'new-post');
  const status = cmd?.options.find(o => o.long === '--status');
  expect(status?.argChoices).toStrictEqual(['draft', 'published', 'scheduled']);
});

test('알 수 없는 옵션은 조용히 무시되지 않는다', () => {
  const program = buildProgram()
    .exitOverride()
    // 규칙 위반 출력은 테스트 로그를 어지럽히므로 삼킨다.
    .configureOutput({ writeErr: () => undefined, writeOut: () => undefined });
  expect(() =>
    program.parse(['node', 'blog-content', 'validate', '--stric']),
  ).toThrow();
});
