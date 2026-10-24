import { defineConfig, definePlugin } from '@pandacss/dev';
import { TEST_SUFFIX } from './testFiles.mts';
import {
  NAV_TRANSITION,
  POST_SHARED,
  POST_SHARED_SIDE,
  VIEW_TRANSITION,
} from './src/shared/viewTransitions';

// 색·라운드는 전부 @blog/preset에서 온다(AGENTS.md §9). preset-panda는 spacing·sizes·fontSizes 같은
// 스케일만 빌리고 색 팔레트와 radii는 버린다 — v2의 팔레트(oklch 26색 × 11단)는 v1의 두 배 무게로
// 토큰 레이어에 통째로 실렸고(쓰는 곳 0), strictTokens가 `orange.500` 같은 팔레트 밖 색을 통과시켰다.
// radii는 블로그 토큰과 같은 값을 다른 이름으로 들고 있어(lg=8px=inner, xl=12px=element,
// 2xl=16px=container, 4xl=32px=page) 같은 라운드가 이름 둘 이상(`'lg'`·`'inner'`·`'[8px]'`)으로 갈린다.
// shadows도 버린다 — 블로그 그림자는 떠 있는 표면의 `overlay.*` 둘뿐이라(AGENTS.md §9) preset-panda의
// 변수 11개는 쓰는 곳이 0인데 토큰 레이어에 실렸고, `boxShadow: 'md'`가 타입을 통과했다. @blog/preset의
// `shadows.overlay.*`가 있어 카테고리가 비지 않는다. 모션(durations·easings·animations·keyframes)도
// 버린다 — preset-panda의 `fast`(150ms)가 블로그의 `fast`(175ms, Astryx)와 같은 이름으로 섞이고, 쓰는
// 곳이 0인 단계(`fastest`·`slower` …)와 easings·keyframes(spin·bounce …)가 타입을 통과했다. 세
// 카테고리는 @blog/preset의 모션 토큰이 채운다. textStyles도 버린다 — preset-panda의 `xs`~`9xl`은
// fontSizes와 같은 이름·값에 행간만 붙인 것이라 블로그의 역할 이름(@blog/preset의 `display1`·`body` …)과
// 같은 크기가 두 이름으로 갈리고, 쓰는 곳이 0이었다. 쓰는 곳이 0인 blurs·aspectRatios는 남긴다 — 카테고리가
// 통째로 비면 Panda가 그 속성 타입을 아무 문자열로 넓혀(2.3.0 실측) strictTokens가 풀린다.
// 서드파티 프리셋을 고치지 않고 일부만 빼는 v2 방식이 preset:resolved 훅이다(theming/plugins
// "Trim a preset", theming/presets "extend only adds, so removing takes a plugin"). @blog/preset에
// extend 없는 colors를 두는 길도 v2에서 동작하지만, 그러면 블로그 프리셋이 목록 순서에 묶인다.
// 뺀 토큰을 쓰면 Panda는 진단 없이 raw 값(`color: orange.500`)을 내보낸다 — check-types가 막고,
// 색·라운드·그림자·모션은 Panda 공식 lint(prefer-token, eslint.config.mts)도 막는다.
const trimPresetPanda = definePlugin({
  name: 'blog:trim-preset-panda',
  hooks: {
    'preset:resolved': ({ preset, name, utils }) =>
      name === '@pandacss/preset-panda'
        ? utils.omit(preset, [
            'theme.tokens.colors',
            'theme.semanticTokens.colors',
            'theme.tokens.radii',
            'theme.tokens.shadows',
            'theme.tokens.durations',
            'theme.tokens.easings',
            'theme.tokens.animations',
            'theme.keyframes',
            'theme.textStyles',
          ])
        : undefined,
  },
});

// View Transitions 그룹을 쌓는 순서(아래 globalCss) — 페이지 < 제목 < 커버 < 헤더. 그룹은 z-index가
// 없으면 문서 순서로 쌓인다. 이유는 각 규칙 옆에 있다.
const VT_STACK = {
  title: '1',
  cover: '2',
  siteHeader: '3',
} as const;

// 방향 있는 이동(NAV_TRANSITION)에서 페이지가 미끄러지는 거리와, 그 거리를 의사 요소마다 부호를 붙여
// 넘기는 변수(아래 keyframes·globalCss). 32px인 이유: 나가는 페이지는 이 거리를 fast(175ms) 동안
// 가속하며 걷히고 들어오는 페이지는 그 뒤 fastMax(230ms) 동안 감속하며 다 와서, 거리 전부가 눈에
// 보인다 — Next 가이드의 60px은 들어오는 쪽이 처음부터 미끄러져(400ms) 보이는 몫이 40px 안팎이고,
// Material의 shared axis가 30dp다. 들어오는 페이지의 8px 떠오름(타입 없는 페이드)의 네 배라 방향은
// 읽히고, 375px 화면에서도 폭의 9%라 화면을 가로지르는 움직임이 되지 않는다.
const NAV_SLIDE_PX = 32;
const NAV_SLIDE_OFFSET = '--nav-slide-offset';
const NAV_SLIDE_LEFT = `${-NAV_SLIDE_PX}px` as const;
const NAV_SLIDE_RIGHT = `${NAV_SLIDE_PX}px` as const;

export default defineConfig({
  // Panda 기본 프리셋 + 블로그 프리셋(@blog/preset — 블로그 소유, 컴포넌트 없는 설정 전용 패키지).
  // lab 디자인 시스템(@design-system/ui)은 걸지 않는다(lab 토큰·레시피가 실린다).
  // v2는 프리셋을 자동으로 넣지 않는다(get-started/upgrading-to-v2 "Presets aren't added for
  // you") — v1이 몰래 넣던 preset-base(유틸리티·조건)와 v1의 '@pandacss/dev/presets'(=
  // preset-panda, v2에서 export가 없어졌다)를 명시한다.
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda', '@blog/preset'],
  preflight: true,

  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    // @blog/content는 지금 css()를 쓰지 않지만, 소스 익스포트 패키지라 스타일
    // 사용이 생기는 즉시 스캔 대상이어야 한다 — 선제 등록(누락 시 조용히
    // 스타일이 빠진 채 빌드가 성공한다).
    './node_modules/@blog/content/src/**/*.{js,jsx,ts,tsx}',
  ],
  // 테스트는 스캔하지 않는다 — turbo.json이 테스트를 빌드 입력에서 빼는 전제다(테스트만 바꾼
  // 커밋이 빌드·e2e 캐시를 깨지 않게). 예전엔 픽스처의 JSX prop(`width={750}`)이 스타일로 읽혀
  // 프로덕션 CSS에 쓰레기 규칙도 실었다 — 그 경로는 jsxFramework를 끄며 닫혔다.
  // 앱과 @blog/content(위 include) 양쪽의 테스트라 `**/` 접두다.
  exclude: [`**/${TEST_SUFFIX}`],
  // 디자인 토큰 강제: 임의 색/값 대신 토큰만 허용. 임의값이 꼭 필요하면
  // 대괄호 이스케이프(`'[6px]'`)로 명시적으로 표기한다.
  strictTokens: true,

  // 공식 권장대로 프로덕션에서만 줄인다 — dev에서 생성 CSS를 읽을 수 있게. 최종 out/의 CSS는
  // Next가 한 번 더 줄이므로 배포물 크기는 이 값과 무관하다.
  minify: process.env.NODE_ENV === 'production',
  // optimize(styling/optimization)는 removeUnusedKeyframes만 켠다 — 정의만 있고 아무도 부르지 않는
  // keyframes를 뺀다(preset-panda의 keyframes는 위 플러그인이 이미 버린다). check-bundle의
  // `keyframes-unreferenced`가 이 옵티마이저를 전제로 한다. animations 토큰(`animation: 'skeleton'`)으로
  // 참조한 keyframes는 2.3.0부터 남는다(2.1.2는 그것까지 지웠다). removeUnusedTokens는 codeTheme.ts가
  // 런타임에 고르는 token.var(role)을 못 봐 code.* 변수를 지우므로 켜지 않는다.
  optimize: { removeUnusedKeyframes: true },
  // propertyFallback도 지금은 필요 없다: @property로 등록되는 변수는 backdrop-*뿐이고 빈
  // fallback(`var(--backdrop-blur, )`)이라 @property 미지원 브라우저(Firefox 128 미만)에서도 값이
  // 선다. transform·filter·mask 유틸리티를 쓰기 시작해 out/ CSS에 backdrop 밖의 `@property --`가
  // 생기면 켠다.

  // jsxFramework는 두지 않는다 — 블로그는 Panda JSX(styled·<Box>)를 쓰지 않고, 켜 두면
  // 대문자 컴포넌트의 prop 전부를 스타일 prop으로 읽어(Recharts의 margin·cursor·strokeDasharray)
  // 적용될 일 없는 규칙을 CSS에 싣는다. 끄면 jsx/ 생성물도 없다.

  strictPropertyValues: true,
  // 테마 토글: html[data-theme] 로 라이트/다크 전환. semanticTokens의 _dark
  // 값이 이 조건에서 적용된다. base = 라이트, [data-theme=dark] = 다크.
  conditions: {
    extend: {
      dark: '[data-theme=dark] &',
    },
  },
  // 생성물은 이 설정만 쓰는 전용 패키지로 간다 — 출력 자리 하나에 작성자 하나.
  // 예전엔 lab 설정 셋과 같은 ui-lib에 썼고, 마지막 codegen이 이긴 타입을 블로그가
  // 읽었다. 이 경로를 바꾸면 packages/@blog/styled-system의 build 스크립트도 함께.
  outdir: '../../../packages/@blog/styled-system',
  theme: {
    extend: {
      keyframes: {
        // ReadingProgress(src/components/post/ReadingProgress.tsx)의
        // scroll-driven 진행 바. width 대신 transform: scaleX()를
        // 애니메이션해 컴포지터 스레드만으로 처리되게 한다 — width는
        // 레이아웃을 유발해 스크롤 프레임마다 reflow가 돈다.
        'reading-progress-fill': {
          to: { transform: 'scaleX(1)' },
        },
        // 페이지 전환(아래 globalCss의 ::view-transition-* 규칙). 이름은 PageBoundary가 붙이는
        // 클래스와 같은 출처다. 방향 없는 이동(같은 깊이·검색 결과)의 페이드 — 들어오는 페이지는
        // 8px(Astryx spacing-2) 아래에서 떠오르고, 나가는 페이지는 제자리에서 사라진다. 방향 있는
        // 이동은 아래 navSlideOut·navSlideIn이다(브라우저 뒤로·앞으로 가기에는 페이지 전환이 아예
        // 돌지 않아 방향도 링크 이동에서만 보인다).
        [VIEW_TRANSITION.pageEnter]: {
          from: { opacity: '0', transform: 'translateY(8px)' },
        },
        [VIEW_TRANSITION.pageExit]: {
          to: { opacity: '0' },
        },
        // 공유 요소의 나타나는 스냅샷(아래 globalCss — 들어오는 제목, 상세 → 카드의 카드 커버).
        // 자리는 그룹이 옮기므로 투명도만 올린다. 사라지는 쪽은 pageExit을 같이 쓴다.
        [VIEW_TRANSITION.sharedFadeIn]: {
          from: { opacity: '0' },
        },
        // 커버 짝의 바닥 스냅샷 모서리(아래 globalCss). 카드 쪽 끝은 카드 라운드 중 가장 큰
        // container다 — 썸네일 행(element)·/posts 카드(위 모서리만)는 그 끝에서 위에 덮인 카드
        // 스냅샷이 더 많이 깎여 있어 바닥이 모서리 밖으로 비치지 않는다. 상세 쪽 끝은 아래
        // 규칙의 정지값(히어로와 같은 element)이다.
        [VIEW_TRANSITION.coverCornerFromCard]: {
          from: { borderRadius: 'container' },
        },
        [VIEW_TRANSITION.coverCornerToCard]: {
          to: { borderRadius: 'container' },
        },
        // 방향 있는 이동의 페이지(아래 globalCss의 NAV_TRANSITION 규칙). 투명도와 자리를 한 keyframes에
        // 묶는다 — 한 쪽(나감·들어옴)의 둘은 시간·곡선이 같다. 어느 쪽으로 미끄러지는지는 의사 요소가
        // 주는 거리 변수의 부호다(Next view-transitions 가이드의 `--slide-offset`).
        [VIEW_TRANSITION.navSlideOut]: {
          to: {
            opacity: '0',
            transform: `translateX(var(${NAV_SLIDE_OFFSET}))`,
          },
        },
        [VIEW_TRANSITION.navSlideIn]: {
          from: {
            opacity: '0',
            transform: `translateX(var(${NAV_SLIDE_OFFSET}))`,
          },
        },
      },
    },
  },
  globalCss: {
    extend: {
      html: {
        // v2 리셋이 읽는 전역 변수(styling/global-styles "Exposed global CSS variables") — 리셋
        // 규칙을 따로 덮어쓰지 않고 값만 넘긴다. 리셋은 html에 `font-family:
        // var(--global-font-body, …)`, `::selection`에 `var(--global-color-selection, …)`를 건다.
        '--global-font-body': 'fonts.sans',
        // 드래그 선택은 배경만 바꾸고 **글자색은 건드리지 않는다.** 예전엔 `bg: ink.border` +
        // `color: ink.900`이었는데 ink.border(알파 10% 검정)는 흰 지면에서 1.25:1로 묽어 선택한
        // 티가 안 났고, 코드 블록(어두운 표면)에서는 글자만 ink.900으로 강제돼 대비 1.29:1 —
        // 드래그하면 코드가 사라졌다. 색을 강제하지 않으면 링크·제목·구문 강조가 선택 중에도
        // 제 색을 유지한다. 테마와 무관하게 어두운 표면은 CodeBlock.tsx가 자기 ::selection을 덮는다.
        '--global-color-selection': 'colors.selection.bg',
        bg: 'paper.50',
        color: 'ink.950',
        // 움직임 줄이기를 켠 사용자에게는 스크롤을 미끄러뜨리지 않는다.
        '@media (prefers-reduced-motion: no-preference)': {
          scrollBehavior: 'smooth',
        },
        // Firefox는 ::-webkit-scrollbar 의사요소를 받지 않는다. 아래 webkit
        // 규칙과 같은 결과를 표준 속성으로 한 번 더 준다.
        scrollbarWidth: 'thin',
        scrollbarColor: 'token(colors.ink.border) transparent',
        // GitHub 폼: 본문/UI 가독성 + 한글 글머리 keep-all.
        wordBreak: 'keep-all',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        // <details> 펼침 애니메이션 전제. ::details-content의 block-size를
        // 0 ↔ auto로 전환하려면 auto 키워드 보간이 필요하다. 실제 전환
        // 규칙은 본문 prose 스타일(posts/[...slug]/PostBody.tsx)에 있고,
        // 미지원 브라우저는 애니메이션 없이 즉시 펼쳐지므로 기능 손실은 없다.
        interpolateSize: 'allow-keywords',
        // color-scheme: 네이티브 컨트롤/스크롤바를 테마에 맞춘다
        colorScheme: 'light',
        '&[data-theme=dark]': {
          colorScheme: 'dark',
        },
      },
      // `transition: 'colors'` 같은 Panda 전환 유틸리티는 `var(--transition-prop, 속성 목록)`·
      // `var(--transition-duration, 150ms)`·`var(--transition-easing, …)`를 낸다. 시간·곡선 변수에는
      // 토큰을 주고, 속성 변수는 `initial`(무효 값)로 비워 유틸리티의 속성 목록이 쓰이게 한다.
      // html이 아니라 모든 요소에 두는 이유: `transitionDuration`·`transitionTimingFunction`·
      // `transitionProperty` 유틸리티가 이 변수를 그 요소에 직접 쓰는데, 상속되면 자손의 전환까지
      // 그 값이 된다 — 시트의 medium이 안쪽 링크로, 검색 패널의 `opacity, transform`이 결과 행의
      // `transition: 'colors'`로 내려가 hover 색 전환이 사라졌다. 요소마다 다시 정하면 상속이
      // 끊긴다. base 레이어라 같은 요소의 유틸리티(utilities 레이어)가 이긴다.
      '*, ::before, ::after': {
        '--transition-prop': 'initial',
        '--transition-duration': 'durations.fast',
        '--transition-easing': 'easings.standard',
      },
      // ── View Transitions — 내비게이션의 페이지 전환과 테마 전환이 같은 의사 요소를 쓴다 ──
      // 전환 레이어가 포인터를 삼키지 않게 한다 — 이름 없는 내용(푸터·고정 버튼)은 전환 중에도
      // 클릭을 받는다. 이름 붙은 참여자 — 헤더와, `<ViewTransition>`이 이름을 붙이는 페이지·
      // 공유 요소 — 는 전환이 끝날 때까지 히트 테스트에서 빠진다(Next view-transitions 가이드 "Keeping the page
      // interactive", 실측) — 전환을 짧게 두는 이유 중 하나다.
      '::view-transition': {
        pointerEvents: 'none',
      },
      // 페이지 전환 — PageBoundary(React <ViewTransition>)가 방향 없는 이동(같은 깊이의 형제 이동·
      // 검색 결과)에 붙이는 클래스. 나가는 쪽은 빨리 비키고(fast·exit 곡선), 들어오는 쪽은 천천히
      // 자리 잡는다(medium·standard).
      [`::view-transition-old(.${VIEW_TRANSITION.pageExit})`]: {
        animationName: VIEW_TRANSITION.pageExit,
        animationDuration: 'fast',
        animationTimingFunction: 'exit',
        animationFillMode: 'both',
      },
      [`::view-transition-new(.${VIEW_TRANSITION.pageEnter})`]: {
        animationName: VIEW_TRANSITION.pageEnter,
        animationDuration: 'medium',
        animationTimingFunction: 'standard',
        animationFillMode: 'both',
      },
      // 방향 있는 이동 — 링크 이동의 transition type이 nav-forward·nav-back이면 PageBoundary가 위
      // 페이드 대신 type과 같은 이름의 클래스를 붙인다(TransitionLink가 앱의 계층으로 고른다). 나가는
      // 페이지는 페이드와 같은 fast·exit로 가속하며 걷히면서 밀려나고, 들어오는 페이지는 그 뒤에(fast
      // 지연) fastMax·standard로 감속하며 들어온다 — 공유 요소의 제목과 같은 박자이고, 합(405ms)이
      // 그룹의 medium과 거의 같아 카드에서 열 때 커버·제목·본문이 함께 자리에 닿는다. 투명도를
      // 순서대로(나감 뒤 들어옴) 두는 것은 가이드와 같다 — 나가는 내용이 들어오는 내용과 시선을
      // 다투지 않게. 가이드와 다른 점은 들어오는 쪽의 **자리**도 지연한다는 것이다: 가이드는 양쪽
      // 슬라이드를 0ms부터 함께 돌리는데, standard는 앞에 몰린 감속 곡선이라 그대로면 투명도가 올라올
      // 때 이미 거리의 대부분을 와 있어 방향이 안 보이고, 같은 쪽으로 미끄러지는 두 페이지의 글자가
      // 겹쳐 보인다. 헤더는 이름이 따로라 미끄러지지 않고 아래 크로스페이드 그대로다.
      [`::view-transition-old(.${NAV_TRANSITION.forward}), ::view-transition-old(.${NAV_TRANSITION.back})`]:
        {
          animationName: VIEW_TRANSITION.navSlideOut,
          animationDuration: 'fast',
          animationTimingFunction: 'exit',
          animationFillMode: 'both',
        },
      [`::view-transition-new(.${NAV_TRANSITION.forward}), ::view-transition-new(.${NAV_TRANSITION.back})`]:
        {
          animationName: VIEW_TRANSITION.navSlideIn,
          animationDuration: 'fastMax',
          animationDelay: 'fast',
          animationTimingFunction: 'standard',
          animationFillMode: 'both',
        },
      // 왼쪽 — 앞으로 갈 때 나가는 페이지가 밀려나는 쪽, 뒤로 갈 때 들어오는 페이지가 오는 쪽.
      [`::view-transition-old(.${NAV_TRANSITION.forward}), ::view-transition-new(.${NAV_TRANSITION.back})`]:
        {
          [NAV_SLIDE_OFFSET]: NAV_SLIDE_LEFT,
        },
      // 오른쪽 — 그 반대.
      [`::view-transition-new(.${NAV_TRANSITION.forward}), ::view-transition-old(.${NAV_TRANSITION.back})`]:
        {
          [NAV_SLIDE_OFFSET]: NAV_SLIDE_RIGHT,
        },
      // 테마 전환 — View Transitions API(useTheme)로 전체 페이지를 한 번의 컴포지터
      // 크로스페이드로 전환한다. 예전엔 html.theme-transition * 로 모든 요소에 color/fill
      // transition을 걸어, 차트·코드 하이라이팅이 많은 페이지(analytics 등)에서 요소 수만큼
      // style/paint가 터져 버벅였다. 스냅샷 크로스페이드는 요소 수와 무관하게 GPU에서 처리돼
      // 매끄럽다. 헤더는 이름이 있어 루트와 따로 찍히므로 같은 시간을 준다(안 주면 UA 기본
      // 0.25s ease로 루트와 어긋난다). 그룹(위치·크기 보간)까지 토큰으로 줘야 움직임 줄이기에서
      // UA 기본 0.25s가 남지 않는다. 내비게이션에서도 같은 규칙이 루트(페이지 밖 — 푸터·고정
      // 버튼)와 헤더의 크로스페이드를 맡는다. (useTheme는 움직임 줄이기·미지원 브라우저에서
      // 즉시 전환하므로 그때는 이 의사 요소가 생기지 않는다.)
      [`::view-transition-group(root), ::view-transition-old(root), ::view-transition-new(root), ::view-transition-group(${VIEW_TRANSITION.siteHeader}), ::view-transition-old(${VIEW_TRANSITION.siteHeader}), ::view-transition-new(${VIEW_TRANSITION.siteHeader})`]:
        {
          animationDuration: 'fastMax',
          animationTimingFunction: 'standard',
        },
      // 헤더 그룹을 맨 위에 그린다(VT_STACK) — 그룹은 문서 순서로 쌓여 헤더가 아래로 가고, 스크롤된
      // 채 떠나는 페이지가 sticky 헤더 자리에 덧칠된다. 공유 요소보다도 위다: 헤더 밑에 반쯤 가린 채
      // 눌린 카드의 스냅샷은 가려진 부분까지 찍혀 있어, 헤더보다 위면 첫 프레임에 헤더를 덮는다.
      // 배경은 불투명 지면이다: 헤더의 반투명 배경(paper.50/80)은 backdrop-filter 흐림과 한 짝인데,
      // 따로 찍힌 스냅샷에는 흐릴 뒤 배경이 없어 그대로 두면 전환 동안 뒤 본문이 선명하게 비친다.
      [`::view-transition-group(${VIEW_TRANSITION.siteHeader})`]: {
        zIndex: VT_STACK.siteHeader,
        bg: 'paper.50',
      },
      // ── 공유 요소 — 글 카드의 커버·제목 ↔ 글 상세의 히어로 이미지·h1(PostSharedElement) ──
      // 그룹(자리·크기 보간)은 들어오는 페이지와 같은 medium·standard다 — 나가는 페이지가 fast로
      // 비키는 동안 공유 요소가 자리를 옮긴다. old/new 스냅샷은 따로 적지 않은 시간·곡선을 그룹에서
      // 물려받는다(UA).
      [`::view-transition-group(.${POST_SHARED.cover}), ::view-transition-group(.${POST_SHARED.title})`]:
        {
          animationDuration: 'medium',
          animationTimingFunction: 'standard',
        },
      // 커버 — 카드는 원본의 가운데를 잘라(cover) 보이고, 글 상세는 원본 비율 그대로다(OG 카드
      // 1.9:1, 정사각 썸네일 1:1). UA 기본(폭 100%·높이 auto)은 두 스냅샷을 제 비율대로 위에 붙여,
      // 원본의 서로 다른 부분이 겹쳐 크로스페이드가 두 겹으로 보인다. 상세 스냅샷(원본 전체)은 그룹
      // 상자를 cover로 채워 가운데를 자르고, 카드 스냅샷(이미 가운데를 자른 것)은 contain으로 두면 둘이
      // 원본의 같은 부분을 같은 배율로 그린다 — 비율이 바뀌는 동안 늘어나지도 어긋나지도 않는다. 둘 다
      // 이미지가 스냅샷 가장자리까지 차 있어야 성립한다: 카드 커버 틀의 hairline은 이미지 **위에**
      // 그리고(cardParts.ts), 상세 히어로에는 보더가 없다(PostHero). 틀의 진짜 보더가 이미지를 1px
      // 안으로 밀었을 때는 둘이 최대 4px 어긋나 이미지 속 글자가 두 겹으로 보였다(실측).
      //
      // 겹치는 방식도 UA 크로스페이드(두 장을 함께 흐리게 해 plus-lighter로 더한다)가 아니다. 상자를
      // 늘 꽉 채우는 상세 스냅샷을 불투명한 바닥에 두고, 카드 스냅샷(같은 그림에 라운드·hairline·hover
      // 틴트만 더 있다)만 위에서 사라지거나(카드 → 상세) 나타난다(상세 → 카드). 둘을 함께 흐리게 하면
      // contain으로 빈 가장자리에서 뒤 페이지가 비쳐 이미지 양옆에 밝은 띠가 생겼다(실측 — 30% 지점에
      // 18px). 카드 스냅샷은 카드 크기에서만 바닥과 모양이 같아서, 카드 → 상세는 처음에 빨리(fast)
      // 걷히고 상세 → 카드는 그룹이 거의 카드 크기에 닿은 뒤(fast 지연, fastMax) 나타난다 — 그 사이에
      // 보이면 커진 카드의 hairline·틴트가 이미지 속 상자로 보인다.
      //
      // 짝은 들어오는 쪽의 클래스만 받으므로(viewTransitions.ts의 POST_SHARED_SIDE) 카드 스냅샷은
      // 카드 → 상세(.post-detail)의 old, 상세 → 카드(.post-card)의 new다. 바닥은 그 반대쪽이다.
      [`::view-transition-group(.${POST_SHARED.cover})`]: {
        zIndex: VT_STACK.cover,
      },
      [`::view-transition-old(.${POST_SHARED.cover}), ::view-transition-new(.${POST_SHARED.cover})`]:
        {
          height: 'full',
          objectFit: 'cover',
          overflow: 'clip',
          mixBlendMode: 'normal',
          animationName: 'none',
        },
      // 바닥 — cover로 맞추면 양옆(정사각은 위아래)이 잘려 스냅샷에 찍힌 히어로의 라운드도 함께
      // 잘리므로, 모서리를 그룹 상자에 다시 깎는다. 시간·곡선은 그룹과 같다(UA 상속).
      [`::view-transition-new(.${POST_SHARED.cover}.${POST_SHARED_SIDE.detail}), ::view-transition-old(.${POST_SHARED.cover}.${POST_SHARED_SIDE.card})`]:
        {
          borderRadius: 'element',
        },
      [`::view-transition-new(.${POST_SHARED.cover}.${POST_SHARED_SIDE.detail})`]:
        {
          animationName: VIEW_TRANSITION.coverCornerFromCard,
        },
      [`::view-transition-old(.${POST_SHARED.cover}.${POST_SHARED_SIDE.card})`]:
        {
          animationName: VIEW_TRANSITION.coverCornerToCard,
        },
      // 위 — 카드 스냅샷.
      [`::view-transition-old(.${POST_SHARED.cover}.${POST_SHARED_SIDE.detail}), ::view-transition-new(.${POST_SHARED.cover}.${POST_SHARED_SIDE.card})`]:
        {
          objectFit: 'contain',
          zIndex: '1',
          animationTimingFunction: 'standard',
          animationFillMode: 'both',
        },
      [`::view-transition-old(.${POST_SHARED.cover}.${POST_SHARED_SIDE.detail})`]:
        {
          animationName: VIEW_TRANSITION.pageExit,
          animationDuration: 'fast',
        },
      [`::view-transition-new(.${POST_SHARED.cover}.${POST_SHARED_SIDE.card})`]:
        {
          animationName: VIEW_TRANSITION.sharedFadeIn,
          animationDuration: 'fastMax',
          animationDelay: 'fast',
        },
      // 제목 — 글자 크기(카드 14~24px ↔ 상세 22px)도 줄바꿈 폭도 달라, 스냅샷을 그룹 크기로 늘이면
      // 글자가 늘어나 뭉갠다. 스냅샷은 제 크기 그대로 그룹의 왼쪽 위에 붙여 자리만 옮기고, 두 글자가
      // 겹쳐 보이지 않게 순서대로 바꾼다 — 나가는 제목이 먼저 사라지고(fast), 들어오는 제목은 그
      // 뒤에 나타난다(fast 지연, fastMax — 합이 그룹의 medium과 거의 같다).
      //
      // 그룹 상자 밖은 자른다: 제 크기 그대로인 스냅샷은 그룹보다 넓을 수 있어(상세 h1 한 줄 752px
      // → 카드 제목 254px), 자르지 않으면 줄어드는 그룹 밖으로 글자 끝이 옆 카드 위를 지나갔다.
      // 커버 아래에 쌓는다(VT_STACK): 카드 제목은 커버 아래, 상세 h1은 히어로 위라 제목이 날아가는
      // 커버를 가로지르는데, 위에 그리면 다크에서 흰 글자가 커버 그림 위를 지나갔다. 나가는 제목은
      // 감속 곡선(standard)으로 처음에 대부분 걷혀, 커버 가장자리를 지날 때는 거의 보이지 않는다.
      [`::view-transition-group(.${POST_SHARED.title})`]: {
        zIndex: VT_STACK.title,
        overflow: 'clip',
      },
      [`::view-transition-old(.${POST_SHARED.title}), ::view-transition-new(.${POST_SHARED.title})`]:
        {
          width: 'auto',
          height: 'auto',
        },
      [`::view-transition-old(.${POST_SHARED.title})`]: {
        animationName: VIEW_TRANSITION.pageExit,
        animationDuration: 'fast',
        animationTimingFunction: 'standard',
        animationFillMode: 'both',
      },
      [`::view-transition-new(.${POST_SHARED.title})`]: {
        animationName: VIEW_TRANSITION.sharedFadeIn,
        animationDuration: 'fastMax',
        animationDelay: 'fast',
        animationTimingFunction: 'standard',
        animationFillMode: 'both',
      },
      // 짝 없이 나가는 쪽만 남은 커버·제목(들어오는 쪽이 화면 밖이라 React가 이름을 거뒀다 —
      // `:only-child`, 위 규칙들보다 구체적이다) — 나가는 페이지와 똑같이(fast·exit) 사라진다.
      [`::view-transition-old(.${POST_SHARED.cover}):only-child, ::view-transition-old(.${POST_SHARED.title}):only-child`]:
        {
          animationName: VIEW_TRANSITION.pageExit,
          animationDuration: 'fast',
          animationTimingFunction: 'exit',
          animationFillMode: 'both',
        },
      // 문장 공유 링크(`#:~:text=`)로 들어온 독자에게 그 문장을 짚어 준다.
      // "여기"를 가리킨다는 점에서 선택과 같은 뜻이라 같은 토큰을 쓴다(대비는
      // html의 --global-color-selection 주석). 브라우저 기본값은 노랑이라 팔레트 밖이다.
      '::target-text': {
        bg: 'selection.bg',
      },
      ':focus-visible': {
        outline: '2px solid token(colors.accent.solid)',
        outlineOffset: '3px',
        // 초점 링은 inner 자리다(blog-preset.ts radii 주석). 이 규칙은 base 레이어라, 자기
        // 라운드를 가진 요소(utilities 레이어)는 초점을 받아도 그 라운드를 지킨다.
        borderRadius: 'inner',
      },
      // 스크롤바는 얇은 실선처럼. 리뉴얼 톤이 hairline 보더 중심이라 8px
      // 막대가 지면에서 튄다.
      '::-webkit-scrollbar': {
        width: '4px',
        height: '4px',
      },
      '::-webkit-scrollbar-track': {
        bg: 'transparent',
      },
      '::-webkit-scrollbar-thumb': {
        bg: 'ink.border',
        borderRadius: 'full',
      },
      '::-webkit-scrollbar-thumb:hover': {
        bg: 'ink.borderStrong',
      },
    },
  },
  importMap: '@blog/styled-system',
  plugins: [trimPresetPanda],
});
