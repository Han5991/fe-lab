/**
 * 워크플로의 `prompt:` 블록이 **GitHub이 받아주는 크기** 안에 있는지 검사합니다.
 *
 * GitHub Actions는 워크플로 파일의 입력값이 일정 크기를 넘으면 **파일 자체를
 * 거부합니다.** 거부는 조용합니다 — 잡이 실패하는 게 아니라, 실행 기록의 이름이
 * 워크플로 `name:` 대신 파일 경로로 찍힌 빈 run 하나가 push 이벤트에 붙고 끝납니다.
 * PR 체크 목록에는 그 워크플로가 **아예 나타나지 않으므로**, 리뷰가 안 돌아도
 * 다른 체크가 초록이면 사람 눈에는 정상으로 보입니다.
 *
 * ## 경계는 21,000바이트다 (실측)
 * 2026-09-06에 `claude-code-review.yml`의 프롬프트에 세 줄을 더했다가 이 사고를
 * 냈습니다. 임시 브랜치에 이분 탐색으로 확인한 값입니다:
 *
 * | 프롬프트 크기 | 결과 |
 * | ------------: | :--- |
 * |    20,851 B   | 유효 |
 * |    20,865 B   | 유효 (사고 직전의 원본) |
 * |    21,088 B   | **거부** |
 * |    21,320 B   | **거부** |
 *
 * **문자 수가 아니라 바이트다.** 문제의 프롬프트는 1만 자 남짓인데 한글이 UTF-8에서
 * 3바이트씩 먹어 2만 바이트를 넘습니다. 글자 수만 보면 한계가 보이지 않습니다.
 *
 * 사고 당시 원본은 한계에서 **135바이트** 아래였습니다. 한 문장만 더해도 깨지는
 * 상태였는데 아무도 몰랐고, 알 방법도 없었습니다. 그래서 이 검사가 있습니다.
 *
 * ## 왜 이 테스트가 여기 있나
 * 옆의 `docPaths.test.ts`와 같은 이유입니다 — 패키지 **소스**는 사이트를 모르지만
 * 패키지 **테스트**는 저장소 루트 위에서 돕니다. 워크플로를 검사하는 node 환경
 * 테스트가 이 저장소에 여기밖에 없습니다.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const WORKFLOW_DIR = join(REPO_ROOT, '.github/workflows');

/** GitHub이 워크플로 파일을 거부하기 시작하는 지점(실측). */
const HARD_LIMIT_BYTES = 21_000;

/**
 * 실제로 지키는 상한. 한계에 붙여 두면 다음 사람이 한 문장만 더해도 깨지므로
 * 여유를 둡니다. 이 값을 올려서 테스트를 통과시키지 말고 **프롬프트를 줄이세요** —
 * 한계는 우리가 정하는 게 아닙니다.
 */
const BUDGET_BYTES = 20_500;

/**
 * `prompt: |` 블록 스칼라의 내용을 들여쓰기로 잘라냅니다.
 *
 * YAML 파서를 쓰지 않는 이유는 이 패키지에 파서 의존성이 없어서입니다. 블록
 * 스칼라는 "여는 줄보다 더 들여쓴 줄이 전부 내용"이라는 규칙 하나로 끝나므로
 * 이 검사에는 충분합니다.
 */
function promptBlocks(source: string): { line: number; body: string }[] {
  const lines = source.split('\n');
  const blocks: { line: number; body: string }[] = [];

  lines.forEach((line, index) => {
    const opener = /^(\s*)prompt:\s*[|>][-+]?\s*$/.exec(line);
    if (!opener) return;

    const indent = (opener[1] ?? '').length;
    const body: string[] = [];

    for (let i = index + 1; i < lines.length; i += 1) {
      const next = lines[i] ?? '';
      if (next.trim() === '') {
        body.push('');
        continue;
      }
      if (next.length - next.trimStart().length <= indent) break;
      body.push(next.slice(indent + 2));
    }

    blocks.push({ line: index + 1, body: body.join('\n') });
  });

  return blocks;
}

const workflowFiles = (await readdir(WORKFLOW_DIR))
  .filter(name => /\.ya?ml$/.test(name))
  .sort();

describe('워크플로 prompt 크기', () => {
  test('검사할 워크플로가 실제로 있다', () => {
    // 글롭이 조용히 0개를 잡으면 검사가 통과하는 것처럼 보입니다.
    expect(workflowFiles.length).toBeGreaterThan(0);
  });

  test.each(workflowFiles)('%s의 prompt가 예산 안에 있다', async name => {
    const source = await readFile(join(WORKFLOW_DIR, name), 'utf8');
    const oversized = promptBlocks(source)
      .map(block => ({
        ...block,
        bytes: Buffer.byteLength(block.body, 'utf8'),
      }))
      .filter(block => block.bytes > BUDGET_BYTES)
      .map(
        block =>
          `${name}:${block.line} — ${block.bytes}B (예산 ${BUDGET_BYTES}B, GitHub 한계 ${HARD_LIMIT_BYTES}B)`,
      );

    // 실패 메시지에 초과분이 그대로 나오도록 배열째 비교합니다.
    expect(oversized).toEqual([]);
  });
});
