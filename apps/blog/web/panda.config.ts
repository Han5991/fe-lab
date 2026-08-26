import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  presets: [
    '@pandacss/dev/presets',
    '@design-system/ui/preset',
    '@design-system/ui/blog-preset',
  ],
  preflight: true,
  lightningcss: true,

  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@design-system/ui/src/**/*.{js,jsx,ts,tsx}',
    // @blog/content는 지금 css()를 쓰지 않지만, 소스 익스포트 패키지라 스타일
    // 사용이 생기는 즉시 스캔 대상이어야 한다 — 선제 등록(누락 시 조용히
    // 스타일이 빠진 채 빌드가 성공한다).
    './node_modules/@blog/content/src/**/*.{js,jsx,ts,tsx}',
  ],
  // 디자인 토큰 강제: 임의 색/값 대신 토큰만 허용. 임의값이 꼭 필요하면
  // 대괄호 이스케이프(`'[6px]'`)로 명시적으로 표기한다.
  strictTokens: true,

  minify: true,

  jsxFramework: 'react',

  strictPropertyValues: true,
  // 테마 토글: html[data-theme] 로 라이트/다크 전환. semanticTokens의 _dark
  // 값이 이 조건에서 적용된다. base = 라이트, [data-theme=dark] = 다크.
  conditions: {
    extend: {
      dark: '[data-theme=dark] &',
    },
  },
  outdir: '../../../packages/@design-system/ui-lib',
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
        scrollBehavior: 'smooth',
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
  importMap: '@design-system/ui-lib',
});
