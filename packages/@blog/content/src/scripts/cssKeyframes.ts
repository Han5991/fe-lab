import { collectAssetRefs } from './assetRefs.ts';

/**
 * 페이지가 내려받는 CSS가 **이름으로 부르는 keyframes가 그 CSS 안에 있는지** 봅니다.
 *
 * `animation`·`animation-name`이 가리키는 이름에 `@keyframes`가 없으면 브라우저는
 * 진단 없이 애니메이션을 건너뜁니다 — 로딩 스켈레톤이 멈추고 스크롤 진행 바가
 * 움직이지 않습니다. 빌드·타입·jsdom 테스트는 생성 CSS를 보지 않는데, 빌드 도구의
 * 최적화가 쓰는 keyframes를 지운 적이 있습니다(Panda 2.1.2의
 * `optimize.removeUnusedKeyframes`가 animations 토큰으로만 부른 keyframes를 지웠다).
 *
 * 이름은 소스가 아니라 **산출물에서** 모읍니다 — 검사할 이름 목록을 따로 두지 않으므로
 * 새 애니메이션도 그대로 덮습니다. `var(--x)`는 같은 페이지 CSS의 사용자 정의 속성 값으로
 * 풉니다(Panda는 `animation: 'pulse'`를 `animation:var(--animations-pulse)`로 냅니다).
 * 정의만 있고 아무 선언도 부르지 않는 변수의 이름은 세지 않습니다.
 *
 * 범위는 HTML이 `<link>`로 부르는 **첫 로드 CSS 안의 선언**입니다. 지연 로드 청크가 붙이는
 * CSS, 그리고 JS가 런타임에 고르는 애니메이션(인라인 style, `token.var('animations.x')`)은
 * 보지 않습니다 — 후자는 Panda 옵티마이저도 사용처로 세지 않아 keyframes를 지우므로, 둘 다
 * 놓치고 런타임 게이트(e2e)만 볼 수 있습니다.
 *
 * 양성 대조: CSS에 `@keyframes` 정의가 있는데 모든 페이지를 통틀어 부르는 이름이 하나도
 * 없으면 실패합니다 — "빠진 것 없음"과 "파서가 아무것도 못 봄"(산출물 형태 변화)을 가르기
 * 위해서입니다. keyframes도 애니메이션도 없는 사이트는 볼 것이 없어 통과합니다.
 *
 * 재평가: 2027-04-22 — 그때까지 빠진 keyframes를 한 번도 잡지 못했으면 줄이거나
 * 내린다(AGENTS.md §5).
 */

export interface KeyframeUsage {
  /** `@keyframes 이름`으로 정의된 이름 */
  defined: ReadonlySet<string>;
  /** `animation`·`animation-name` 선언이 부르는 이름 */
  referenced: ReadonlySet<string>;
}

export interface KeyframeViolation {
  rule: 'keyframes-missing' | 'keyframes-unseen';
  message: string;
}

export interface KeyframeReport {
  violations: KeyframeViolation[];
  /** 모든 페이지를 통틀어 부른 이름 수 — 통과 보고에 찍는다 */
  referenced: number;
}

const COMMENT = /\/\*[\s\S]*?\*\//g;
const KEYFRAMES = /@(?:-webkit-)?keyframes\s+([^\s{]+)\s*\{/g;
// 선언은 블록 시작·선언 끝·중첩 블록 끝 뒤에서 시작한다. 셀렉터 안의 글자
// (`.\[\@supports_not_\(animation-timeline\:…`)나 `--animations-x`는 걸리지 않는다.
const CUSTOM_PROPERTY = /[{;}]\s*(--[^\s:;{}]+)\s*:([^;{}]*)/g;
const ANIMATION_DECL =
  /[{;}]\s*(?:-webkit-)?(?:animation|animation-name)\s*:([^;{}]*)/g;
const VAR_REF = /var\(\s*(--[^\s,()]+)\s*(?:,((?:[^()]|\([^()]*\))*))?\)/g;
const FUNCTION_CALL = /[\w-]+\([^()]*\)/g;
const IDENT = /^-?[_a-zA-Z][\w-]*$/;

/** `animation` 단축 속성에서 이름이 아닌 키워드 — 전역 값·반복·방향·채우기·재생 상태·타이밍 함수. */
const NON_NAME_KEYWORDS = new Set([
  'none',
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
  'auto',
  'infinite',
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'running',
  'paused',
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
]);

function unquote(name: string): string {
  return /^(['"]).*\1$/.test(name) ? name.slice(1, -1) : name;
}

/** `var()`를 그 속성의 정의(조건마다 여럿일 수 있다)와 폴백으로 푼다 — 대안은 목록 항목으로 잇는다. */
function resolveVars(
  value: string,
  props: ReadonlyMap<string, readonly string[]>,
  seen: ReadonlySet<string> = new Set(),
): string {
  let out = '';
  let last = 0;
  for (const m of value.matchAll(VAR_REF)) {
    const name = m[1] ?? '';
    const fallback = m[2];
    const next = new Set([...seen, name]);
    const options = seen.has(name) ? [] : (props.get(name) ?? []);
    const parts = [...options, ...(fallback === undefined ? [] : [fallback])];
    out +=
      value.slice(last, m.index) +
      parts.map(part => resolveVars(part, props, next)).join(',');
    last = m.index + m[0].length;
  }
  return out + value.slice(last);
}

/** 선언 값에서 keyframes 이름만 — 함수(타이밍 함수 등)는 안쪽부터 지운다. */
function namesIn(value: string): string[] {
  let rest = value.replace(/!important/gi, ' ');
  for (let previous = ''; previous !== rest;) {
    previous = rest;
    rest = rest.replace(FUNCTION_CALL, ' ');
  }
  return rest
    .split(/[\s,]+/)
    .map(unquote)
    .filter(
      token => IDENT.test(token) && !NON_NAME_KEYWORDS.has(token.toLowerCase()),
    );
}

export function collectKeyframeUsage(css: string): KeyframeUsage {
  const body = css.replace(COMMENT, '');
  const defined = new Set<string>();
  for (const m of body.matchAll(KEYFRAMES)) defined.add(unquote(m[1] ?? ''));
  const props = new Map<string, string[]>();
  for (const m of body.matchAll(CUSTOM_PROPERTY)) {
    const name = m[1] ?? '';
    props.set(name, [...(props.get(name) ?? []), m[2] ?? '']);
  }
  const referenced = new Set<string>();
  for (const m of body.matchAll(ANIMATION_DECL)) {
    for (const name of namesIn(resolveVars(m[1] ?? '', props))) {
      referenced.add(name);
    }
  }
  return { defined, referenced };
}

/**
 * 페이지마다 그 페이지가 내려받는 CSS 전부를 한 덩어리로 보고 평가한다 — 다른 파일이
 * 정의한 keyframes를 부르는 것은 괜찮지만, 그 파일을 내려받지 않는 페이지에서는 빠진 것이다.
 *
 * @param readCss 사이트 루트 기준 CSS 경로 → 본문. 없는 파일(null)은 건너뛴다 — 예산
 *   측정이 `missing`으로 따로 보고한다.
 */
export function checkKeyframes(
  pages: ReadonlyMap<string, string>,
  readCss: (ref: string) => string | null,
): KeyframeReport {
  const usageBySheets = new Map<string, KeyframeUsage>();
  const missingPages = new Map<string, string[]>();
  const referencedAll = new Set<string>();
  const definedAll = new Set<string>();
  for (const [path, html] of pages) {
    const sheets = collectAssetRefs(html, path).filter(ref =>
      ref.endsWith('.css'),
    );
    const key = sheets.join('\n');
    let usage = usageBySheets.get(key);
    if (usage === undefined) {
      usage = collectKeyframeUsage(
        sheets.map(ref => readCss(ref) ?? '').join('\n'),
      );
      usageBySheets.set(key, usage);
    }
    for (const name of usage.defined) definedAll.add(name);
    for (const name of usage.referenced) {
      referencedAll.add(name);
      if (!usage.defined.has(name)) {
        missingPages.set(name, [...(missingPages.get(name) ?? []), path]);
      }
    }
  }

  const violations: KeyframeViolation[] = [...missingPages].map(
    ([name, paths]) => ({
      rule: 'keyframes-missing',
      message: `CSS가 keyframes '${name}'를 부르지만 정의가 없습니다 — 페이지 ${paths.length}개(${paths.slice(0, 3).join(', ')}${paths.length > 3 ? ' …' : ''}). 빌드 도구의 최적화(Panda optimize.removeUnusedKeyframes 등)가 지웠는지 보세요.`,
    }),
  );
  if (definedAll.size > 0 && referencedAll.size === 0) {
    violations.push({
      rule: 'keyframes-unseen',
      message: `CSS에 keyframes 정의가 ${definedAll.size}개(${[...definedAll].slice(0, 3).join(', ')}) 있는데 부르는 선언을 하나도 찾지 못했습니다 — 산출물 형태가 바뀌어 파서가 놓쳤거나, 아무도 쓰지 않는 keyframes가 실렸습니다(후자면 빌드 도구의 미사용 keyframes 제거를 켜세요).`,
    });
  }
  return { violations, referenced: referencedAll.size };
}
