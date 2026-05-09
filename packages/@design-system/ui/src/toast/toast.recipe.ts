import { sva } from '@design-system/ui-lib/css';

export const toastRecipe = sva({
  slots: ['container', 'content', 'icon'],
  base: {
    container: {
      position: 'fixed',
      zIndex: 'toast',
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
      lineHeight: 'headerSm',
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
    position: {
      'top-left': {
        container: {
          top: '6',
          left: '6',
        },
      },
      'top-right': {
        container: {
          top: '6',
          right: '6',
        },
      },
      'top-center': {
        container: {
          top: '6',
          left: '[50%]',
          transform: 'translateX(-50%)',
        },
      },
      'bottom-left': {
        container: {
          bottom: '6',
          left: '6',
        },
      },
      'bottom-right': {
        container: {
          bottom: '6',
          right: '6',
        },
      },
      'bottom-center': {
        container: {
          bottom: '6',
          left: '[50%]',
          transform: 'translateX(-50%)',
        },
      },
    },
  },
  defaultVariants: {
    type: 'info',
    position: 'top-center',
  },
});

export type ToastRecipeProps = Parameters<typeof toastRecipe>[0];
