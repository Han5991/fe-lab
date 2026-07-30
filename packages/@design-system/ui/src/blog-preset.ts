import { definePreset } from '@pandacss/dev';

export const blogPreset = definePreset({
  name: '@design-system/blog',
  theme: {
    extend: {
      tokens: {
        shadows: {
          // marker = github purple — 블로그 강조 좌측 바 (앰버 폐기)
          markerLeft: { value: 'inset 3px 0 0 #a371f7' },
        },
        fonts: {
          sans: {
            value:
              'var(--font-pretendard, "Pretendard Variable"), Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
          // GitHub 폼 리디자인: serif 정체성 폐기 → serif 토큰을 system sans로
          // 매핑해 기존 serif 사용처를 일괄 de-serif. (컴포넌트를 안 건드려도 sans 적용)
          serif: {
            value:
              'var(--font-pretendard, "Pretendard Variable"), Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
          mono: {
            value:
              "var(--font-jetbrains, 'JetBrains Mono'), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          },
        },
        // 색 팔레트는 semanticTokens.colors 로 이동(테마-가변 base/_dark).
        // paper/ink/accent/marker/moss 이름은 유지 — 컴포넌트가 그대로 소비.
        fontSizes: {
          '2xs': { value: '10px' },
          xs: { value: '11px' },
        },
        letterSpacings: {
          tighter: { value: '-0.03em' },
          tightish: { value: '-0.025em' },
          tightX: { value: '-0.02em' },
          tightSm: { value: '-0.015em' },
          tightXs: { value: '-0.01em' },
          mono: { value: '0.04em' },
          monoLg: { value: '0.06em' },
          monoXl: { value: '0.08em' },
          monoXxl: { value: '0.12em' },
        },
        lineHeights: {
          prose: { value: '1.75' },
          proseLoose: { value: '1.7' },
          relaxed: { value: '1.6' },
          comfortable: { value: '1.55' },
          snug: { value: '1.5' },
          headerSm: { value: '1.4' },
          header: { value: '1.3' },
          tight: { value: '1.25' },
          heroDense: { value: '0.95' },
          flat: { value: '1' },
        },
        sizes: {
          // 페이지 / 카드 / 폼 폭 — 디자인 명세 px 값 토큰화
          containerW: { value: '1200px' },
          dashboardW: { value: '1280px' },
          articleW: { value: '1080px' },
          proseW: { value: '680px' },
          heroSubW: { value: '580px' },
          heroAside: { value: '480px' },
          panelW: { value: '800px' },
          formW: { value: '400px' },
        },
      },
      semanticTokens: {
        colors: {
          // ─────────────────────────────────────────────────────────────
          // 테마-가변 팔레트. base = GitHub 라이트(Primer), _dark = GitHub
          // 다크(살짝 띄워 순검정 완화 + 서피스 분리 강화). 토큰 이름은 그대로.
          // 다크 조건은 panda.config의 conditions.dark = [data-theme=dark] &.
          // paper = 서피스(배경/카드/행), ink = 텍스트/보더, accent = 링크(파랑),
          // marker = attention 앰버(절제), moss = success 그린.
          // ─────────────────────────────────────────────────────────────
          // paper — 서피스
          'paper.50': { value: { base: '#ffffff', _dark: '#0f141a' } },
          'paper.100': { value: { base: '#f6f8fa', _dark: '#171e27' } },
          'paper.200': { value: { base: '#eaeef2', _dark: '#212a35' } },
          'paper.300': { value: { base: '#d0d7de', _dark: '#2d3742' } },
          // ink — 텍스트/보더
          'ink.950': { value: { base: '#1f2328', _dark: '#f0f6fc' } },
          'ink.900': { value: { base: '#24292f', _dark: '#e6edf3' } },
          'ink.800': { value: { base: '#32383f', _dark: '#c9d1d9' } },
          'ink.700': { value: { base: '#57606a', _dark: '#b1bac4' } },
          'ink.600': { value: { base: '#656d76', _dark: '#8b949e' } },
          // ink.500 — 12px 메타 텍스트(날짜/시리즈/조회수)에 주로 쓰인다.
          // 예전 값(base #6e7781 / _dark #7d8590)은 카드 서피스(paper.100)
          // 위에서 4.27:1 / 4.50:1이라 WCAG AA(4.5:1)를 못 넘거나 딱 걸쳤다.
          // ink.600보다는 여전히 옅게 유지하면서(램프 순서 보존) paper.50·
          // paper.100 위에서 4.7:1 이상 나오는 값으로 당겼다.
          'ink.500': { value: { base: '#687079', _dark: '#858e98' } },
          'ink.400': { value: { base: '#8c959f', _dark: '#6e7681' } },
          'ink.300': { value: { base: '#afb8c1', _dark: '#545d68' } },
          'ink.200': { value: { base: '#d0d7de', _dark: '#3d444d' } },
          'ink.100': { value: { base: '#eaeef2', _dark: '#2d3742' } },
          'ink.50': { value: { base: '#f6f8fa', _dark: '#212a35' } },
          'ink.25': { value: { base: '#f6f8fa', _dark: '#171e27' } },
          'ink.border': { value: { base: '#d0d7de', _dark: '#343d47' } },
          'ink.borderStrong': { value: { base: '#afb8c1', _dark: '#4a5560' } },
          // accent — 링크/액션 (GitHub blue)
          'accent.50': { value: { base: '#ddf4ff', _dark: '#12243a' } },
          'accent.200': { value: { base: '#54aeff', _dark: '#388bfd' } },
          // 라이트 값은 GitHub 링크 블루(#0969da)에서 한 톤만 내렸다. 원래
          // 값은 paper.200(인라인 코드/콜아웃 배경) 위 링크에서 4.45:1로 AA를
          // 아슬하게 놓쳤다. 다크(#58a6ff)는 5.74:1로 충분해 그대로 둔다.
          'accent.600': { value: { base: '#0866d1', _dark: '#58a6ff' } },
          'accent.700': { value: { base: '#0550ae', _dark: '#79c0ff' } },
          // marker — 강조/하이라이트 액센트. 주황(앰버) 폐기 → GitHub 퍼플
          // (done/sponsors)로 통일. 파랑(링크/데이터)·초록(성공)과 구분되는
          // 제3의 액센트로 색 위계를 유지한다.
          'marker.300': {
            value: {
              base: 'rgba(130,80,223,0.2)',
              _dark: 'rgba(163,113,247,0.32)',
            },
          },
          'marker.600': { value: { base: '#8250df', _dark: '#a371f7' } },
          // moss — success 그린
          'moss.100': {
            value: {
              base: 'rgba(26,127,55,0.12)',
              _dark: 'rgba(63,185,80,0.15)',
            },
          },
          'moss.600': { value: { base: '#1a7f37', _dark: '#3fb950' } },
          // moss.700 — moss.100 배지 위에 얹는 텍스트 전용. moss.600을 그대로
          // 쓰면 라이트에서 4.06:1로 AA 미달이라(배지 배경이 초록 12%라 대비가
          // 깎인다) 한 단계 어두운 값을 따로 둔다. 다크는 moss.600이 이미
          // 5.17:1로 충분해 같은 값을 유지한다.
          'moss.700': { value: { base: '#116329', _dark: '#3fb950' } },
          // spot — admin 전용 강조색(청록/teal). Panda 기본 'teal' 스케일과
          // 이름 충돌을 피하려 커스텀 명 'spot' 사용. 퍼플/파랑/초록과 구분.
          'spot.600': { value: { base: '#0e7490', _dark: '#56d4dd' } },
          // danger — 에러/위험 상태 (로그인 에러 박스 + danger 콜아웃 공용)
          'danger.text': { value: { base: '#cf222e', _dark: '#f85149' } },
          'danger.bg': {
            value: {
              base: 'rgba(207,34,46,0.08)',
              _dark: 'rgba(248,81,73,0.1)',
            },
          },
          'danger.border': { value: { base: '#cf222e', _dark: '#da3633' } },
          // btn — 버튼 배경. 링크용 accent.600(다크에서 밝음)과 달리 흰 글씨
          // 대비를 확보한 GitHub 버튼 전용 명도(라이트/다크 쌍).
          'btn.accent': { value: { base: '#0969da', _dark: '#1f6feb' } },
          'btn.primary': { value: { base: '#1f883d', _dark: '#238636' } },
          'btn.primaryHover': { value: { base: '#1a7f37', _dark: '#2ea043' } },
          'btn.primaryBorder': {
            value: {
              base: 'rgba(31,35,40,0.15)',
              _dark: 'rgba(240,246,252,0.1)',
            },
          },
          // callout — 마크다운 콜아웃 타입별 테마-가변 색 (danger는 danger.* 재사용)
          'callout.info.bg': {
            value: {
              base: 'rgba(9,105,218,0.08)',
              _dark: 'rgba(56,139,253,0.1)',
            },
          },
          'callout.info.text': { value: { base: '#0969da', _dark: '#79c0ff' } },
          'callout.info.border': {
            value: { base: '#0969da', _dark: '#1f6feb' },
          },
          'callout.tip.bg': {
            value: {
              base: 'rgba(26,127,55,0.08)',
              _dark: 'rgba(63,185,80,0.1)',
            },
          },
          'callout.tip.text': { value: { base: '#1a7f37', _dark: '#3fb950' } },
          'callout.tip.border': {
            value: { base: '#1f883d', _dark: '#238636' },
          },
          'callout.warn.bg': {
            value: {
              base: 'rgba(154,103,0,0.08)',
              _dark: 'rgba(210,153,34,0.1)',
            },
          },
          'callout.warn.text': { value: { base: '#9a6700', _dark: '#d29922' } },
          'callout.warn.border': {
            value: { base: '#bf8700', _dark: '#9e6a03' },
          },
        },
      },
    },
  },
});

export default blogPreset;
