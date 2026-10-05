import type {
  BundleBudget,
  BundleBudgetsConfig,
} from '../shared/contentConfig.ts';
import {
  pageGroup,
  type AssetMeasurement,
  type PageMeasurement,
} from './measure-bundle.ts';

/**
 * 번들 예산 평가기 — `check-bundle`이 누수 규칙과 함께 돌린다.
 *
 * 측정은 `measure-bundle`의 것을 그대로 받는다(`measurePages` — 문서가 직접
 * 가리키는 JS·CSS의 gzip). 수집기가 둘이면 "잰 숫자"와 "막는 숫자"가 갈라진다.
 *
 * 판정은 다섯이다:
 * - **`over-budget`**: 그룹의 어느 페이지든 JS 또는 CSS가 상한을 넘으면 실패.
 *   최대로 본다 — 중앙값이면 가장 무거운 글이 예산 밖으로 숨는다.
 * - **`budget-slack`**: 그룹의 최대가 상한의 `SLACK_FLOOR`(80%) 아래면 실패 — 상한만
 *   보면 아무것도 재지 못하는 수집기(Next가 태그 모양을 바꿔 청크를 못 찾는 날)도, 무게가
 *   준 뒤 그대로 둔 예산도 조용히 통과한다. 둘 다 그 사이에 회귀가 숨는 자리다.
 * - **`budget-dead`**: 예산의 그룹에 페이지가 0개면 실패 — 라우트가 사라지거나
 *   이름이 바뀐 뒤에도 남은 예산은 아무것도 지키지 않는다(`bundleGuards`의
 *   `marker-dead`와 같은 양성 대조).
 * - **`unbudgeted-group`**: 산출물에 있는 그룹에 예산이 없으면 실패 — 새 라우트가
 *   재지 않은 채 들어오지 못한다.
 * - **`asset-missing`**: 참조한 자산이 `out/`에 없으면 실패 — 0으로 세면 "가벼워졌다"로
 *   보여 예산을 조용히 통과한다.
 *
 * HTML은 예산이 없다(원고와 함께 자란다). 표에는 찍는다.
 */

export type BudgetRule =
  | 'over-budget'
  | 'budget-slack'
  | 'budget-dead'
  | 'unbudgeted-group'
  | 'asset-missing';

export interface BudgetViolation {
  rule: BudgetRule;
  group: string;
  /** 사람이 읽는 보고 — 여러 줄일 수 있다(상위 파일 목록) */
  message: string;
}

/** 그룹 하나의 측정 요약 — 통과해도 표로 찍는다. */
export interface BudgetGroupRow {
  group: string;
  pages: number;
  /** 예산이 없으면 undefined (`unbudgeted-group`) */
  budget: BundleBudget | undefined;
  maxJsGzip: number;
  maxCssGzip: number;
  maxHtmlGzip: number;
}

export interface BudgetReport {
  rows: BudgetGroupRow[];
  violations: BudgetViolation[];
}

/** 초과 보고에 붙이는 상위 파일 수 */
const TOP_FILES = 5;
/** 참조가 끊긴 자산을 페이지마다 몇 개까지 적을지 */
const MAX_MISSING_LISTED = 5;
/**
 * 그룹 최대가 상한의 이 비율 아래면 예산이 느슨하다(`budget-slack`). 예산은 측정 최대
 * ×1.05로 잡으니, 무게가 ~16% 넘게 줄면 걸린다 — 그 PR에서 예산도 함께 내린다.
 */
export const SLACK_FLOOR = 0.8;

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

interface Metric {
  label: string;
  kind: AssetMeasurement['kind'];
  measured: (page: PageMeasurement) => number;
  limitKB: (budget: BundleBudget) => number;
}

const METRICS: readonly Metric[] = [
  {
    label: 'JS',
    kind: 'js',
    measured: page => page.jsGzip,
    limitKB: budget => budget.jsGzipKB,
  },
  {
    label: 'CSS',
    kind: 'css',
    measured: page => page.cssGzip,
    limitKB: budget => budget.cssGzipKB,
  },
];

/** 그 지표에서 가장 무거운 파일들 — 예산을 넘긴 원인 후보. */
function topFiles(page: PageMeasurement, kind: Metric['kind']): string[] {
  return page.assets
    .filter(asset => asset.kind === kind)
    .sort((a, b) => b.gzip - a.gzip)
    .slice(0, TOP_FILES)
    .map(asset => `${kb(asset.gzip).padStart(9)}  ${asset.path}`);
}

/** 그룹 하나의 지표 하나 — 넘친 페이지가 있으면 가장 무거운 페이지로 보고한다. */
function overBudget(
  group: string,
  pages: readonly PageMeasurement[],
  budget: BundleBudget,
  metric: Metric,
): BudgetViolation | undefined {
  const limit = metric.limitKB(budget) * 1024;
  const over = pages
    .filter(page => metric.measured(page) > limit)
    .sort((a, b) => metric.measured(b) - metric.measured(a));
  const worst = over[0];
  if (worst === undefined) return undefined;
  const measured = metric.measured(worst);
  const others =
    over.length > 1
      ? ` — 같은 그룹 ${String(over.length - 1)}개 페이지도 초과`
      : '';
  return {
    rule: 'over-budget',
    group,
    message:
      `[${group}] ${worst.path} 첫 로드 ${metric.label} ${kb(measured)} > 예산 ${String(metric.limitKB(budget))} KB ` +
      `(+${kb(measured - limit)})${others}\n` +
      `    큰 ${metric.label} 파일:\n` +
      topFiles(worst, metric.kind)
        .map(line => `    ${line}`)
        .join('\n'),
  };
}

/** 그룹 하나의 지표 하나 — 최대가 상한보다 한참 아래면 예산이 아무것도 막지 못한다. */
function slackBudget(
  group: string,
  pages: readonly PageMeasurement[],
  budget: BundleBudget,
  metric: Metric,
): BudgetViolation | undefined {
  const limitKB = metric.limitKB(budget);
  const max = Math.max(...pages.map(page => metric.measured(page)));
  if (max >= limitKB * 1024 * SLACK_FLOOR) return undefined;
  const ratio = Math.round((max / (limitKB * 1024)) * 100);
  return {
    rule: 'budget-slack',
    group,
    message:
      `[${group}] 첫 로드 ${metric.label} 최대 ${kb(max)}가 예산 ${String(limitKB)} KB의 ${String(ratio)}%입니다 ` +
      `(하한 ${String(SLACK_FLOOR * 100)}%) — 무게가 줄었으면 예산을 측정 최대 ×1.05로 내리고, ` +
      `0에 가깝다면 수집기가 태그를 놓친 것입니다(measure-bundle로 확인).`,
  };
}

/** 측정값을 예산에 대 본다. 표의 행과 위반을 함께 돌려준다. */
export function checkBudgets(
  budgets: BundleBudgetsConfig,
  pages: readonly PageMeasurement[],
): BudgetReport {
  const byGroup = new Map<string, PageMeasurement[]>();
  for (const page of pages) {
    const group = pageGroup(page.path);
    const bucket = byGroup.get(group);
    if (bucket === undefined) byGroup.set(group, [page]);
    else bucket.push(page);
  }
  const budgetOf = new Map(budgets.map(budget => [budget.group, budget]));

  const rows: BudgetGroupRow[] = [];
  const violations: BudgetViolation[] = [];
  for (const [group, bucket] of [...byGroup].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const budget = budgetOf.get(group);
    const row: BudgetGroupRow = {
      group,
      pages: bucket.length,
      budget,
      maxJsGzip: Math.max(...bucket.map(page => page.jsGzip)),
      maxCssGzip: Math.max(...bucket.map(page => page.cssGzip)),
      maxHtmlGzip: Math.max(...bucket.map(page => page.htmlGzip)),
    };
    rows.push(row);

    for (const page of bucket) {
      if (page.missing.length === 0) continue;
      const listed = page.missing.slice(0, MAX_MISSING_LISTED).join(', ');
      const more =
        page.missing.length > MAX_MISSING_LISTED
          ? ` 외 ${String(page.missing.length - MAX_MISSING_LISTED)}개`
          : '';
      violations.push({
        rule: 'asset-missing',
        group,
        message: `[${group}] ${page.path}가 참조한 자산이 산출물에 없습니다: ${listed}${more} — 이 페이지의 측정값은 믿을 수 없습니다.`,
      });
    }

    if (budget === undefined) {
      const example = bucket[0]?.path ?? group;
      violations.push({
        rule: 'unbudgeted-group',
        group,
        message:
          `그룹 ${group}(페이지 ${String(bucket.length)}개, 예: ${example})에 예산이 없습니다 — ` +
          `측정 최대 JS ${kb(row.maxJsGzip)} / CSS ${kb(row.maxCssGzip)}. 선언(bundleBudgets)에 이 그룹을 추가하세요.`,
      });
      continue;
    }
    for (const metric of METRICS) {
      const violation =
        overBudget(group, bucket, budget, metric) ??
        slackBudget(group, bucket, budget, metric);
      if (violation) violations.push(violation);
    }
  }

  for (const budget of budgets) {
    if (byGroup.has(budget.group)) continue;
    violations.push({
      rule: 'budget-dead',
      group: budget.group,
      message: `예산 그룹 ${budget.group}에 페이지가 0개입니다 — 라우트가 사라졌거나 이름이 바뀌었으면 선언(bundleBudgets)을 함께 갱신하세요.`,
    });
  }

  return { rows, violations };
}

/** 예산 표 — 그룹마다 최대 측정값/상한. HTML은 예산 없이 측정값만. */
export function formatBudgetTable(rows: readonly BudgetGroupRow[]): string[] {
  const width = Math.max(4, ...rows.map(row => row.group.length));
  const cell = (bytes: number, limitKB: number | undefined): string =>
    `${kb(bytes)} / ${limitKB === undefined ? '—' : `${String(limitKB)} KB`}`.padStart(
      20,
    );
  // 머리글의 한글은 터미널에서 두 칸이라 공백을 손으로 맞춘다.
  const lines = [
    `그룹${' '.repeat(width - 4)} 페이지        JS 최대 / 예산       CSS 최대 / 예산   HTML 최대`,
  ];
  for (const row of rows) {
    lines.push(
      `${row.group.padEnd(width)} ${String(row.pages).padStart(6)} ` +
        `${cell(row.maxJsGzip, row.budget?.jsGzipKB)} ${cell(row.maxCssGzip, row.budget?.cssGzipKB)} ` +
        `${kb(row.maxHtmlGzip).padStart(11)}`,
    );
  }
  return lines;
}
