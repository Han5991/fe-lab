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
  /** 화면에 떠 있는 토스트(위치마다 최대 limit개) */
  toasts: ToastData[];
  /** limit을 넘어 대기 중인 토스트. 앞의 토스트가 닫히면 순서대로 올라온다 */
  queue: ToastData[];
  defaultPosition: ToastPosition;
  limit: number;
};
