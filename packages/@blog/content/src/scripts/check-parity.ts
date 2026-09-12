import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ParityConfig } from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';
import { collectPages } from './check-seo.ts';

/**
 * **같은 사이트를 두 번 지었을 때 두 산출물을 대조합니다.**
 *
 * `check-seo`가 한 산출물의 SEO 계약을 보고 `check-bundle`이 청크의 누수를
 * 본다면, 이쪽은 "두 산출물이 같은 화면인가"를 봅니다. 셋 다 HTML만 읽고
 * 브라우저를 쓰지 않으므로 CI에서 같은 무게로 돕니다.
 *
 * ## 왜 필요했나
 *
 * 이 저장소가 블로그를 SvelteKit으로 한 번 더 지으면서, **게이트가 전부 초록인
 * 채로 여섯 페이지가 자리만 잡은 화면**인 상태가 열두 번의 PR 동안 통과했다.
 * `check-seo`는 h1 개수를 세고 `check-bundle`은 마커를 센다 — 둘 다 "이 페이지에
 * 내용이 있는가"를 묻지 않는다. 그 질문을 하는 검사가 여기다.
 *
 * ## 무엇으로 비교하나
 *
 * **클래스 어휘가 핵심 축이다.** 두 앱이 같은 디자인 토큰 프리셋을 쓰면 생성되는
 * 원자 클래스가 공통 어휘가 된다 — 프레임워크가 달라도
 * `ff_mono fs_xs ls_mono c_ink.600`은 글자 단위로 같다. 그래서 클래스 집합의
 * 차집합이 곧 "한쪽에만 있는 시각 결정"이다. 실제로 이 축이 sticky 헤더의
 * `bkdp-blur_[12px]`가 한쪽에만 있는 것을 잡았다(스크롤해야 보이는 차이라
 * 문서 높이·요소 수로는 안 잡힌다).
 *
 * ## 무엇을 못 잡나
 *
 * 렌더 결과가 아니라 **마크업**을 본다. 실제로 그려진 글꼴(웹폰트를 안 실었는지),
 * 계산된 좌표, 스크롤 후에만 드러나는 것은 여기서 안 잡힌다. 그건 브라우저가
 * 필요하고, 이 게이트를 가볍게 유지하려고 일부러 뺐다 — 이 저장소에서 실제로
 * 놓친 웹폰트 누락 둘은 `CSS.getPlatformFontsForNode`로만 드러났다.
 *
 * 사용: `blog-content check-parity` (양쪽 앱이 빌드된 뒤)
 */

export interface ParityViolation {
  page: string;
  /** 어느 축에서 어긋났나 */
  axis: 'class' | 'heading' | 'link' | 'element' | 'head';
  message: string;
}

/** 한 페이지에서 뽑아낸 구조 지문 — 비교 함수는 fs도 HTML도 모른다. */
export interface PageFingerprint {
  /** 클래스 이름 → 등장 횟수 */
  classes: ReadonlyMap<string, number>;
  /** `[레벨, 정규화한 텍스트]`의 문서 순서 */
  headings: readonly (readonly [string, string])[];
  /** 사이트 내부 `<a href>` — 에셋 프리로드는 제외 */
  links: readonly string[];
  /** 태그 이름 → 등장 횟수. 의미 있는 것만 센다 */
  elements: ReadonlyMap<string, number>;
  /** `<head>`의 아이콘·매니페스트 선언 — `rel` 값의 집합 */
  headRels: readonly string[];
}

/** 세는 태그. 전부 세면 래퍼 `div` 개수 차이가 리포트를 덮는다. */
const COUNTED_TAGS = [
  'a',
  'button',
  'img',
  'svg',
  'h1',
  'h2',
  'h3',
  'h4',
  'pre',
  'code',
  'figure',
  'table',
  'input',
] as const;

/**
 * HTML 엔티티를 되돌린다.
 *
 * 두 프레임워크가 **속성값을 다르게 이스케이프한다** — Panda의 임의 셀렉터
 * 클래스(`[&_>_li:last-child]:…`)에서 React는 `>`를 `&gt;`로 쓰고 SvelteKit은
 * 그대로 둔다. 정규화하지 않으면 같은 클래스가 양쪽에만 있는 것으로 잡혀
 * 리포트가 전부 거짓 양성이 된다.
 */
function unescapeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'");
}

/** 태그를 걷어내고 공백을 하나로 — 줄바꿈 위치는 프레임워크마다 다르다. */
function textOf(html: string): string {
  return unescapeHtml(html.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

export function fingerprint(html: string): PageFingerprint {
  const classes = new Map<string, number>();
  for (const match of html.matchAll(/class="([^"]*)"/g)) {
    for (const name of unescapeHtml(match[1] ?? '').split(/\s+/)) {
      if (name) classes.set(name, (classes.get(name) ?? 0) + 1);
    }
  }

  const headings: (readonly [string, string])[] = [];
  for (const match of html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/g)) {
    headings.push([match[1] ?? '', textOf(match[2] ?? '')] as const);
  }

  // **`<a href>`만 센다.** `<link rel=preload>`까지 세면 에셋 경로 관례
  // (`/_next/…` 대 `/_app/…`)가 통째로 차이로 잡혀 신호가 묻힌다.
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
    const href = unescapeHtml(match[1] ?? '');
    if (href.startsWith('/')) links.add(href.split(/[?#]/)[0] ?? href);
  }

  const elements = new Map<string, number>();
  for (const tag of COUNTED_TAGS) {
    const count = [...html.matchAll(new RegExp(`<${tag}\\b`, 'g'))].length;
    if (count > 0) elements.set(tag, count);
  }

  const headRels = new Set<string>();
  for (const match of html.matchAll(/<link\b[^>]*\brel="([^"]*)"[^>]*>/g)) {
    const rel = match[1] ?? '';
    // 아이콘·매니페스트만 — 스타일시트·프리로드는 산출물 관례라 축이 아니다.
    if (/icon|manifest/i.test(rel)) headRels.add(rel);
  }

  return {
    classes,
    headings,
    links: [...links].sort(),
    elements,
    headRels: [...headRels].sort(),
  };
}

/** 목록이 길면 앞 몇 개만 — 리포트가 화면을 덮지 않게. */
function sample(values: readonly string[], limit = 6): string {
  const head = values.slice(0, limit).join(', ');
  return values.length > limit
    ? `${head} … 외 ${values.length - limit}개`
    : head;
}

export function comparePage(
  page: string,
  baseline: PageFingerprint,
  target: PageFingerprint,
  allowClasses: ReadonlySet<string>,
): ParityViolation[] {
  const out: ParityViolation[] = [];
  const add = (axis: ParityViolation['axis'], message: string) => {
    out.push({ page, axis, message });
  };

  const onlyBaseline = [...baseline.classes.keys()]
    .filter(c => !target.classes.has(c) && !allowClasses.has(c))
    .sort();
  const onlyTarget = [...target.classes.keys()]
    .filter(c => !baseline.classes.has(c) && !allowClasses.has(c))
    .sort();
  if (onlyBaseline.length > 0) {
    add(
      'class',
      `기준에만 있는 클래스 ${onlyBaseline.length}종 — ${sample(onlyBaseline)}`,
    );
  }
  if (onlyTarget.length > 0) {
    add(
      'class',
      `대상에만 있는 클래스 ${onlyTarget.length}종 — ${sample(onlyTarget)}`,
    );
  }

  if (baseline.headings.length !== target.headings.length) {
    add(
      'heading',
      `헤딩 수가 다릅니다 — 기준 ${baseline.headings.length} / 대상 ${target.headings.length}`,
    );
  } else {
    const at = baseline.headings.findIndex(
      ([level, text], i) =>
        level !== target.headings[i]?.[0] || text !== target.headings[i][1],
    );
    if (at !== -1) {
      const b = baseline.headings[at];
      const t = target.headings[at];
      add(
        'heading',
        `${at}번째 헤딩이 다릅니다 — 기준 <${b?.[0]}>"${b?.[1]}" / 대상 <${t?.[0]}>"${t?.[1]}"`,
      );
    }
  }

  const linkOnlyBaseline = baseline.links.filter(
    l => !target.links.includes(l),
  );
  const linkOnlyTarget = target.links.filter(l => !baseline.links.includes(l));
  if (linkOnlyBaseline.length > 0) {
    add(
      'link',
      `기준에만 있는 링크 ${linkOnlyBaseline.length}개 — ${sample(linkOnlyBaseline)}`,
    );
  }
  if (linkOnlyTarget.length > 0) {
    add(
      'link',
      `대상에만 있는 링크 ${linkOnlyTarget.length}개 — ${sample(linkOnlyTarget)}`,
    );
  }

  for (const tag of COUNTED_TAGS) {
    const b = baseline.elements.get(tag) ?? 0;
    const t = target.elements.get(tag) ?? 0;
    if (b !== t) add('element', `<${tag}> 개수 — 기준 ${b} / 대상 ${t}`);
  }

  const relOnlyBaseline = baseline.headRels.filter(
    r => !target.headRels.includes(r),
  );
  if (relOnlyBaseline.length > 0) {
    add('head', `기준에만 있는 link rel — ${sample(relOnlyBaseline)}`);
  }

  return out;
}

export function checkParity(
  pages: ReadonlyMap<string, string>,
  baselinePages: ReadonlyMap<string, string>,
  config: Pick<ParityConfig, 'pages' | 'allowClasses'>,
): { violations: ParityViolation[]; compared: string[] } {
  const allow = new Set(config.allowClasses ?? []);
  // 비울 수 있다 — 그러면 양쪽에 다 있는 페이지 전부를 본다.
  const targets =
    config.pages && config.pages.length > 0
      ? config.pages
      : [...pages.keys()].filter(p => baselinePages.has(p)).sort();

  const violations: ParityViolation[] = [];
  const compared: string[] = [];
  for (const page of targets) {
    const target = pages.get(page);
    const baseline = baselinePages.get(page);
    // 한쪽에만 있는 페이지는 그 자체가 위반이다 — 라우트가 빠진 것이다.
    if (target === undefined || baseline === undefined) {
      violations.push({
        page,
        axis: 'element',
        message:
          target === undefined
            ? '대상 산출물에 없습니다'
            : '기준 산출물에 없습니다',
      });
      continue;
    }
    compared.push(page);
    violations.push(
      ...comparePage(page, fingerprint(baseline), fingerprint(target), allow),
    );
  }
  return { violations, compared };
}

export function main(ctx: ContentContext, target?: string) {
  const config = ctx.content.config.parity;
  if (!config) {
    console.log('✓ check-parity: parity 미선언 — 검사 스킵');
    return;
  }

  const outDir = target
    ? resolve(process.cwd(), target)
    : ctx.content.paths.outDir;
  // baseline은 설정 파일이 있는 앱 루트 기준이다 — cwd 기준이면 어디서 부르냐에 따라
  // 답이 갈린다.
  const baselineDir = resolve(ctx.content.paths.appRoot, config.baseline);

  for (const [label, dir] of [
    ['대상', outDir],
    [config.baselineLabel, baselineDir],
  ] as const) {
    if (!existsSync(dir)) {
      console.error(
        `✖ ${label} 산출물이 없습니다: ${dir}\n  두 앱을 모두 빌드한 뒤 실행하세요.`,
      );
      process.exit(1);
    }
  }

  const pages = collectPages(outDir);
  const baselinePages = collectPages(baselineDir);
  // 한쪽이라도 비면 "차이 0건"이 아니라 검사를 못 한 것이다(check-bundle과
  // 같은 fail-closed).
  if (pages.size === 0 || baselinePages.size === 0) {
    console.error(
      `✖ 페이지를 찾지 못했습니다 — 대상 ${pages.size}개 / ${config.baselineLabel} ${baselinePages.size}개`,
    );
    process.exit(1);
  }

  const { violations, compared } = checkParity(pages, baselinePages, config);
  if (violations.length === 0) {
    console.log(
      `✓ ${config.baselineLabel} 판과 파리티 통과 (페이지 ${compared.length}개)`,
    );
    return;
  }

  console.error(
    `\n파리티 검사 실패: ${config.baselineLabel} 판과 어긋난 곳 ${violations.length}건\n`,
  );
  let current = '';
  for (const v of violations) {
    if (v.page !== current) {
      current = v.page;
      console.error(`  ${current}`);
    }
    console.error(`    ✖ [${v.axis}] ${v.message}`);
  }
  console.error(
    '\n  차이가 의도한 것이면 content.values.mts의 parity.allowClasses에 적으세요.',
  );
  process.exit(1);
}
