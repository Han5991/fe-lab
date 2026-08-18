/**
 * CLI 표면의 계약 테스트.
 *
 * 서브커맨드 이름은 앱 package.json의 스크립트가 문자열로 부르는 값이라, 여기서
 * 이름이 바뀌면 앱이 조용히 깨진다(`blog-content build` 같은 문자열은 tsc가 못
 * 본다). 단계 모듈이 실제로 `main`을 내놓는지는 반대로 tsc가 본다 — 동적
 * import여도 모듈 타입은 정적으로 해석되기 때문에 여기서 다시 확인하지 않는다.
 */
import { expect, test } from 'vitest';
import type { Command } from 'commander';
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

/**
 * 출력을 삼키고 process.exit을 막은 program. 찍힌 stderr를 함께 돌려준다.
 *
 * exitOverride·configureOutput은 **커맨드마다** 따로 붙는다 — 부모에만 걸면
 * 서브커맨드가 자기 설정으로 stderr에 쓰고 process.exit까지 부른다.
 */
function silencedProgram(): { program: Command; stderr: () => string } {
  const program = buildProgram();
  const chunks: string[] = [];
  const silence = (cmd: Command) => {
    cmd.exitOverride().configureOutput({
      writeErr: (str: string) => {
        chunks.push(str);
      },
      writeOut: () => undefined,
    });
  };
  silence(program);
  program.commands.forEach(silence);
  return { program, stderr: () => chunks.join('') };
}

test('알 수 없는 옵션은 조용히 무시되지 않는다', () => {
  const { program } = silencedProgram();
  expect(() =>
    program.parse(['node', 'blog-content', 'validate', '--stric']),
  ).toThrow();
});

// ── new-post의 도메인 검증 에러 ──────────────────────────────────────────────
// 파싱은 commander가 하지만 "제목이 있어야 한다" 같은 규칙은 단계 모듈이 던진다.
// 액션이 그걸 잡지 않으면 진입점의 마지막 catch까지 올라가 **스택 트레이스**가
// 찍힌다 — 글쓴이가 볼 것은 스택이 아니라 무엇을 고칠지다.

test('new-post: 제목이 없으면 스택이 아니라 메시지로 알린다', async () => {
  const { program, stderr } = silencedProgram();
  await expect(
    program.parseAsync(['node', 'blog-content', 'new-post']),
  ).rejects.toThrow();
  expect(stderr()).toContain('글 제목이 필요합니다');
  expect(stderr()).not.toContain('at resolveOptions');
});

test('new-post: 공개 시각 없는 scheduled도 메시지로 알린다', async () => {
  const { program, stderr } = silencedProgram();
  await expect(
    program.parseAsync([
      'node',
      'blog-content',
      'new-post',
      '제목',
      '--status',
      'scheduled',
    ]),
  ).rejects.toThrow();
  expect(stderr()).toContain('--scheduled <ISO 날짜>가 필요합니다');
});
