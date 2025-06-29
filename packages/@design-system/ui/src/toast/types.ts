import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center';

export type ToastData = {
  id?: string;
  message: ReactNode;
  type?: ToastType;
  position?: ToastPosition;
  duration?: number;
  autoClose?: boolean;
};

export type ToastsState = {
  toasts: ToastData[];
  defaultPosition: ToastPosition;
  limit: number;
};
