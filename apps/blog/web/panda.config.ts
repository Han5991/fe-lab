import { defineConfig, definePlugin } from '@pandacss/dev';
import { ADMIN_VIEW_TRANSITION } from './src/shared/adminViewTransitions';
import { TEST_SUFFIX } from './testFiles.mts';
import { VIEW_TRANSITION } from './src/shared/viewTransitions';

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
        // ── admin 화면(아래 globalCss의 admin 블록·admin 컴포넌트) ──
        // 들어오는 쪽은 토큰 곡선(standard)으로 감속하고, 나가는 쪽은 페이지 전환의 pageExit(제자리
        // 페이드)을 같이 쓴다. 세로로 떠오르는 진입(카드·값·스켈레톤 뒤 내용)도 페이지 전환의
        // pageEnter(8px)를 같이 쓴다 — 같은 움직임에 keyframes를 둘 두지 않는다.
        //   admin-inspector-in/out — 넓은 화면 글 통계 패널의 내용이 오른쪽 16px에서 밀려 오고, 그쪽으로
        //                            밀려 나간다
        //   admin-sheet-in/out — 좁은 화면 시트가 화면 밖에서 들어오고 나간다. 어느 쪽인지는 의사
        //                        요소가 주는 변수(--admin-sheet-from)다(sm 미만 아래, 그 위 오른쪽)
        //   admin-fade-in      — 시트 뒤 스크림, 패널을 닫고 드러나는 '고른 글 없음', 차트 등장
        //   admin-bar-grow     — 가로 막대가 트랙 왼쪽에서 자기 길이까지 자란다(transform만)
        //   admin-chart-wipe   — 차트의 선·면이 왼쪽에서 오른쪽으로 그려진다(clip-path inset)
        //   admin-chart-rise   — 차트의 세로 막대가 바닥에서 자란다(transform만)
        //   admin-card-in      — 로그인 카드가 98%에서 제 크기로 선다
        'admin-inspector-in': {
          from: { opacity: '0', transform: 'translateX(16px)' },
        },
        'admin-inspector-out': {
          to: { opacity: '0', transform: 'translateX(16px)' },
        },
        'admin-sheet-in': {
          from: { transform: 'var(--admin-sheet-from)' },
        },
        'admin-sheet-out': {
          to: { transform: 'var(--admin-sheet-from)' },
        },
        'admin-fade-in': {
          from: { opacity: '0' },
        },
        'admin-bar-grow': {
          from: { transform: 'translateX(-100%)' },
        },
        // 끝도 명시한다 — clip-path는 inset()에서 none으로 보간되지 않아 도중에 뚝 열린다.
        'admin-chart-wipe': {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        'admin-chart-rise': {
          from: { transform: 'scaleY(0)' },
        },
        'admin-card-in': {
          from: { opacity: '0', transform: 'scale(0.98)' },
        },
        // ReadingProgress(src/components/post/ReadingProgress.tsx)의
        // scroll-driven 진행 바. width 대신 transform: scaleX()를
        // 애니메이션해 컴포지터 스레드만으로 처리되게 한다 — width는
        // 레이아웃을 유발해 스크롤 프레임마다 reflow가 돈다.
        'reading-progress-fill': {
          to: { transform: 'scaleX(1)' },
        },
        // 페이지 전환(아래 globalCss의 ::view-transition-* 규칙). 이름은 PageBoundary가 붙이는
        // 클래스와 같은 출처다. 들어오는 페이지는 8px(Astryx spacing-2) 아래에서 떠오르고,
        // 나가는 페이지는 제자리에서 사라진다. 방향(앞·뒤로 미끄러짐)은 담지 않는다 — 브라우저
        // 뒤로·앞으로 가기에는 페이지 전환이 아예 돌지 않아(실측: startViewTransition이 불리지
        // 않는다) 방향을 넣어도 링크 이동에서만 보인다.
        [VIEW_TRANSITION.pageEnter]: {
          from: { opacity: '0', transform: 'translateY(8px)' },
        },
        [VIEW_TRANSITION.pageExit]: {
          to: { opacity: '0' },
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
      // 클릭을 받는다. 이름 붙은 참여자 — 헤더와, `<ViewTransition>`이 이름을 붙이는 페이지 — 는
      // 전환이 끝날 때까지 히트 테스트에서 빠진다(Next view-transitions 가이드 "Keeping the page
      // interactive", 실측) — 전환을 짧게 두는 이유 중 하나다.
      '::view-transition': {
        pointerEvents: 'none',
      },
      // 페이지 전환 — PageBoundary(React <ViewTransition>)가 붙이는 클래스. 나가는 쪽은 빨리
      // 비키고(fast·exit 곡선), 들어오는 쪽은 천천히 자리 잡는다(medium·standard).
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
      // 헤더 그룹을 페이지 그룹 위에 그린다 — 그룹은 문서 순서로 쌓여 헤더가 아래로 가고,
      // 스크롤된 채 떠나는 페이지가 sticky 헤더 자리에 덧칠된다. 다른 그룹은 z-index가 없어 1이면 된다.
      // 배경은 불투명 지면이다: 헤더의 반투명 배경(paper.50/80)은 backdrop-filter 흐림과 한 짝인데,
      // 따로 찍힌 스냅샷에는 흐릴 뒤 배경이 없어 그대로 두면 전환 동안 뒤 본문이 선명하게 비친다.
      [`::view-transition-group(${VIEW_TRANSITION.siteHeader})`]: {
        zIndex: '1',
        bg: 'paper.50',
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
      // ── admin 화면 — React `<ViewTransition>`이 붙이는 이름·클래스(adminViewTransitions.ts) ──
      // 페이지 전환과 같은 문법이다: 들어오는 것은 standard로 감속하며 자리 잡고, 나가는 것은 exit로
      // 가속하며 빨리 비킨다. 클래스는 움직임의 이름이라(무엇이 아니라 어떻게) 여러 자리가 나눠 쓴다.
      // 무엇이 언제 transition이 되는지는 각 컴포넌트 주석에 있다.
      //
      // 관리자 바 — 사이트 헤더와 같은 이유로 페이지·목록 그룹 위에 불투명 바닥으로 그린다(위 헤더
      // 규칙의 주석). 바닥은 바 자신의 면(surface.base)이고, 시간은 루트 크로스페이드와 같다.
      [`::view-transition-group(${ADMIN_VIEW_TRANSITION.bar})`]: {
        zIndex: '1',
        bg: 'surface.base',
      },
      [`::view-transition-group(${ADMIN_VIEW_TRANSITION.bar}), ::view-transition-old(${ADMIN_VIEW_TRANSITION.bar}), ::view-transition-new(${ADMIN_VIEW_TRANSITION.bar})`]:
        {
          animationDuration: 'fastMax',
          animationTimingFunction: 'standard',
        },
      // out·slideOut — 자리를 넘기고 사라지는 것. 페이지가 나갈 때처럼 fast·exit로 빨리 비킨다. out은
      // 제자리에서 걷히고(스켈레톤, '고른 글 없음', 바뀌기 전 지표 값), slideOut은 패널이 붙은 오른쪽으로
      // 16px 밀려 나간다(넓은 화면 패널의 이전 내용 — 닫기는 들어올 때를 거꾸로 돈다).
      [`::view-transition-old(.${ADMIN_VIEW_TRANSITION.out}), ::view-transition-old(.${ADMIN_VIEW_TRANSITION.slideOut})`]:
        {
          animationDuration: 'fast',
          animationTimingFunction: 'exit',
          animationFillMode: 'both',
        },
      [`::view-transition-old(.${ADMIN_VIEW_TRANSITION.out})`]: {
        animationName: VIEW_TRANSITION.pageExit,
      },
      [`::view-transition-old(.${ADMIN_VIEW_TRANSITION.slideOut})`]: {
        animationName: 'admin-inspector-out',
      },
      // rise·slideIn·fadeIn — 같은 자리에 새로 서는 것(바뀐 지표 값·정렬을 바꾼 목록은 8px 아래에서
      // 떠오르고, 패널의 새 내용은 패널이 붙은 오른쪽에서 16px 밀려 오고, 패널을 닫고 드러나는 '고른 글
      // 없음'은 움직임 없이 나타난다). 이전 것이 fast로 걷힌 **뒤에** fastMax로 선다 — 둘을 함께 돌리면
      // exit 곡선이 처음에 느려 옛 글자가 진한 채 새 글자와 두 겹으로 겹친다(실측, 60ms에 둘 다 50% 넘게
      // 보였다). 합(405ms)이 medium과 거의 같다. 줄 높이가 바뀌면(증감 줄바꿈) 그룹이 medium으로 따라간다.
      [`::view-transition-group(.${ADMIN_VIEW_TRANSITION.rise})`]: {
        animationDuration: 'medium',
        animationTimingFunction: 'standard',
      },
      [`::view-transition-new(.${ADMIN_VIEW_TRANSITION.rise}), ::view-transition-new(.${ADMIN_VIEW_TRANSITION.slideIn}), ::view-transition-new(.${ADMIN_VIEW_TRANSITION.fadeIn})`]:
        {
          animationDuration: 'fastMax',
          animationDelay: 'fast',
          animationTimingFunction: 'standard',
          animationFillMode: 'both',
        },
      [`::view-transition-new(.${ADMIN_VIEW_TRANSITION.rise})`]: {
        animationName: VIEW_TRANSITION.pageEnter,
      },
      [`::view-transition-new(.${ADMIN_VIEW_TRANSITION.slideIn})`]: {
        animationName: 'admin-inspector-in',
      },
      [`::view-transition-new(.${ADMIN_VIEW_TRANSITION.fadeIn})`]: {
        animationName: 'admin-fade-in',
      },
      // sheet·scrim — 좁은 화면 시트와 그 뒤. 화면을 덮는 면이라 관리자 바(1)보다 위에 그린다. 시트는
      // 목차 바텀시트와 같은 박자다: 열릴 때 medium·standard, 닫힐 때 같은 시간에 exit로 되돌아 나가고,
      // 스크림은 열릴 때 medium, 닫힐 때 linear(거리 없는 퇴장). sm 미만은 시트가 화면 폭 전체라
      // 아래에서 올라오고, 그 위는 오른쪽 끝에 붙은 400 드로어라 오른쪽에서 들어온다.
      [`::view-transition-group(.${ADMIN_VIEW_TRANSITION.sheet}), ::view-transition-group(.${ADMIN_VIEW_TRANSITION.scrim})`]:
        {
          zIndex: '2',
        },
      [`::view-transition-new(.${ADMIN_VIEW_TRANSITION.sheet}), ::view-transition-old(.${ADMIN_VIEW_TRANSITION.sheet})`]:
        {
          '--admin-sheet-from': 'translateY(100%)',
          sm: { '--admin-sheet-from': 'translateX(100%)' },
          animationDuration: 'medium',
          animationFillMode: 'both',
        },
      [`::view-transition-new(.${ADMIN_VIEW_TRANSITION.sheet})`]: {
        animationName: 'admin-sheet-in',
        animationTimingFunction: 'standard',
      },
      [`::view-transition-old(.${ADMIN_VIEW_TRANSITION.sheet})`]: {
        animationName: 'admin-sheet-out',
        animationTimingFunction: 'exit',
      },
      [`::view-transition-new(.${ADMIN_VIEW_TRANSITION.scrim})`]: {
        animationName: 'admin-fade-in',
        animationDuration: 'medium',
        animationTimingFunction: 'standard',
        animationFillMode: 'both',
      },
      [`::view-transition-old(.${ADMIN_VIEW_TRANSITION.scrim})`]: {
        animationName: VIEW_TRANSITION.pageExit,
        animationDuration: 'medium',
        animationTimingFunction: 'linear',
        animationFillMode: 'both',
      },
    },
  },
  importMap: '@blog/styled-system',
  plugins: [trimPresetPanda],
});
