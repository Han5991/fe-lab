import { cva } from '@design-system/ui-lib/css';

/** 페이지 단위 행동 버튼(주·보조) — 에러 화면과 404가 같은 모양을 쓴다. */
export const actionButton = cva({
  base: {
    px: '[16px]',
    py: '[8px]',
    borderWidth: '[1px]',
    borderStyle: 'solid',
    rounded: '[6px]',
    fontSize: 'sm',
    textAlign: 'center',
    cursor: 'pointer',
    textDecorationLine: 'none',
  },
  variants: {
    tone: {
      primary: {
        bg: 'btn.primary',
        color: 'white',
        borderColor: 'btn.primaryBorder',
        fontWeight: 'semibold',
        transition: '[background 0.2s]',
        _hover: { bg: 'btn.primaryHover' },
        _active: { bg: 'btn.primary' },
      },
      secondary: {
        bg: 'paper.200',
        color: 'ink.800',
        borderColor: 'ink.border',
        fontWeight: 'medium',
        transition: '[all 0.2s]',
        _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
        _active: { bg: 'paper.300' },
      },
    },
  },
});
