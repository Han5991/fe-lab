import { resolve } from 'node:path';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import panda from '@pandacss/eslint-plugin';
import { defineConfig } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { TEST_PROGRAM_FILES, UNIT_TESTS } from './testFiles.mts';

/**
 * Panda 대괄호 이스케이프로 색을 직접 박는 것을 막는다.
 *
 * `strictTokens: true`는 토큰 밖 값을 막지만 `'[#1f6feb]'` 이스케이프는 통과시킨다 —
 * "여긴 의도적으로 토큰을 벗어난다"를 남기라는 장치이고, 색에는 그 의도가 성립하지
 * 않는다. 2026-07-05 리디자인이 `[#1f6feb]`·`[#f85149]`를 그대로 실어 라이트에서
 * 색이 안 바뀌는 회귀가 났고, 그건 lint가 아니라 화면을 보고서야 발견됐다.
 *
 * CSS 변수를 못 읽는 렌더러(satori/sharp의 OG 카드, mermaid)는 여기 걸리지 않는다 —
 * 그쪽은 `css()` 값이 아니라 평범한 문자열 상수다. 팔레트와의 정합은 각자
 * 프리셋에서 뽑는 값(`themeColor()`·`ogBrand`)과 `mermaidTheme.test.ts` 잠금 테스트가 본다.
 *
 * `no-restricted-syntax`는 블록마다 통째로 덮어써지므로(뒤 블록이 이김) 이 항목을
 * 이 룰을 쓰는 **모든 블록에 함께** 펼친다. 새 블록에서 이 룰을 켜면 여기도 넣을 것.
 * 그 결과 실제 커버 범위는 app 레이어·레이어 폴더(`src/{shared,domain,lib}`)·`content.values.mts`·
 * 공개 배럴이다 — 이 룰을 켜는 블록 전부.
 */
const NO_ESCAPED_HEX = {
  selector: 'Literal[value=/^\\[#/]',
  message:
    '색은 blog-preset.ts의 토큰에서 옵니다. `[#hex]` 대괄호 이스케이프로 색을 직접 박지 마세요 — 라이트/다크 한쪽에서만 맞는 값이 됩니다.',
} as const;

/**
 * 모션 단축 속성 `transition`의 대괄호 이스케이프를 막는다.
 *
 * 시간·곡선은 토큰이고(blog-preset.ts의 durations·easings), 움직임 줄이기도 그 토큰이 0.01ms로
 * 바꾸며 처리한다. `transition: '[transform 0.3s]'`는 그 둘을 모두 건너뛴다 — 움직임 줄이기를
 * 켠 사용자에게도 움직이고, 화면은 멀쩡하니 아무것도 실패하지 않는다. prefer-token은 이 자리를
 * 못 본다: `transition` 유틸리티의 값은 토큰 카테고리가 아니라 목록(colors·common …)이라
 * 카테고리로 잡히지 않는다(`animation`은 animations 카테고리라 prefer-token이 본다). 2026-10
 * 토큰 도입 전에는 preset-panda의 durations가 있었는데도 이 이스케이프가 31개 파일에 53개
 * 쌓였다 — 토큰이 있다는 것만으로는 막히지 않았다.
 *
 * 쓰는 쪽은 유틸리티 값(`transition: 'colors'`, 기본 시간·곡선은 globalCss가 토큰으로 준다)이나
 * longhand(`transitionProperty` + `transitionDuration`·`transitionTimingFunction` 토큰)다. 누름의
 * 전환(`pressTransition`, panda.config의 상태 이름)도 같은 자리라 함께 본다 — 그 키는 프리셋 파일만 쓰고
 * (`NO_LOCAL_INTERACTION`), 프리셋 파일 안에서도 이스케이프로 상태 이름을 건너뛰지 못한다.
 * `css()`를 쓰는 파일은 app element뿐이라(styled-system을 여는 레이어가 app뿐 — boundaries) app
 * 블록 하나에만 건다. 템플릿 리터럴도 본다 — Panda는 상수를 끼운 템플릿
 * (`` `[transform ${MS}ms]` ``)도 정적으로 풀어 추출한다.
 *
 * 재평가: 2027-04-24 — 그때까지 잡은 위반이 없으면 내린다(AGENTS.md §5).
 */
const NO_ESCAPED_TRANSITION = {
  selector:
    'Property:matches([key.name=/^(transition|pressTransition)$/], [key.value=/^(transition|pressTransition)$/]) :matches(Literal[value=/^\\[/], TemplateLiteral > TemplateElement[value.raw=/^\\[/])',
  message:
    "전환 시간·곡선은 토큰입니다. `transition: '[…]'` 대신 `transition: 'colors'` 같은 유틸리티 값이나 `transitionProperty` + `transitionDuration`·`transitionTimingFunction` 토큰을 쓰세요. `pressTransition`은 상태 이름(`rest`·`held` …)만 받습니다 — 새 모양이 필요하면 panda.config.ts의 `PRESS_TRANSITION`에 상태를 더하세요(누름 요소에 longhand를 겹치면 누름 시간을 덮습니다). 이스케이프는 움직임 줄이기(토큰이 0.01ms로 바꾼다)를 건너뜁니다.",
} as const;

/**
 * 누름·초점 상태를 컴포넌트가 직접 정하지 못하게 막는다 — 때는 panda.config의 조건이, 모양은
 * `src/components/interaction.ts`의 프리셋이 정한다(blog-design-system 스킬 "인터랙션 상태").
 * 컴포넌트는 `_hover`에 값만 적는다(터치에서는 그 값이 누르는 동안 켜진다). 막는 것은 같은 뜻의 조건
 * 이름 전부와 그 조건을 선택자로 풀어 적은 키다:
 * - 누름: `_active`·`_groupActive`·`_peerActive`(누름을 따로 적은 사본 — 검색 결과 행과 닫기 버튼이 하나씩
 *   갖고 있었다), `_press`·`_groupPress`(프리셋 몫), 누름의 전환
 *   `pressTransition`(상태 이름은 프리셋이 짝지어 쓴다 — `'[…]'`·`var()`로 적으면 토큰을 건너뛴다).
 * - 초점: `_focus`·`_focusVisible`(초점 링은 globalCss `:focus-visible` 하나다 — `_focus: { outline: 'none' }`이
 *   그 링을 지웠다), `_groupFocus`·`_groupFocusVisible`·`_groupFocusWithin`·`_groupKeyboardFocus`와 `_peerFocus*`
 *   (그룹·형제의 초점 — 카드의 키보드 초점 틴트는 `cardParts.ts`가 `_groupKeyboardFocus`로 건다).
 * - 입력 종류: `_pointerCoarse`(입력 종류로 누름을 가르는 것은 프리셋 몫이다).
 * - 선택자 키: `'&:active'`·`'&:focus'`·`'&:focus-visible'`·`'&:hover'`와 `` [`&:active`] `` 같은 템플릿 리터럴 키.
 *   `:hover`를 선택자 문자열에 직접 적으면 Panda 조건을 거치지 않아 터치에서 탭 뒤에도 hover가 남는다
 *   (글 본문 표의 `'& tr:hover td'`가 그랬다).
 * `_hover`·`_groupHover`는 막지 않는다 — 컴포넌트가 면·색을 적는 설계상의 조건이다. `_focusWithin`도
 * 막지 않는다 — 입력을 감싸는 상자의 보더가 그 자리다(`ArchiveSearchBox`).
 *
 * 쓸 수 있는 파일은 `INTERACTION_FILES`뿐이다. `no-restricted-syntax`는 블록마다 통째로 덮어써지므로(위
 * NO_ESCAPED_HEX 주석) 그 블록은 이 룰만 빼고 나머지를 `APP_SYNTAX_EXCEPT_INTERACTION`에서 다시 펼친다.
 *
 * 재평가: 2027-04-25 — 그때까지 잡은 위반이 없으면 내린다(AGENTS.md §5).
 */
const NO_LOCAL_INTERACTION_NAME =
  '^(_(active|groupActive|peerActive|focus|focusVisible|groupFocus|groupFocusVisible|groupFocusWithin|groupKeyboardFocus|peerFocus|peerFocusVisible|peerFocusWithin|press|groupPress|pointerCoarse)|pressTransition)$';
const NO_LOCAL_INTERACTION_SELECTOR =
  ':(active|focus|focus-visible|hover)([^-\\w]|$)';
const NO_LOCAL_INTERACTION = {
  selector: [
    `Property:matches([key.name=/${NO_LOCAL_INTERACTION_NAME}/], [key.value=/${NO_LOCAL_INTERACTION_SELECTOR}/])`,
    // 템플릿 리터럴 키 — 값이 없는 노드라 `key.value`로는 안 보인다. 상수를 끼운 템플릿도 첫 조각이 보인다.
    `Property > TemplateLiteral.key > TemplateElement[value.raw=/${NO_LOCAL_INTERACTION_SELECTOR}/]`,
  ].join(', '),
  message:
    '누름·초점 상태는 직접 정하지 않습니다 — 때는 panda.config의 조건, 모양은 src/components/interaction.ts의 프리셋입니다. `_hover`에 값만 적으면 터치에서는 누르는 동안 켜집니다(blog-design-system 스킬 "인터랙션 상태"). `:hover`를 선택자 문자열에 적지 말고 `_hover`를 쓰세요.',
} as const;

/**
 * NO_LOCAL_INTERACTION의 허용 파일 — 누름·초점 조건을 실제로 쓰는 곳이다.
 * - `interaction.ts`·`cardParts.ts`: 프리셋이 `_press`·`_groupPress`·`_groupKeyboardFocus`와
 *   `pressTransition`을 건다.
 * - `skipLink.ts`: 건너뛰기 링크가 초점을 받으면 화면 안으로 들어온다(`_focus: { transform: 'none' }`).
 *   사이트 셸과 admin 셸이 함께 쓰는 모듈 하나라 셸 파일 전체를 열지 않는다.
 */
const INTERACTION_FILES = [
  'src/components/interaction.ts',
  'src/components/blog/cardParts.ts',
  'src/components/skipLink.ts',
];

/**
 * Panda 공식 lint(`@pandacss/eslint-plugin`, Panda v2 get-started/linting) — 빌드와 같은 v2
 * 추출 결과로 스타일을 검사한다. recommended(토큰 경로·잘못된 중첩·include 밖 파일·추출
 * 진단 …) 위에 `prefer-token`을 색·라운드·보더 굵기·그림자·모션으로 넓혀 error로 건다: 그
 * 카테고리에 토큰이 있는데 원시 값이나 대괄호 이스케이프를 쓰면 막힌다(AGENTS.md §9). 예외는
 * 아래 파일 단위 블록의 `allow`(인용·대화 강조 바 `'[2px]'`) 하나다.
 *
 * NO_ESCAPED_HEX는 남긴다 — 플러그인은 Panda가 정적으로 추출한 스타일만 보므로, 빌드 때
 * 값을 따라가지 못하는 자리와 Panda include 밖(`content.values.mts`)의 `'[#hex]'`는 그
 * 셀렉터만 본다.
 *
 * 재평가: 2027-04-08 — 그때까지 이 블록이 잡은 위반이 없으면 categories를 recommended
 * 기본(colors)으로 줄인다(AGENTS.md §5).
 */
const pandaRecommended = await panda.configs.recommended({
  configPath: './panda.config.ts',
  cwd: import.meta.dirname,
  files: ['src/**/*.{ts,tsx}'],
});

/**
 * prefer-token 옵션. flat config는 뒤 블록이 룰 옵션을 통째로 덮으므로 파일 단위 예외도
 * 이 객체를 펼쳐 쓴다. 공통 `allow`는 없다 — 라운드·보더의 0도 `none` 토큰이라 `'[0]'`은
 * error다(`allow`는 원시 문자열 비교라 카테고리를 가리지 않아, 남겨 두면 `rounded: '[0]'`이
 * `none`을 우회했다).
 *
 * `shadows`·`dropShadows`는 2026-10에 더했다 — 블로그 그림자는 프리셋의 `overlay.*`뿐인데, admin 카드
 * 9곳이 `boxShadow: '[0 1px 2px …]'` 이스케이프로 들어와 있었다(추가 직후 정확히 그 9건이
 * 잡혔다). `textShadow`·`shadow` 단축도 shadows로 잡힌다. `dropShadows`는 비어 있는 카테고리라
 * 쓰는 곳이 0이지만, 빼면 `dropShadow: '[…]'` 글로우가 lint와 check-types를 둘 다 통과한다.
 * `filter: '[drop-shadow(…)]'`는 카테고리가 없어 여기서 못 본다. Recharts `contentStyle` 같은 인라인
 * style 객체도 Panda 추출 밖이라 못 본다 — 그래서 차트 툴팁은 인라인 style 대신 Panda 클래스로
 * 그린다(src/components/admin/ChartTooltip.tsx).
 * 재평가: 2027-04-24 — 그때까지 그 9곳 밖에서 잡은 위반이 없으면 두 카테고리를 뺀다(AGENTS.md §5).
 *
 * `durations`·`easings`·`animations`도 2026-10에 더했다 — 모션 토큰(blog-preset.ts)이 움직임 줄이기를
 * 한 곳에서 처리하므로, `transitionDuration: '[200ms]'`·`animation: '[spin 1s …]'`처럼 이스케이프로
 * 들어온 값은 그 처리를 조용히 건너뛴다. 추가 시점 위반은 `animation: '[none]'` 1건(진행 바의 움직임
 * 줄이기 — `animationName: 'none'`으로 바꿨다)이었다. `transition` 단축 속성은 카테고리가 없어 위
 * NO_ESCAPED_TRANSITION이 본다.
 * 재평가: 2027-04-24 — 그때까지 잡은 위반이 없으면 세 카테고리를 뺀다(AGENTS.md §5).
 */
const PREFER_TOKEN = {
  categories: [
    'colors',
    'radii',
    'borderWidths',
    'shadows',
    'dropShadows',
    'durations',
    'easings',
    'animations',
  ],
};

/**
 * 큰 배럴(`@blog/content`)과 SEO 문(`@blog/content/seo`)의 **값** import를 서버 전용
 * 파일로 가둔다.
 *
 * 배럴은 `series.ts`·로더로 `node:fs`를 열고, SEO 문도 `post/index.ts`를 거쳐 같은
 * 그래프를 연다. 클라이언트 그래프에서 그걸 걸러 주는
 * 것은 next.config의 `optimizePackageImports`(Next 전용·앱별, 트리 셰이킹 없는 dev에서
 * 유일한 방어선)뿐이라, 클라이언트에서 안전한 것은 패키지 계약인
 * `@blog/content/client`로 연다 — 그 문에 node 빌트인이 없다는 성질은 패키지의
 * `clientDoor.test.ts`가 잠근다. 타입은 번들에 남지 않으므로 배럴에서 가져와도 된다
 * (`SeriesSummary`처럼 배럴에만 있는 타입).
 *
 * 예외는 배럴에만 있는 값(로더 인스턴스·`sortPostsBySeriesOrder` …)이 필요한 서버
 * 파일뿐이다. 새 서버 파일이 배럴 값이 필요하면 `SERVER_ONLY_BARREL_FILES`에 더한다.
 * 그 파일 안에서도 문에 있는 값은 문으로 연다 — 배럴 import 줄이 곧 "배럴에만 있는 것"의
 * 목록이 되게.
 *
 * `paths`는 정적 import·재수출만 본다. 동적 `import()`는 `no-restricted-syntax`를 켜는 모든
 * 블록이 `CONTENT_DYNAMIC_IMPORT`를 펼쳐 맡는다 — 그 룰은 블록마다 통째로 덮어써지므로 하나라도
 * 빠지면 그 파일에서 동적 import가 열린다(NO_ESCAPED_HEX 주석과 같은 이유).
 */
const CONTENT_BARREL_VALUES = {
  name: '@blog/content',
  allowTypeImports: true,
  message:
    '클라이언트에서 안전한 값은 @blog/content/client로 가져오세요 — 큰 배럴은 node:fs(series·로더)를 엽니다. 배럴에만 있는 값이 필요한 서버 파일이면 eslint.config.mts의 SERVER_ONLY_BARREL_FILES에 추가하세요.',
} as const;

const CONTENT_SEO_VALUES = {
  name: '@blog/content/seo',
  allowTypeImports: true,
  message:
    'SEO 빌더는 post/index.ts를 거쳐 node:fs를 엽니다 — 인스턴스는 서버 전용인 @/src/content에서 쓰세요. 타입만 필요하면 import type으로.',
} as const;

/**
 * 사이트 안 링크는 `TransitionLink`(src/components/shared/TransitionLink.tsx)로 — 그것이 현재 경로와
 * 도착 경로로 이동의 방향(transition type, `navTransitionType`)을 단다. `next/link`를 바로 쓰면 그
 * 이동만 방향 없이 페이드로 남고, 빌드·테스트·브라우저 어디서도 에러가 없다 — 같은 이동(홈 →
 * `/posts`)이 헤더로 가면 밀리고 다른 링크로 가면 페이드하는 식으로 조용히 갈린다.
 *
 * 허용은 `NEXT_LINK_FILES`만이다(그 블록의 사유). 타입은 번들·동작과 무관하니 연다.
 *
 * 재평가: 2027-04-24 — 그때까지 잡은 위반이 없으면 내린다(AGENTS.md §5).
 */
const NEXT_LINK_DIRECT = {
  name: 'next/link',
  allowTypeImports: true,
  message:
    '사이트 안 링크는 @/src/components/shared/TransitionLink를 쓰세요 — 이동의 방향(transition type)을 앱의 계층으로 답니다. next/link를 바로 쓰면 그 이동만 조용히 페이드로 남습니다. 방향을 일부러 달지 않는 곳이면 eslint.config.mts의 NEXT_LINK_FILES에 사유와 함께 추가하세요.',
} as const;

/**
 * `next/link`를 바로 여는 것이 허용된 파일 — 방향 type을 일부러 달지 않는 곳만.
 *
 * - `TransitionLink.tsx` — 감싸개 자신
 * - `SearchDialog.tsx` — 결과는 모달을 닫으며 가는 이동이라 페이지가 옆으로 밀리면 닫히는 패널과
 *   엇갈린다(페이드)
 * - `ErrorFallback.tsx` — 에러 경계(`error.tsx`·`global-error.tsx`)가 그리는데, 에러 경계에는 페이지
 *   전환 경계가 없어(PageBoundary 주석) 방향 있는 이동이면 들어오는 페이지가 늦게 나타나는 동안
 *   화면이 빈다
 * - admin 영역 — 공개 계층(홈·섹션·글) 밖의 도구 화면이라 방향을 정하지 않는다
 */
const NEXT_LINK_FILES = [
  'src/components/shared/TransitionLink.tsx',
  'src/components/search/SearchDialog.tsx',
  'src/components/ErrorFallback.tsx',
  'src/app/admin/**/*.tsx',
  'src/components/admin/**/*.tsx',
];

const CONTENT_DYNAMIC_IMPORT = {
  selector:
    "ImportExpression:matches([source.value='@blog/content'], [source.value='@blog/content/seo'])",
  message:
    '큰 배럴·SEO 문은 동적 import로도 열지 마세요 — node:fs가 클라이언트 그래프로 들어옵니다. @blog/content/client를 쓰세요.',
} as const;

/** 배럴 값 import가 허용되는 서버 전용 파일 — 글롭이라 `[...slug]`의 괄호는 이스케이프한다. */
const SERVER_ONLY_BARREL_FILES = [
  'src/content.ts',
  'src/app/page.tsx',
  'src/app/posts/\\[...slug\\]/page.tsx',
  'src/app/series/seriesIndex.ts',
];

/**
 * 테스트 프로그램(tsconfig.test.json)에 속한 파일. 타입 정보 블록과 단언 규칙의 테스트
 * 예외가 이 값을 함께 쓴다 — 출처는 testFiles.mts, tsconfig 쪽은 testFiles.test.ts가 잠근다.
 */
const TEST_FILES = TEST_PROGRAM_FILES;

/** app 레이어의 repository 직접 import 금지 — 아래 블록들이 같은 값을 펼친다. */
const REPOSITORY_IMPORT_PATTERN = {
  // adminRepository처럼 접두사가 붙은 것도 함께 막습니다.
  group: ['**/domain/*/*[rR]epository', '**/domain/*/*[rR]epository.*'],
  message:
    'repository는 인프라 레이어입니다. domain/<x> 공개 API(배럴, 예: @/src/domain/analytics, @/src/domain/analytics/admin)를 통해 접근하세요.',
};

/**
 * app 레이어의 import 금지에서 next/link만 뺀 것 — `NEXT_LINK_FILES` 블록이 그대로 쓰고, app 블록은
 * 여기에 `NEXT_LINK_DIRECT`를 더한다. 허용 파일의 설정이 언제나 "app 블록 − next/link"가 되게 한 값에서
 * 둘 다 뽑는다.
 */
const APP_IMPORTS_EXCEPT_NEXT_LINK = {
  paths: [CONTENT_BARREL_VALUES, CONTENT_SEO_VALUES],
  patterns: [REPOSITORY_IMPORT_PATTERN],
};

/**
 * app 레이어의 `no-restricted-syntax`에서 `NO_LOCAL_INTERACTION`만 뺀 것 — `INTERACTION_FILES` 블록이
 * 그대로 쓰고, app 블록은 여기에 `NO_LOCAL_INTERACTION`을 더한다(위 `APP_IMPORTS_EXCEPT_NEXT_LINK`와 같은
 * 짝). 룰을 더하거나 빼면 두 블록이 함께 따라간다.
 */
const APP_SYNTAX_EXCEPT_INTERACTION = [
  NO_ESCAPED_HEX,
  CONTENT_DYNAMIC_IMPORT,
  NO_ESCAPED_TRANSITION,
];

/**
 * ESLint 10 구성 — `eslint-config-next`를 걷어내고 플러그인을 직접 조립한다.
 *
 * 프리셋이 끌고 오는 eslint-plugin-react@7.x가 ESLint 10에서 제거된
 * `context.getFilename()`을 가드 없이 호출해(util/version.js의 version:'detect'
 * 경로) 린트가 통째로 죽는다. 여기서 조립하는 플러그인들은 전부 ESLint 10에서
 * 동작을 실측한 조합이다. react 계열 정적 검사는 react-hooks recommended-latest
 * (React Compiler 진단 룰 포함)가 담당한다 — next.config.ts의 reactCompiler와 짝.
 *
 * 타입 정보가 필요한 룰셋은 recommendedTypeCheckedOnly + projectService로 켠다.
 * 프로덕션 파일은 projectService가 tsconfig.json을 자동 발견하고, 테스트 파일은
 * 아래 전용 블록이 tsconfig.test.json 프로그램을 쓴다(각 블록 주석 참조).
 */
export default defineConfig([
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'public/**',
      '.cache/**',
      // vitest --coverage의 HTML 리포터가 뱉는 번들된 벤더 JS. 소스가 아니다.
      'coverage/**',
      // Playwright HTML 리포트·트레이스(test:e2e 산출물)와 그 서버(wrangler dev)의
      // 로컬 상태·임시 번들. 소스가 아니다.
      '.playwright/**',
      '.wrangler/**',
      'next-env.d.ts',
    ],
  },

  {
    // `eslint .`가 순회할 확장자 등록 + 전역 식별자. 이 앱은 빌드 스크립트(node)와
    // 클라이언트 컴포넌트(browser)가 한 트리에 있어 둘 다 연다 — config-next가
    // 넣어 주던 것과 같은 조합이다.
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ── 기본 룰셋: 코어 recommended → typescript-eslint strict + stylistic ──
  // 순서가 중요하다 — tseslint 프리셋 안의 eslint-recommended 오버라이드가
  // TS 파일에서 코어 no-undef·no-unused-vars 등(컴파일러가 이미 잡는 것)을
  // 꺼 주므로 코어를 먼저 두고 ts를 뒤에 둔다. strict는 recommended의 상위집합.
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // ── 타입 정보 기반 룰셋 ────────────────────────────────────────────────────
  // recommendedTypeCheckedOnly = recommended 중 타입 정보가 필요한 룰만.
  // (strict/stylistic 비-타입 룰은 위에서 이미 적용했으므로 *Only로 중복을 피한다)
  ...tseslint.configs.recommendedTypeCheckedOnly,
  {
    // projectService는 파일별로 가장 가까운 tsconfig.json을 자동 발견한다.
    // 프로덕션 소스는 전부 tsconfig.json 소속이므로 이걸로 충분하다.
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 테스트 파일은 tsconfig.json이 exclude하고 tsconfig.test.json이 include한다
    // (프로덕션 전용 엄격 플래그 3개를 끄기 위한 분할 — PR5). projectService의
    // 자동 발견은 파일명이 tsconfig.json인 것만 찾으므로 테스트 파일이 "어느
    // 프로젝트에도 없음"으로 떨어진다. allowDefaultProject로 우회하지 않는 이유:
    // `**` 글롭을 금지해 테스트 위치마다 패턴을
    // 나열해야 하고, 그렇게 열어도 tsconfig.test.json이 아니라 defaultProject
    // 단일 파일 추론으로 검사돼 check-types가 보는 프로그램과 어긋난다.
    // 대신 이 블록에서 tsconfig.test.json 프로그램을 명시해 check-types와
    // 정확히 같은 타입 환경으로 린트한다. 파일 목록은 TEST_FILES(testFiles.mts).
    files: TEST_FILES,
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 설정 파일 등 JS는 어떤 tsconfig 프로그램에도 속하지 않는다 — 타입 룰 해제.
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  nextPlugin.configs['core-web-vitals'],
  {
    // 모노레포에서 lint 실행 cwd가 앱 루트라는 보장이 없으므로 명시한다.
    // 없으면 @next/next/no-html-link-for-pages가 cwd에서 pages/·app/을 찾는다.
    settings: { next: { rootDir: import.meta.dirname } },
  },

  reactHooks.configs.flat['recommended-latest'],

  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      // 스크롤 표 래퍼(role="region"+aria-label+tabIndex=0, PostBody.tsx)는 axe
      // scrollable-region-focusable이 요구하는 패턴이다 — 마우스 없이 스크롤할
      // 방법이 있어야 한다. 룰 기본 허용 목록(tabpanel)에 region을 더한다.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { roles: ['tabpanel', 'region'] },
      ],
      // 위 4개(click-events-have-key-events · no-noninteractive-element-
      // interactions · interactive-supports-focus · no-static-element-
      // interactions)는 예전에 현행 위반 5건 때문에 'warn'으로 내려 두고
      // --max-warnings=5로 봉해 뒀다. 위반을 설계로 풀었으므로(MobileTOC 앵커,
      // CodeTabs 키 핸들러를 탭으로, SearchDialog 백드롭 presentation) 여기서
      // 되돌리지 않는다 — recommended의 'error'가 그대로 산다.
    },
  },

  {
    // Supabase CLI(`pnpm gen:types` → `supabase gen types --local`) 생성 파일 —
    // 손대면 재생성 때 되돌아온다. 생성기 출력 형태(type 별칭·인덱스 시그니처)에
    // 스타일 룰을 묻지 않는다.
    files: ['src/lib/platform/database.types.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      // 생성기가 union에 `never`를 남긴다(Functions가 빈 스키마일 때 등).
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },

  {
    // 별칭(@/)·확장자 없는 import의 경로 해석기. config-next가 사설 트리로
    // 제공하던 것을 명시 선언으로 바꾼다. 지금 이 설정을 읽는 룰은 없지만,
    // eslint-module-utils 기반 플러그인(boundaries 등)이 들어오는 즉시 이게
    // 없으면 별칭 import가 전부 미해석된다(옆 저장소 실측 104건).
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
  },

  // ── disable 주석 정책: 인라인 인가 전면 금지 ───────────────────────────────
  // 룰을 끄는 결정은 **이 파일에서만** 한다. 소스에 흩어진 한 줄짜리 인가는
  // 리뷰에서 diff 한 줄로 지나가고, 한 번 붙으면 근거가 유효한지 아무도 다시
  // 묻지 않는다. 여기서 끄면 최소한 "무엇을 왜 껐나"가 한곳에 모인다.
  {
    plugins: { '@eslint-community/eslint-comments': eslintComments },
    linterOptions: {
      // 인라인 설정 주석을 **읽지 않는다.** eslint-disable·eslint-enable·
      // eslint(룰 설정)·globals 전부 무효가 된다.
      noInlineConfig: true,
      reportUnusedInlineConfigs: 'error',
    },
    rules: {
      // noInlineConfig는 주석을 조용히 무시할 뿐이라, 그것만 켜면 "끈 줄 알았는데
      // 안 꺼진" 죽은 주석이 소스에 남는다. 주석 자체를 에러로 만들어 그 상태를
      // 없앤다 — 인가가 필요하면 이 설정 파일에 files 스코프로 적어야 한다.
      '@eslint-community/eslint-comments/no-use': 'error',
    },
  },

  {
    rules: {
      // `_` prefix 식별자는 의도적 미사용으로 간주 (destructuring rest 패턴 등)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // SSG 정적 호스팅(Cloudflare Workers assets)이라 next/image 자체가 비활성 —
    // 의도적 <img> 사용
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },

  // ── Panda 공식 lint (위 pandaRecommended 주석) ─────
  { ...pandaRecommended, ignores: [UNIT_TESTS] },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [UNIT_TESTS],
    rules: { '@pandacss/prefer-token': ['error', PREFER_TOKEN] },
  },
  {
    // 인용·대화의 좌측 강조 바는 의도된 2px다(hairline의 두 배). 글롭이라
    // `[...slug]`의 괄호는 이스케이프한다.
    files: [
      'src/app/posts/\\[...slug\\]/PostBody.tsx',
      'src/components/post/markdown/Dialogue.tsx',
    ],
    rules: {
      '@pandacss/prefer-token': [
        'error',
        { ...PREFER_TOKEN, allow: ['[2px]'] },
      ],
    },
  },

  // ── 아키텍처 경계 강제 (헥사고날 레이어링: app → domain → lib/platform → shared,
  // 전부 src/ 안의 형제 폴더) ─────
  // 경계를 컨벤션이 아니라 lint로 강제해 회귀를 막습니다. import **방향**은
  // 아래 boundaries 블록이 전담한다 — 해석된 경로 기반이라 alias·상대경로 어느
  // 쪽도 우회할 수 없다. (예전에는 경로 문자열 기반 no-restricted-imports 블록이
  // 방향을 이중으로 막았지만, 레이어가 전부 src/ 안으로 들어오면서 상대경로에
  // `src` 세그먼트가 사라져 그 방식으로는 방향을 표현할 수 없다.)
  // 이 블록들은 boundaries가 못 보는 결을 맡는다 — 배럴 강제(같은 element 안의
  // 파일 단위)와 모듈 모양. Supabase SDK를 누가 여는지는 경로 문제라 boundaries가 본다.
  {
    // app 레이어(src에서 레이어 폴더 제외)는 domain/<x>의 공개 API(배럴)만 쓰고,
    // repository(인프라)를 직접 찌르지 않습니다.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/{shared,domain,lib}/**', UNIT_TESTS],
    rules: {
      // `**/` 접두로 alias(@/src/domain/...)와 상대경로(../../domain/...) 양쪽을 차단.
      // `paths`는 큰 배럴·SEO 문 값 import 금지와 next/link 직접 import 금지 — flat config는 뒤
      // 블록이 룰 옵션을 통째로 덮으므로 한 룰 설정에 함께 둔다.
      'no-restricted-imports': [
        'error',
        {
          ...APP_IMPORTS_EXCEPT_NEXT_LINK,
          paths: [...APP_IMPORTS_EXCEPT_NEXT_LINK.paths, NEXT_LINK_DIRECT],
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...APP_SYNTAX_EXCEPT_INTERACTION,
        NO_LOCAL_INTERACTION,
      ],
    },
  },
  {
    // 누름·초점 조건을 쓰는 파일(INTERACTION_FILES) — 그 룰만 풀고 나머지는 위 app 블록과 같다
    // (같은 `APP_SYNTAX_EXCEPT_INTERACTION`에서 다시 펼친다).
    files: INTERACTION_FILES,
    ignores: [UNIT_TESTS],
    rules: {
      'no-restricted-syntax': ['error', ...APP_SYNTAX_EXCEPT_INTERACTION],
    },
  },
  {
    // next/link를 바로 여는 것이 허용된 파일(NEXT_LINK_FILES의 사유) — 그 금지만 풀고 나머지는
    // 위 app 블록과 같다(뒤 블록이 옵션을 통째로 덮으므로 같은 값에서 다시 펼친다).
    files: NEXT_LINK_FILES,
    ignores: [UNIT_TESTS],
    rules: {
      'no-restricted-imports': ['error', APP_IMPORTS_EXCEPT_NEXT_LINK],
    },
  },
  {
    // 위 app 블록이 덮지 않는 파일에도 같은 금지를 건다 — 레이어 폴더와, src 밖이지만
    // 클라이언트 컴포넌트가 여는 content.values.mts. repository 패턴은 app 레이어의
    // 규칙이라 여기엔 없다.
    files: ['src/{shared,domain,lib}/**/*.{ts,tsx}', 'content.values.mts'],
    ignores: [UNIT_TESTS],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [CONTENT_BARREL_VALUES, CONTENT_SEO_VALUES, NEXT_LINK_DIRECT],
        },
      ],
      // 정적 import만 막으면 동적 import로 같은 문이 열린다 — app 블록과 같은 짝으로 건다.
      'no-restricted-syntax': ['error', NO_ESCAPED_HEX, CONTENT_DYNAMIC_IMPORT],
    },
  },
  {
    // 테스트는 node에서만 돈다 — SEO 빌더를 직접 검사하므로 SEO 문은 연다. 배럴 값은
    // 프로덕션과 같은 문으로 연다.
    files: [UNIT_TESTS],
    rules: {
      'no-restricted-imports': ['error', { paths: [CONTENT_BARREL_VALUES] }],
    },
  },
  {
    // 배럴에만 있는 값이 필요한 서버 전용 파일 — 배럴·SEO 문 금지만 풀고 repository·next/link
    // 금지는 그대로 둔다(뒤 블록이 옵션을 통째로 덮으므로 다시 적는다).
    files: SERVER_ONLY_BARREL_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [NEXT_LINK_DIRECT], patterns: [REPOSITORY_IMPORT_PATTERN] },
      ],
    },
  },
  {
    // 공개 페이지가 여는 배럴은 모듈 최상위에 부수효과를 두지 않습니다.
    // 번들러가 부수효과로 보는 순간, 거기 매달린 모듈 전부를 공개 청크에서
    // 떨궈내지 못합니다 — #326에서 `new AnalyticsService()` 하나가 계산 모듈
    // 전체를 모든 공개 페이지에 실었습니다. 싱글톤 생성은 admin 전용 배럴
    // (src/domain/*/admin.ts, src/domain/auth/index.ts)의 일이라 그쪽은 대상이 아닙니다.
    // 새 공개 배럴이 생기면 이 files 목록에 추가하세요. 산출물 쪽 안전망은
    // `pnpm build` 마지막의 check-bundle(마커 검사)이 맡습니다 — 이 룰은 원인을,
    // 그쪽은 결과를 봅니다.
    files: ['src/domain/analytics/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        NO_ESCAPED_HEX,
        CONTENT_DYNAMIC_IMPORT,
        {
          selector: 'Program > ExpressionStatement > NewExpression',
          message:
            '공개 배럴의 모듈 최상위 부수효과는 공개 청크 누수를 만듭니다. 싱글톤 생성은 admin 배럴로 옮기세요.',
        },
        {
          selector: 'Program > ExpressionStatement > CallExpression',
          message:
            '공개 배럴의 모듈 최상위 부수효과는 공개 청크 누수를 만듭니다. 호출이 필요하면 소비자 쪽으로 옮기세요.',
        },
        {
          selector:
            ':matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > NewExpression.init',
          message:
            '공개 배럴의 모듈 최상위 new는 번들러에 부수효과입니다. 싱글톤 생성은 admin 배럴로 옮기세요.',
        },
        {
          selector:
            ':matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > CallExpression.init',
          message:
            '공개 배럴의 모듈 최상위 호출은 번들러에 부수효과입니다. 값이 필요하면 소비자 쪽에서 만드세요.',
        },
        // default export 경로도 막는다 — `export default new X()`는 위 두 계열
        // (표현식문·변수 초기화) 어느 쪽에도 매치되지 않는다(리뷰 지적).
        {
          selector: 'Program > ExportDefaultDeclaration > NewExpression',
          message:
            '공개 배럴의 모듈 최상위 new는 번들러에 부수효과입니다. 싱글톤 생성은 admin 배럴로 옮기세요.',
        },
        {
          selector: 'Program > ExportDefaultDeclaration > CallExpression',
          message:
            '공개 배럴의 모듈 최상위 호출은 번들러에 부수효과입니다. 값이 필요하면 소비자 쪽에서 만드세요.',
        },
      ],
    },
  },
  {
    // shared(최하단)의 import 방향(상위 레이어 금지, 외부는 @blog/content만)은
    // 아래 boundaries가 강제한다. 이 블록은 모듈의 **모양**을 잠근다 —
    // shared는 **모든 레이어가 여는 유일한 폴더**라, 여기 뚫린 구멍은 앱 전체가
    // 공유하기 때문이다:
    //
    // (1) 재수출 금지 — `export … from` / `export * from`은 shared를 다른 모듈의
    //     2차 문으로 만드는 세탁 통로다. 특히 @blog/content 재수출은 배럴 값
    //     import 금지(CONTENT_BARREL_VALUES — 지정자 문자열로 판정한다)와
    //     클라이언트 문 구분을 한 겹 건너 우회하는 길이 된다. shared는 자기
    //     선언만 내보낸다 — 패키지가 필요하면 소비자가 직접 연다.
    // (2) 모듈 최상위 문(statement) 금지 — 어디서나 import되는 모듈이라 부수효과가
    //     생기면 모든 청크에 함께 실린다(공개 배럴 규칙과 같은 이유). 'use client'
    //     지시문도 여기 걸린다 — shared는 클라이언트 경계가 아니다. 파생 상수의
    //     순수 함수 호출(`export const X = f(Y)`)은 문이 아니라 초기화라 걸리지
    //     않는다.
    files: ['src/shared/**/*.{ts,tsx}'],
    ignores: [UNIT_TESTS],
    rules: {
      'no-restricted-syntax': [
        'error',
        NO_ESCAPED_HEX,
        CONTENT_DYNAMIC_IMPORT,
        {
          selector: 'ExportAllDeclaration',
          message:
            'shared에서 재수출(export * from)은 금지입니다 — shared가 다른 모듈의 2차 문이 되어 경계·배럴 최적화를 우회합니다. 자기 선언만 내보내세요.',
        },
        {
          selector: 'ExportNamedDeclaration[source]',
          message:
            'shared에서 재수출(export … from)은 금지입니다 — 필요한 쪽이 원본 모듈을 직접 여세요.',
        },
        {
          selector: 'Program > ExpressionStatement',
          message:
            'shared 모듈 최상위에는 문(statement)을 두지 않습니다 — 모든 레이어에 실려 가는 모듈이라 부수효과·지시문(use client)이 앱 전체에 퍼집니다.',
        },
      ],
    },
  },
  {
    // shared에는 컴포넌트가 없다 — .tsx 자체를 막는다. JSX 자동 런타임은 react
    // import 없이 컴파일되므로 boundaries의 외부 의존 차단만으로는 못 잡는다.
    // 컴포넌트는 src/, 여러 화면이 공유하는 컴포넌트도 src/components/shared/다.
    files: ['src/shared/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        NO_ESCAPED_HEX,
        CONTENT_DYNAMIC_IMPORT,
        {
          selector: 'Program',
          message:
            'shared에는 .tsx(컴포넌트)를 두지 않습니다 — 순수 계약(.ts)만. 공유 컴포넌트는 src/components/shared/로.',
        },
      ],
    },
  },
  {
    // 타입은 항상 `import type`으로 — isolatedModules 정확성 + 번들 누수 예방.
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
    },
  },

  // ── 타입이 말하는 만큼만 믿는다 ────────────────────────────────────────────
  // no-unsafe-type-assertion: `as T`가 값을 더 좁은 타입으로 주장하면(any에서 나오는
  // 단언 포함) 확인하지 않은 계약이 붙는다 — env·JSON·any로 선언된 라이브러리를 받는
  // 자리에서 조용히 샌다. 좁히기는 런타임 확인(@blog/content의 isRecord·isStringArray
  // 같은 가드, typeof)으로 한다. 넓히는 단언과 `as const`는 막지 않는다.
  // no-unnecessary-condition: 타입상 일어날 수 없는 분기(죽은 폴백·`?.`)를 막는다. 걸리면
  // 둘 중 하나다 — 정말 죽은 검사라 지우거나, 런타임이 타입보다 넓은데 타입이 거짓말을
  // 하는 것이라 경계에서 값을 좁히거나 타입을 넓힌다(검사를 지우는 쪽이 아니다).
  // 재평가: 2027-04-17 — 그때까지 잡은 위반이 없는 규칙은 내린다(AGENTS.md §5).
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
    },
  },
  // no-unnecessary-type-parameters: 반환 타입에만 쓰이는 제네릭(`f<T>(): T`)은 호출자가 고른 타입을
  // 확인 없이 붙이는 숨은 단언이다 — no-unsafe-type-assertion이 못 보는 같은 구멍. ban-ts-comment:
  // 프로덕션에서는 설명을 단 @ts-expect-error도 막는다(타입 에러를 주석으로 넘기는 길). 테스트의 음성
  // 타입 테스트는 프리셋 그대로 연다. 둘 다 켤 때 위반 0건. 재평가: 2027-04-22.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-parameters': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: TEST_FILES,
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true },
      ],
    },
  },
  {
    // 테스트는 연다 — fixture·mock을 만드는 단언과 방어 검사가 대부분이고 프로덕션으로
    // 새지 않는다. 테스트 tsconfig가 엄격 플래그를 푸는 것과 같은 선이다.
    files: TEST_FILES,
    rules: {
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  // ── 레이어 경계 (eslint-plugin-boundaries) ─────────────────────────────────
  // element는 전부 **폴더 단위**다. `boundaries/files` 카테고리로 파일을 골라
  // element를 우회 배정하는 뒷문을 열지 않는다 — 폴더에 새 파일이 떨어지면
  // 자동으로 그 element를 상속한다.
  //
  // 레이어 순서(아래→위): shared → platform → analytics·auth → app. 전부 src/
  // 안의 형제 폴더이고, app은 src에서 레이어 폴더를 뺀 나머지(app·components·
  // hooks·styles·content.ts)다. shared는 모든 레이어가 쓸 수 있는 최하단(라우트
  // 상수 등 순수 계약)이다. 콘텐츠 레이어는 packages/@blog/content로 이사했다 —
  // 그쪽 eslint.config.mjs가 같은 모델로 내부 경계를 강제하고, 앱에서는
  // `@blog/content`가 외부 패키지(external)로 보인다.
  //
  // 이 블록 전체는 **src/에만** 건다. 전역으로 걸면 앱 루트의 설정 파일들이
  // 전부 unknown이 되고, 오탐 시 탈출구가 없다.
  {
    files: ['src/**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    plugins: { boundaries },
    settings: {
      // 기준 경로가 **워크스페이스 루트**인 이유: @blog/content는 소스
      // 익스포트라 import가 pnpm 심링크 realpath(packages/@blog/content/src/…)
      // 로 해석된다. 기준이 앱 루트면 그 경로가 `../../../packages/…`가 되는데
      // micromatch의 `**`는 `..` 세그먼트를 건너지 못해 패키지 파일을 어떤
      // element에도 배정하지 못하고, 반대로 folder 패턴('src')은 경로 어디서든
      // 매치라 엉뚱하게 app으로 배정된다. 루트를 워크스페이스로 올리고 모든
      // 패턴을 앱 경로로 앵커해 둘 다 피한다. (lint 실행 cwd 비의존인 것은
      // 예전과 같다 — next.rootDir 주석 참고.)
      'boundaries/root-path': resolve(import.meta.dirname, '..', '..', '..'),
      'boundaries/elements-single-match': true,
      // v7에서 folder 매칭이 기본이라 mode는 쓰지 않는다.
      //
      // **배열 순서가 곧 우선순위다** — single-match는 첫 매치에서 멈추므로,
      // src 폴백(app)보다 구체 패턴(src/shared 등)이 반드시 앞에 와야 한다.
      // 순서가 뒤집히면 레이어 파일이 전부 app으로 배정돼 경계가 조용히 죽는다.
      'boundaries/elements': [
        { type: 'content-pkg', pattern: 'packages/@blog/content' },
        { type: 'shared', pattern: 'apps/blog/web/src/shared' },
        { type: 'platform', pattern: 'apps/blog/web/src/lib/platform' },
        { type: 'analytics', pattern: 'apps/blog/web/src/domain/analytics' },
        { type: 'auth', pattern: 'apps/blog/web/src/domain/auth' },
        // 레이어 부모 폴더 직속(src/lib·src/domain 바로 아래)에 떨어진 파일의
        // 격리 element — 예전 no-unknown-files가 잡던 자리다. 어떤 policy에도
        // 없으므로 이 파일이 무언가를 import하거나 import되는 순간 에러가 난다.
        {
          type: 'layer-root',
          pattern: ['apps/blog/web/src/lib', 'apps/blog/web/src/domain'],
        },
        // src 밖인데 src가 여는 로컬 대상. element가 없으면 boundaries는 이 import를
        // "모르는 파일"로 보고 정책 검사 없이 통과시킨다 — default disallow가 닿지
        // 않는다. 누가 열 수 있는지는 아래 policies에 적는다.
        { type: 'styled-system', pattern: 'packages/@blog/styled-system' },
        { type: 'preset', pattern: 'packages/@blog/preset' },
        // src 폴백 — 위 어디에도 안 걸린 src 파일은 전부 app 레이어다.
        { type: 'app', pattern: 'apps/blog/web/src' },
        // 앱 루트(src 밖의 설정·값 파일·e2e). app보다 뒤에 둬야 src 파일이 여기로
        // 빠지지 않는다. 이 폴더 안에서 src가 열어도 되는 파일은 아래 files
        // 카테고리로만 고른다 — 루트에 새 파일이 생기면 열리지 않는 쪽이 기본이다.
        { type: 'app-root', pattern: 'apps/blog/web' },
      ],
      // 테스트는 element 배정은 그대로 두고 파일 카테고리 축으로만 표시한다.
      // 아래 policies 마지막 두 줄이 "테스트는 전부 import 가능 / 프로덕션은
      // 테스트를 import 불가"를 만든다 — 예전 ignores 방식보다 후자가 공짜다.
      // 앱 루트의 두 파일도 카테고리로 표시한다. element를 바꾸는 게 아니라 app-root
      // 안에서 허용할 대상을 좁히는 표시다.
      'boundaries/files': [
        { category: 'test', pattern: ['**/*.test.*', '**/*.spec.*'] },
        {
          category: 'content-values',
          pattern: 'apps/blog/web/content.values.mts',
        },
        {
          category: 'content-config',
          pattern: 'apps/blog/web/content.config.mts',
        },
      ],
      // 'export'를 포함해 배럴의 `export * from`도 의존성으로 센다 — 안 세면
      // 배럴 한 줄로 모든 경계를 우회할 수 있다(src/components에 배럴 3개).
      'boundaries/dependency-nodes': ['import', 'dynamic-import', 'export'],
    },
    rules: {
      // no-unknown-files는 뺐다 — app이 src 전체의 폴백 element라 unknown 파일이
      // 존재할 수 없어 죽은 게이트가 된다. 스트레이 파일 방어는 layer-root
      // 격리 element(위)가 잇는다.
      //
      // 반대 방향(src가 어떤 element에도 없는 로컬 파일을 import)은 막는다. 안 막으면
      // 그 import는 dependencies 정책을 건너뛰어, shared가 설정 객체를 열거나 app이
      // next.config를 열어도 조용히 통과한다. 새 로컬 대상은 element로 등록하고
      // 정책에 적어야 열린다. 재평가: 2027-04-17 — 그때까지 잡은 것이 없으면 내린다.
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // 로컬 element 간 의존뿐 아니라 외부 패키지·node 코어까지 전부 검사
          // 대상으로 — 레이어별 외부 화이트리스트가 아래 policies다.
          checkAllOrigins: true,
          // 같은 element 안의 import도 검사한다. 테스트가 프로덕션 파일과 같은
          // 폴더(=같은 element)에 살기 때문에, 이걸 꺼 두면 "프로덕션이 테스트를
          // import 금지"가 가장 흔한 사고(옆자리 *.test.ts import)를 못 잡는다.
          checkInternals: true,
          // 평가 규칙: 마지막으로 매치된 policy가 승패를 정한다(last-write-wins).
          policies: [
            // 같은 element 안에서는 자유 — 단, 아래 "테스트 import 금지"가
            // 뒤에 오므로 같은 폴더라도 프로덕션→테스트는 막힌다.
            {
              dependency: { relationship: { from: 'internal' } },
              allow: { to: { module: { origin: '*' } } },
            },
            // 로컬 의존: 각 레이어는 자기보다 아래 레이어만. 외부 의존: 실측
            // 화이트리스트(레이어에 새 외부 의존이 생기면 여기 추가해야 한다).
            // @blog/content는 여기서 외부 패키지다 — analytics가 패키지 유틸
            // (dates)을 그 문으로 가져온다.
            {
              // shared(최하단)는 앱 내부 어디에도 기대지 않는다 — 패키지의
              // 라우트 계약(encodePostSlug·POSTS_PATH)만 가져온다.
              from: { element: { type: 'shared' } },
              allow: [
                { to: { element: { types: { anyOf: ['content-pkg'] } } } },
              ],
            },
            {
              from: { element: { type: 'platform' } },
              allow: [
                { to: { element: { types: { anyOf: ['shared'] } } } },
                {
                  to: {
                    module: {
                      origin: 'external',
                      source: [
                        '@supabase/supabase-js',
                        '@supabase/postgrest-js',
                      ],
                    },
                  },
                },
              ],
            },
            {
              from: { element: { type: 'analytics' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['shared', 'platform', 'content-pkg'] },
                    },
                  },
                },
              ],
            },
            {
              // auth는 세션 API(client.auth)를 만지는 유일한 레이어다 —
              // supabase 타입도 여기서 끝내므로(구조적 부분형) 외부 의존이 없다.
              from: { element: { type: 'auth' } },
              allow: [
                {
                  to: { element: { types: { anyOf: ['shared', 'platform'] } } },
                },
              ],
            },
            {
              // app은 node 코어를 직접 만지지 않는다 — fs 접근은 전부
              // @blog/content(로더)의 일이다(클라이언트 번들 누수 예방,
              // 계획의 "배럴이 fs를 끌고 온다" 회귀 참고).
              //
              // platform도 직접 만지지 않는다 — Supabase 접근은 전부 도메인
              // 레이어(analytics·auth) 경유다. 예전에는 auth 세 파일(가드·
              // 로그아웃·로그인)이 예외로 client를 직접 import했고, 그걸 막던
              // no-restricted-syntax는 변수 이름 기반이라 alias로 우회 가능했다.
              // 여기서 import 경로 자체를 끊으면 우회가 없다.
              //
              // 사이트 값(content-values)·스타일 런타임(styled-system)·설정
              // 인스턴스(content-config)는 app만 연다. content-config는 서버
              // 파일만 써야 하지만 element는 폴더 단위라 여기서 가르지 못한다 —
              // 클라이언트로 새면 check-bundle의 llms 마커가 빌드에서 잡는다.
              // preset은 panda 설정이 이름으로 읽을 뿐 src가 열 일이 없다.
              from: { element: { type: 'app' } },
              allow: [
                {
                  to: {
                    element: {
                      types: {
                        anyOf: [
                          'shared',
                          'analytics',
                          'auth',
                          'content-pkg',
                          'styled-system',
                        ],
                      },
                    },
                  },
                },
                {
                  to: {
                    element: { type: 'app-root' },
                    file: {
                      categories: {
                        anyOf: ['content-values', 'content-config'],
                      },
                    },
                  },
                },
                { to: { module: { origin: 'external' } } },
              ],
            },
            {
              // Supabase SDK는 platform만 연다. app은 외부 패키지를 목록 없이 열 수
              // 있으므로, 여기서 끊지 않으면 컴포넌트가 SDK로 클라이언트를 직접 만들어
              // 도메인 레이어를 건너뛴다. 다른 레이어는 외부 허용 목록에 SDK가 없어
              // 이미 막혀 있다. 마지막 매치가 이기므로 app 정책보다 뒤에 둔다.
              from: { element: { type: 'app' } },
              disallow: {
                to: { module: { origin: 'external', source: '@supabase/**' } },
              },
            },
            // 프로덕션 코드는 테스트 파일을 import할 수 없다.
            { disallow: { to: { file: { categories: 'test' } } } },
            // 테스트는 무엇이든 import할 수 있다(마지막 매치가 이기므로
            // 바로 위 정책보다 뒤에 둬야 테스트→테스트도 허용된다).
            {
              from: { file: { categories: 'test' } },
              allow: { to: { module: { origin: '*' } } },
            },
          ],
        },
      ],
    },
  },
]);
