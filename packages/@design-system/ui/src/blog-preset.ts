import { definePreset } from '@pandacss/dev';

export const blogPreset = definePreset({
  name: '@design-system/blog',
  theme: {
    extend: {
      tokens: {
        shadows: {
          accentLeft: { value: 'inset 3px 0 0 oklch(53% 0.22 255)' },
        },
        fonts: {
          sans: {
            value:
              'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
        },
        colors: {
          'ink.950': { value: 'oklch(14% 0.02 250)' },
          'ink.700': { value: 'oklch(40% 0.025 250)' },
          'ink.500': { value: 'oklch(62% 0.02 250)' },
          'ink.200': { value: 'oklch(87% 0.018 250)' },
          'ink.100': { value: 'oklch(93.5% 0.014 250)' },
          'ink.50': { value: 'oklch(97% 0.008 250)' },
          'ink.25': { value: 'oklch(99% 0.005 250)' },
          'ink.border': { value: 'oklch(87% 0.018 250)' },
          'ink.borderStrong': { value: 'oklch(74% 0.025 250)' },
          'accent.600': { value: 'oklch(53% 0.22 255)' },
          'accent.700': { value: 'oklch(47% 0.24 255)' },
          'accent.50': { value: 'oklch(96.5% 0.022 255)' },
          'accent.200': { value: 'oklch(84% 0.05 255)' },
        },
      },
    },
  },
});

export default blogPreset;
