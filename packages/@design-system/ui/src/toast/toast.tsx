import { useEffect } from 'react';
import { cx } from '@design-system/ui-lib/css';
import { Portal } from './portal';
import { ToastIcon } from './toast-icon';
import { toastRecipe } from './toast.recipe';
import { useDistributedToasts, toasts } from './toast-store';
import { useTimeout } from './use-timeout';
import { ToastData } from './types';

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
    position: toast.position,
  });

  return (
    <div className={cx(container)}>
      {toast.type && <ToastIcon type={toast.type} className={icon} />}
      <div className={content}>{toast.message}</div>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts: activeToasts } = useDistributedToasts();

  if (activeToasts.length === 0) return null;

  // 위치별로 토스트를 그룹화
  const toastsByPosition = activeToasts.reduce(
    (acc: Record<string, ToastData[]>, toast: ToastData) => {
      const position = toast.position || 'top-center';
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
        <div
          key={position}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9999,
            ...(position.includes('top') && { top: 0 }),
            ...(position.includes('bottom') && { bottom: 0 }),
            ...(position.includes('left') && { left: 0 }),
            ...(position.includes('right') && { right: 0 }),
            ...(position.includes('center') && {
              left: '50%',
              transform: 'translateX(-50%)',
            }),
          }}
        >
          {(positionToasts as ToastData[]).map((toast: ToastData) => (
            <ToastItem key={toast.id} toast={toast} onClose={toasts.hide} />
          ))}
        </div>
      ))}
    </Portal>
  );
};
