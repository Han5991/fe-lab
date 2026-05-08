import { definePreset } from '@pandacss/dev';

export const blogPreset = definePreset({
  name: '@design-system/blog',
  theme: {
    extend: {
      tokens: {
        shadows: {
          accentLeft: { value: 'inset 3px 0 0 oklch(53% 0.22 255)' },
          markerLeft: { value: 'inset 3px 0 0 oklch(60% 0.16 65)' },
        },
        fonts: {
          sans: {
            value:
              'var(--font-pretendard, Pretendard), -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
          serif: {
            value:
              "var(--font-newsreader, 'Newsreader'), var(--font-noto-serif-kr, 'Noto Serif KR'), Georgia, 'Times New Roman', serif",
          },
          serifKr: {
            value:
              "var(--font-noto-serif-kr, 'Noto Serif KR'), var(--font-newsreader, 'Newsreader'), Georgia, serif",
          },
          mono: {
            value:
              "var(--font-jetbrains, 'JetBrains Mono'), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          },
        },
        colors: {
          // 페이퍼톤 웜 뉴트럴 — 배경 / 카드 / 푸터 등
          'paper.50': { value: 'oklch(98.5% 0.008 75)' },
          'paper.100': { value: 'oklch(96% 0.012 75)' },
          'paper.200': { value: 'oklch(92% 0.014 75)' },
          'paper.300': { value: 'oklch(86% 0.014 75)' },
          // 잉크 — 텍스트 / 보더. cool → warm hue (60–75)
          'ink.950': { value: 'oklch(16% 0.018 60)' },
          'ink.900': { value: 'oklch(22% 0.02 60)' },
          'ink.800': { value: 'oklch(30% 0.022 60)' },
          'ink.700': { value: 'oklch(40% 0.022 60)' },
          'ink.600': { value: 'oklch(50% 0.02 60)' },
          'ink.500': { value: 'oklch(60% 0.018 60)' },
          'ink.400': { value: 'oklch(70% 0.014 60)' },
          'ink.300': { value: 'oklch(80% 0.012 70)' },
          'ink.200': { value: 'oklch(88% 0.012 75)' },
          'ink.100': { value: 'oklch(93.5% 0.014 75)' },
          'ink.50': { value: 'oklch(97% 0.008 75)' },
          'ink.25': { value: 'oklch(98.5% 0.008 75)' },
          'ink.border': { value: 'oklch(86% 0.014 75)' },
          'ink.borderStrong': { value: 'oklch(72% 0.018 70)' },
          // 액센트 — 링크/액션
          'accent.50': { value: 'oklch(96.5% 0.022 255)' },
          'accent.200': { value: 'oklch(84% 0.05 255)' },
          'accent.600': { value: 'oklch(53% 0.22 255)' },
          'accent.700': { value: 'oklch(47% 0.24 255)' },
          // 형광펜 옐로 — highlight, 시리즈 컬러 키 1
          'marker.100': { value: 'oklch(95% 0.06 90)' },
          'marker.300': { value: 'oklch(89% 0.14 90)' },
          'marker.600': { value: 'oklch(60% 0.16 65)' },
          // 모스 그린 — "지금 작업 중", 라이브 데모, 시리즈 컬러 키 2
          'moss.100': { value: 'oklch(94% 0.04 145)' },
          'moss.600': { value: 'oklch(45% 0.12 145)' },
        },
        fontSizes: {
          '2xs': { value: '10px' },
          xs: { value: '11px' },
        },
      },
      semanticTokens: {
        colors: {
          bg: { value: { base: '{colors.paper.50}' } },
          bgMuted: { value: { base: '{colors.paper.100}' } },
          text: { value: { base: '{colors.ink.950}' } },
          textMuted: { value: { base: '{colors.ink.700}' } },
          textMeta: { value: { base: '{colors.ink.500}' } },
          link: { value: { base: '{colors.accent.600}' } },
          linkHover: { value: { base: '{colors.accent.700}' } },
        },
      },
    },
  },
});

export default blogPreset;
