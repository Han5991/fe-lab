import { useCallback, useEffect, useRef } from 'react';

export function useTimeout(callback: () => void, delay: number) {
  const timeoutRef = useRef<number | null>(null);
  // 호출부는 보통 인라인 콜백을 넘긴다. callback을 start의 deps에 두면 렌더마다 start가
  // 바뀌어, 그걸 deps로 둔 effect가 타이머를 매번 새로 건다(다른 토스트가 뜨고 닫힐 때마다
  // 모든 토스트의 자동 닫힘이 처음부터 다시 센다). 최신 콜백은 ref로 읽는다.
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
