import { useEffect, type CSSProperties } from 'react';
import { cx } from '@design-system/ui-lib/css';
import { Portal } from './portal';
import { ToastIcon } from './toast-icon';
import { toastRecipe } from './toast.recipe';
import { useDistributedToasts, toasts } from './toast-store';
import { useTimeout } from './use-timeout';
import { ToastData, ToastPosition } from './types';

/** 화면 가장자리와의 간격(토큰 6)과 토스트 사이 간격(토큰 3) */
const EDGE_OFFSET = '1.5rem';
const STACK_GAP = '0.75rem';

/**
 * 위치 하나의 토스트 스택. 이 래퍼만 fixed이고 토스트는 그 안에 세로로 쌓인다.
 */
function stackStyle(position: ToastPosition): CSSProperties {
  const [vertical, horizontal] = position.split('-') as [
    'top' | 'bottom',
    'left' | 'right' | 'center',
  ];
  return {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: STACK_GAP,
    [vertical]: EDGE_OFFSET,
    ...(horizontal === 'left' && {
      left: EDGE_OFFSET,
      alignItems: 'flex-start',
    }),
    ...(horizontal === 'right' && {
      right: EDGE_OFFSET,
      alignItems: 'flex-end',
    }),
    ...(horizontal === 'center' && {
      left: '50%',
      transform: 'translateX(-50%)',
      alignItems: 'center',
    }),
  };
}

interface ToastItemProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  const duration = toast.duration ?? 3000;
  const autoClose = toast.autoClose ?? true;

  const { start, clear } = useTimeout(() => {
    if (toast.id) {
      onClose(toast.id);
    }
  }, duration);

  useEffect(() => {
    if (autoClose && duration > 0) {
      start();
    }
    return () => clear();
  }, [autoClose, duration, start, clear]);

  const { container, content, icon } = toastRecipe({
    type: toast.type,
  });

  return (
    <div className={cx(container)}>
      {toast.type && <ToastIcon type={toast.type} className={icon} />}
      <div className={content}>{toast.message}</div>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts: activeToasts, defaultPosition } = useDistributedToasts();

  if (activeToasts.length === 0) return null;

  // 위치별로 토스트를 그룹화
  const toastsByPosition = activeToasts.reduce(
    (acc: Record<string, ToastData[]>, toast: ToastData) => {
      const position = toast.position || defaultPosition;
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(toast);
      return acc;
    },
    {} as Record<string, ToastData[]>,
  );

  return (
    <Portal>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div key={position} style={stackStyle(position as ToastPosition)}>
          {(positionToasts as ToastData[]).map((toast: ToastData) => (
            <ToastItem key={toast.id} toast={toast} onClose={toasts.hide} />
          ))}
        </div>
      ))}
    </Portal>
  );
};
