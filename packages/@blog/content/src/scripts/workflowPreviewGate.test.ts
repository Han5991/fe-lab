/**
 * 프리뷰 워크플로의 **경로 판정**이 뒤 스텝을 전부 막고 있는지 검사합니다.
 *
 * ## 왜 스텝마다 조건이 붙어 있나
 * `preview-blog.yml`은 매트릭스의 줄마다 첫 스텝(`changes`)에서 그 앱이 읽는 경로가
 * PR에서 바뀌었는지 보고, 아니면 뒤 스텝을 건너뜁니다. 잡 단위 `if`에서는 `matrix`
 * 컨텍스트를 쓸 수 없어 매트릭스의 한 줄만 끌 수 없으므로, 같은 조건을 스텝마다
 * 답니다.
 *
 * ## 어긋나면 어떻게 되나
 * 스텝을 새로 더하면서 조건을 빠뜨리면, 건너뛴 줄에서 그 스텝만 체크아웃·설치
 * 없이 돌다 실패합니다. 그 앱을 건드리지도 않은 PR에 빨간 체크가 뜨고, 원인은
 * 워크플로 파일을 열어 봐야 보입니다. 워크플로 머리 주석이 이 규칙을 적어 두었지만
 * 주석은 막지 못하므로 여기서 잠급니다.
 *
 * 옆의 `workflowWorkerNames.test.ts`와 같은 이유로 여기 있습니다 — 패키지
 * **소스**는 사이트를 모르지만 패키지 **테스트**는 저장소 루트 위에서 돕니다.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const WORKFLOW = join(REPO_ROOT, '.github/workflows/preview-blog.yml');

/** 판정 스텝이 내는 출력 — 뒤 스텝의 `if`는 전부 이것으로 시작해야 합니다. */
const GATE = "steps.changes.outputs.run == 'true'";

/**
 * `steps:` 아래를 스텝 단위로 자릅니다. 각 조각의 첫 줄이 스텝 이름입니다.
 *
 * YAML 파서를 들이지 않는 이유는 `workflowWorkerNames.test.ts`와 같습니다. 이
 * 잡의 스텝은 들여쓰기 6칸의 `- name:`으로 시작합니다.
 */
const stepBlocks = (yaml: string): string[] => {
  const start = yaml.indexOf('\n    steps:\n');
  if (start === -1) return [];
  return yaml
    .slice(start)
    .split(/^ {6}- name: /m)
    .slice(1);
};

const hasGate = (block: string): boolean =>
  block.split('\n').some(line => line.trim().startsWith(`if: ${GATE}`));

describe('프리뷰 워크플로의 경로 판정', () => {
  test('첫 스텝이 변경 경로를 판정한다', async () => {
    const blocks = stepBlocks(await readFile(WORKFLOW, 'utf8'));
    expect(blocks[0] ?? '').toMatch(/^\s+id: changes\s*$/m);
  });

  test('뒤 스텝이 전부 판정 결과를 먼저 본다', async () => {
    const blocks = stepBlocks(await readFile(WORKFLOW, 'utf8'));
    // 자르기가 조용히 빈 배열을 내면 아래 검사가 아무것도 보지 않고 통과한다.
    expect(blocks.length).toBeGreaterThan(1);
    const ungated = blocks
      .slice(1)
      .filter(block => !hasGate(block))
      .map(block => block.split('\n', 1)[0]);
    // 어느 스텝이 빠졌는지 실패 메시지에 이름이 그대로 나오도록 배열째 비교한다.
    expect(ungated).toEqual([]);
  });

  test('워크플로 파일 자체가 트리거 경로에 들어 있다', async () => {
    const yaml = await readFile(WORKFLOW, 'utf8');
    const on = yaml.slice(
      yaml.indexOf('\non:\n'),
      yaml.indexOf('\nconcurrency:'),
    );
    // 빠지면 워크플로만 고친 PR이 자기 변경을 한 번도 돌려 보지 않고 머지된다.
    expect(on).toContain('.github/workflows/preview-blog.yml');
  });
});
