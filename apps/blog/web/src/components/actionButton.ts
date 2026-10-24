import { cva } from '@blog/styled-system/css';
import { pressable } from './pressable';

/** 페이지 단위 행동 버튼(주·보조) — 에러 화면과 404가 같은 모양을 쓴다. */
export const actionButton = cva({
  base: {
    ...pressable,
    px: '[16px]',
    py: '[8px]',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    rounded: 'full',
    fontSize: 'sm',
    textAlign: 'center',
    cursor: 'pointer',
    textDecorationLine: 'none',
  },
  variants: {
    tone: {
      primary: {
        bg: 'accent.solid',
        color: 'accent.onSolid',
        borderColor: 'btn.primaryBorder',
        fontWeight: 'semibold',
        _hover: { bg: 'accent.solidHover' },
        _active: { bg: 'accent.solid' },
      },
      secondary: {
        bg: 'paper.200',
        color: 'ink.800',
        borderColor: 'ink.border',
        fontWeight: 'medium',
        _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
        _active: { bg: 'paper.300' },
      },
    },
  },
});
