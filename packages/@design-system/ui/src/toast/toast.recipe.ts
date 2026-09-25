import { sva } from '@design-system/ui-lib/css';

export const toastRecipe = sva({
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
          color: 'yellow.600',
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
