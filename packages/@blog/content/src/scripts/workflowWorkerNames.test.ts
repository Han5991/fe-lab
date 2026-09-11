/**
 * 프리뷰 워크플로의 `matrix.worker`가 각 앱 `wrangler.jsonc`의 `name`과 같은지
 * 검사합니다.
 *
 * ## 왜 두 곳에 있나
 * 워크플로는 Worker 이름을 **빌드 전에** 알아야 합니다 — 프리뷰 주소가
 * `<alias>-<워커 이름>.<서브도메인>.workers.dev`라, alias를 몇 자로 자를지가
 * 그 이름 길이에 달려 있기 때문입니다(DNS 레이블 63자를 둘이 나눠 씁니다).
 * 그런데 정본은 `wrangler.jsonc`이고, 그 파일은 JSONC라 워크플로 셸에서
 * 안전하게 파싱하기 어렵습니다. 그래서 매트릭스에 적어 두고 **어긋남은 이
 * 테스트가 잠급니다.**
 *
 * ## 어긋나면 어떻게 되나
 * `wrangler.jsonc`의 `name`만 길어지고 매트릭스가 그대로면 예산이 실제보다 크게
 * 계산돼 호스트 레이블이 63자를 넘습니다. 그러면 **그 앱의 프리뷰만** 조용히
 * 실패합니다 — 다른 앱은 멀쩡하므로 체크 목록만 봐서는 원인이 안 보입니다.
 * 이 워크플로가 매트릭스가 되기 전에 `cut -c1-63`으로 통일해 자르고 있던 것이
 * 정확히 같은 함정이었습니다(`blog`는 58자가 예산인데 63으로 잘랐다).
 *
 * 옆의 `workflowPromptSize.test.ts`와 같은 이유로 여기 있습니다 — 패키지
 * **소스**는 사이트를 모르지만 패키지 **테스트**는 저장소 루트 위에서 돕니다.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const WORKFLOW = join(REPO_ROOT, '.github/workflows/preview-blog.yml');

/** 호스트 레이블(`<alias>-<워커>`)의 상한. DNS 레이블 한계다. */
const LABEL_LIMIT = 63;

/**
 * 매트릭스의 `- app: x` … `worker: y` 짝을 뽑습니다.
 *
 * YAML 파서를 들이지 않는 이유는 이 저장소에 의존성이 없어서입니다. 두 키는
 * 같은 항목 안에서 `app`이 먼저 오므로, `app`부터 다음 `app`까지를 한 항목으로
 * 봅니다.
 */
const matrixEntries = (yaml: string): { app: string; worker: string }[] => {
  const blocks = yaml.split(/^\s*- app:\s*/m).slice(1);
  return blocks.map(block => {
    const app = block.split('\n', 1)[0]?.trim() ?? '';
    const worker = /^\s*worker:\s*(\S+)\s*$/m.exec(block)?.[1] ?? '';
    return { app, worker };
  });
};

/** JSONC에서 최상위 `"name"` 값만 뽑습니다(주석을 지우지 않아도 됩니다). */
const workerName = (jsonc: string): string =>
  /^\s*"name":\s*"([^"]+)"/m.exec(jsonc)?.[1] ?? '';

describe('프리뷰 워크플로의 Worker 이름', () => {
  test('매트릭스에 앱이 하나 이상 있다', async () => {
    const entries = matrixEntries(await readFile(WORKFLOW, 'utf8'));
    // 파싱이 조용히 빈 배열을 내면 아래 검사들이 전부 통과해 버린다.
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(e => e.app && e.worker)).toBe(true);
  });

  test('매트릭스의 worker가 wrangler.jsonc의 name과 같다', async () => {
    const entries = matrixEntries(await readFile(WORKFLOW, 'utf8'));
    const actual = await Promise.all(
      entries.map(async ({ app, worker }) => {
        const jsonc = await readFile(
          join(REPO_ROOT, 'apps/blog', app, 'wrangler.jsonc'),
          'utf8',
        );
        return { app, worker, name: workerName(jsonc) };
      }),
    );
    // 어느 앱이 어긋났는지 실패 메시지에 그대로 나오도록 배열째 비교한다.
    expect(actual.map(({ app, name }) => ({ app, worker: name }))).toEqual(
      entries,
    );
  });

  test('alias 예산을 워커 이름에서 빼므로 호스트 레이블이 한계 안에 있다', async () => {
    const yaml = await readFile(WORKFLOW, 'utf8');
    // 예전처럼 상수로 자르면 이름이 긴 워커에서만 레이블이 넘친다.
    expect(yaml).not.toMatch(/cut -c1-63\b/);
    expect(yaml).toContain(`budget=$(( ${LABEL_LIMIT} - \${#WORKER} - 1 ))`);

    for (const { worker } of matrixEntries(yaml)) {
      const budget = LABEL_LIMIT - worker.length - 1;
      expect(budget).toBeGreaterThan(0);
      // 예산을 꽉 채운 alias여도 `<alias>-<워커>`가 한계를 넘지 않아야 한다.
      expect(budget + 1 + worker.length).toBeLessThanOrEqual(LABEL_LIMIT);
    }
  });
});
