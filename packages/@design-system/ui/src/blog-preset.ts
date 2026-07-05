import { definePreset } from '@pandacss/dev';

export const blogPreset = definePreset({
  name: '@design-system/blog',
  theme: {
    extend: {
      tokens: {
        shadows: {
          // accent = github blue, marker = github purple (앰버 폐기)
          accentLeft: { value: 'inset 3px 0 0 #58A6FF' },
          markerLeft: { value: 'inset 3px 0 0 #a371f7' },
        },
        fonts: {
          sans: {
            value:
              'var(--font-pretendard, Pretendard), -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
          // GitHub 폼 리디자인: serif 정체성 폐기 → serif/serifKr 토큰을 system sans로
          // 매핑해 기존 serif 사용처를 일괄 de-serif. (컴포넌트를 안 건드려도 sans 적용)
          serif: {
            value:
              'var(--font-pretendard, Pretendard), -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
          serifKr: {
            value:
              'var(--font-pretendard, Pretendard), -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
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
          monoXxxl: { value: '0.16em' },
        },
        lineHeights: {
          prose: { value: '1.75' },
          proseLoose: { value: '1.7' },
          relaxed: { value: '1.6' },
          comfortable: { value: '1.55' },
          snug: { value: '1.5' },
          headerSm: { value: '1.4' },
          headerXs: { value: '1.35' },
          header: { value: '1.3' },
          tight: { value: '1.25' },
          tighter: { value: '1.2' },
          h1Tight: { value: '1.15' },
          hero: { value: '1.05' },
          heroDense: { value: '0.95' },
          flat: { value: '1' },
        },
        sizes: {
          // 페이지 / 카드 / 폼 폭 — 디자인 명세 px 값 토큰화
          containerW: { value: '1200px' },
          dashboardW: { value: '1280px' },
          articleW: { value: '1080px' },
          proseW: { value: '680px' },
          postBodyW: { value: '720px' },
          tocW: { value: '240px' },
          sidebarW: { value: '240px' },
          heroSubW: { value: '580px' },
          heroSubNarrow: { value: '540px' },
          heroAside: { value: '480px' },
          panelW: { value: '800px' },
          formW: { value: '400px' },
          searchAside: { value: '320px' },
          searchAsideSm: { value: '280px' },
          chartCard: { value: '320px' },
          adminTagW: { value: '90px' },
          adminTagSpan: { value: '110px' },
          listDateW: { value: '110px' },
          listMetaW: { value: '200px' },
          listMetaSm: { value: '100px' },
          listMetaXs: { value: '80px' },
          listSparkline: { value: '100px' },
          listRank: { value: '32px' },
          tooltipW: { value: '140px' },
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
          'ink.500': { value: { base: '#6e7781', _dark: '#7d8590' } },
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
          'accent.600': { value: { base: '#0969da', _dark: '#58a6ff' } },
          'accent.700': { value: { base: '#0550ae', _dark: '#79c0ff' } },
          // marker — 강조/하이라이트 액센트. 주황(앰버) 폐기 → GitHub 퍼플
          // (done/sponsors)로 통일. 파랑(링크/데이터)·초록(성공)과 구분되는
          // 제3의 액센트로 색 위계를 유지한다.
          'marker.100': {
            value: {
              base: 'rgba(130,80,223,0.1)',
              _dark: 'rgba(163,113,247,0.15)',
            },
          },
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
          // spot — admin 전용 강조색(청록/teal). Panda 기본 'teal' 스케일과
          // 이름 충돌을 피하려 커스텀 명 'spot' 사용. 퍼플/파랑/초록과 구분.
          'spot.100': {
            value: {
              base: 'rgba(14,116,144,0.1)',
              _dark: 'rgba(86,212,221,0.15)',
            },
          },
          'spot.600': { value: { base: '#0e7490', _dark: '#56d4dd' } },
          // 시맨틱 별칭 (하위호환)
          bg: { value: '{colors.paper.50}' },
          bgMuted: { value: '{colors.paper.100}' },
          text: { value: '{colors.ink.950}' },
          textMuted: { value: '{colors.ink.700}' },
          textMeta: { value: '{colors.ink.500}' },
          link: { value: '{colors.accent.600}' },
          linkHover: { value: '{colors.accent.700}' },
        },
      },
    },
  },
});

export default blogPreset;
