import { defineConfig, definePlugin } from '@pandacss/dev';

// 색·라운드는 전부 @blog/preset에서 온다(AGENTS.md §9). preset-panda는 spacing·sizes·fontSizes 같은
// 스케일만 빌리고 색 팔레트와 radii는 버린다 — v2의 팔레트(oklch 26색 × 11단)는 v1의 두 배 무게로
// 토큰 레이어에 통째로 실렸고(쓰는 곳 0), strictTokens가 `orange.500` 같은 팔레트 밖 색을 통과시켰다.
// radii는 블로그 토큰과 같은 값을 다른 이름으로 들고 있어(lg=8px=control, xl=12px=card, full≈pill)
// 같은 라운드가 이름 셋(`'lg'`·`'control'`·`'[8px]'`)으로 갈렸다.
// 서드파티 프리셋을 고치지 않고 일부만 빼는 v2 방식이 preset:resolved 훅이다(theming/plugins
// "Trim a preset", theming/presets "extend only adds, so removing takes a plugin"). @blog/preset에
// extend 없는 colors를 두는 길도 v2에서 동작하지만, 그러면 블로그 프리셋이 목록 순서에 묶인다.
// 뺀 토큰을 쓰면 Panda는 진단 없이 raw 값(`color: orange.500`)을 내보낸다 — 막는 건 check-types다.
const trimPresetPanda = definePlugin({
  name: 'blog:trim-preset-panda',
  hooks: {
    'preset:resolved': ({ preset, name, utils }) =>
      name === '@pandacss/preset-panda'
        ? utils.omit(preset, [
            'theme.tokens.colors',
            'theme.semanticTokens.colors',
            'theme.tokens.radii',
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
  // 테스트는 스캔하지 않는다 — 픽스처의 `content: '# 첫 단원 본문'`·`width={750}` 같은 값이 스타일
  // prop으로 읽혀 프로덕션 CSS에 쓰레기 규칙(~1.2KB)으로 실렸다. turbo.json이 테스트를 빌드 입력에서
  // 빼는 전제이기도 하다.
  exclude: ['**/*.test.{ts,tsx}'],
  // 디자인 토큰 강제: 임의 색/값 대신 토큰만 허용. 임의값이 꼭 필요하면
  // 대괄호 이스케이프(`'[6px]'`)로 명시적으로 표기한다.
  strictTokens: true,

  // 공식 권장대로 프로덕션에서만 줄인다 — dev에서 생성 CSS를 읽을 수 있게. 최종 out/의 CSS는
  // Next가 한 번 더 줄이므로 배포물 크기는 이 값과 무관하다.
  minify: process.env.NODE_ENV === 'production',

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
      },
    },
  },
  globalCss: {
    extend: {
      html: {
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
      body: {
        fontFamily: 'sans',
        wordBreak: 'keep-all',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      // 테마 전환 애니메이션 — View Transitions API(useTheme)로 전체
      // 페이지를 한 번의 컴포지터 크로스페이드로 전환한다. 예전엔
      // html.theme-transition * 로 모든 요소에 color/fill transition을
      // 걸어, 차트·코드 하이라이팅이 많은 페이지(analytics 등)에서 요소
      // 수만큼 style/paint가 터져 버벅였다. 루트 스냅샷 크로스페이드는
      // 요소 수와 무관하게 GPU에서 처리돼 매끄럽다. (reduced-motion·
      // 미지원 브라우저는 useTheme가 즉시 전환하므로 이 pseudo가 생성되지
      // 않는다.)
      '::view-transition-old(root), ::view-transition-new(root)': {
        animationDuration: '[0.26s]',
        animationTimingFunction: '[ease]',
      },
      // 드래그 선택. 배경만 지정하고 **글자색은 건드리지 않는다.**
      //
      // 예전엔 `bg: ink.border` + `color: ink.900`이었는데 둘 다 문제였다.
      // ink.border는 알파 10% 검정이라 흰 지면 위에서 1.25:1로 묽어져 선택한
      // 티가 안 났고, 코드 블록(항상 다크 표면)에서는 배경이 사실상 그대로인
      // 채로 글자만 ink.900(라이트=거의 검정)으로 강제돼 대비 1.29:1 —
      // 드래그하면 코드가 사라졌다. 색을 강제하지 않으면 링크·제목·구문
      // 강조가 선택 중에도 제 색을 유지한다.
      //
      // 코드 블록처럼 테마와 무관하게 어두운 표면은 이 규칙을 그대로 쓸 수
      // 없어 CodeBlock.tsx가 자기 안쪽 ::selection을 따로 덮는다.
      '::selection': {
        bg: 'selection.bg',
      },
      // 문장 공유 링크(`#:~:text=`)로 들어온 독자에게 그 문장을 짚어 준다.
      // "여기"를 가리킨다는 점에서 선택과 같은 뜻이라 같은 토큰을 쓴다(대비는
      // 위 selection.bg 주석). 브라우저 기본값은 노랑이라 팔레트 밖이다.
      '::target-text': {
        bg: 'selection.bg',
      },
      ':focus-visible': {
        outline: '2px solid token(colors.accent.600)',
        outlineOffset: '3px',
        borderRadius: '3px',
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
        borderRadius: 'pill',
      },
      '::-webkit-scrollbar-thumb:hover': {
        bg: 'ink.borderStrong',
      },
      // Marker(형광펜) — raw HTML 본문의 <span class="marker">…</span> 강조
      '.marker': {
        background:
          'linear-gradient(180deg, transparent 55%, token(colors.marker.300) 55%, token(colors.marker.300) 92%, transparent 92%)',
        padding: '0 2px',
      },
    },
  },
  importMap: '@blog/styled-system',
  plugins: [trimPresetPanda],
});
