import { definePreset, defineRecipe, type Preset } from '@pandacss/dev';

const buttonRecipe = defineRecipe({
  className: 'button',
  description: 'The styles for the Button component',
  base: {
    display: 'flex',
    cursor: 'pointer',
  },
  variants: {
    visual: {
      funky: { bg: 'blue.500', color: 'white' },
      edgy: { border: '3px solid token(colors.purple.500)' },
    },
    size: {
      sm: { padding: '4', fontSize: '12px' },
      lg: { padding: '8', fontSize: '40px' },
    },
    shape: {
      square: { borderRadius: '0' },
      circle: { borderRadius: 'full' },
    },
  },
  defaultVariants: {
    visual: 'funky',
    size: 'sm',
    shape: 'circle',
  },
});

// v2의 definePreset은 입력 타입을 그대로 돌려줘서(`<const T extends Preset>`) 추론 타입이
// 직접 의존하지 않는 @pandacss/types의 RecipeConfig를 가리킨다 — d.ts가 이름을 못 붙인다(TS2883).
export const preset: Preset = definePreset({
  name: '@design-system',
  theme: {
    extend: {
      recipes: {
        button: buttonRecipe,
      },
    },
  },
});

export default preset;
