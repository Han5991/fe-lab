/**
 * axe-core 검사 — WCAG 2.0/2.1 A·AA 규칙으로, 위반 0을 요구한다.
 *
 * 제외는 두지 않는다. 서드파티 DOM(Giscus iframe)은 봉인이 빈 문서로 갈음하므로
 * 위반이 나면 앱의 것이다 — 고친다. 정말 고칠 수 없는 것이 생기면 규칙이 아니라
 * 셀렉터 단위로 `exclude()`하고 그 자리에 사유를 적는다.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export interface AxeViolationSummary {
  rule: string;
  impact: string | null | undefined;
  targets: string[];
}

/** 위반을 사람이 읽을 요약으로 — 실패 메시지에 그대로 실린다. */
export async function axeViolations(
  page: Page,
): Promise<AxeViolationSummary[]> {
  // 통과·미적용 항목은 버린다 — 긴 글에서 결과 직렬화가 검사 시간의 상당 부분이다.
  // `options()`는 옵션 객체를 통째로 바꾸므로 `withTags()`(runOnly)보다 먼저 부른다 —
  // 순서가 뒤집히면 태그 제한이 사라져 best-practice 규칙까지 돈다.
  const { violations } = await new AxeBuilder({ page })
    .options({ resultTypes: ['violations'] })
    .withTags(WCAG_TAGS)
    .analyze();
  return violations.map(v => ({
    rule: v.id,
    impact: v.impact,
    targets: v.nodes.map(n => n.target.join(' ')),
  }));
}
