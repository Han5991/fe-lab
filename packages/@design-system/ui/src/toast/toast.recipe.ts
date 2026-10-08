import { sva } from '@design-system/ui-lib/css';
import type { SlotRecipeRuntimeFn } from '@design-system/ui-lib/types';
import type { ToastType } from './types';

// 인라인 sva는 변형 키만 적은 타입을 단다(Panda v2 isolated declarations 패턴) — 추론 타입은 d.ts가
// 이름을 못 붙이고(TS2883), 붙여도 CSS 값이 통째로 타입에 실린다.
export const toastRecipe: SlotRecipeRuntimeFn<
  'container' | 'content' | 'icon',
  { type?: ToastType }
> = sva({
  slots: ['container', 'content', 'icon'],
  base: {
    // fixed·오프셋은 ToastContainer의 위치별 스택이 맡는다(토스트마다 주면 한 점에 겹친다)
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '3',
      paddingY: '3',
      paddingX: '4',
      borderRadius: 'lg',
      backgroundColor: 'white',
      boxShadow: '[0 4px 12px rgba(0, 0, 0, 0.1)]',
      border: '[1px solid]',
      borderColor: 'gray.200',
      minWidth: '[320px]',
      maxWidth: '[500px]',
      fontSize: 'sm',
      fontWeight: 'medium',
      pointerEvents: 'auto',
    },
    content: {
      flex: '1',
      lineHeight: 'snug',
    },
    icon: {
      width: '5',
      height: '5',
      flexShrink: 0,
    },
  },
  variants: {
    type: {
      success: {
        container: {
          borderColor: 'green.200',
          backgroundColor: 'green.50',
        },
        icon: {
          color: 'green.600',
        },
      },
      error: {
        container: {
          borderColor: 'red.200',
          backgroundColor: 'red.50',
        },
        icon: {
          color: 'red.600',
        },
      },
      warning: {
        container: {
          borderColor: 'yellow.200',
          backgroundColor: 'yellow.50',
        },
        icon: {
          // 600은 yellow.50 위에서 2.84:1 — 아이콘(비텍스트) 기준 3:1에 못 미친다
          color: 'yellow.700',
        },
      },
      info: {
        container: {
          borderColor: 'blue.200',
          backgroundColor: 'blue.50',
        },
        icon: {
          color: 'blue.600',
        },
      },
    },
  },
  defaultVariants: {
    type: 'info',
  },
});

export type ToastRecipeProps = Parameters<typeof toastRecipe>[0];
