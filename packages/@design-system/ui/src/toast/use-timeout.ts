import { useCallback, useEffect, useRef } from 'react';

export function useTimeout(callback: () => void, delay: number) {
  const timeoutRef = useRef<number | null>(null);
  // 인라인 콜백이 렌더마다 start를 바꿔 타이머가 다시 걸리지 않게 최신 콜백은 ref로 읽는다
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const start = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      callbackRef.current();
    }, delay);
  }, [delay]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { start, clear };
}
