/**
 * body 스크롤 잠금 — **참조 카운트** 하나로 모든 오버레이가 공유한다.
 *
 * 예전엔 검색 다이얼로그·모바일 차례·필터 시트가 각자 `body.style.overflow`를
 * 만졌고, 앞의 둘은 마운트·닫힘 때마다 `''`/`'unset'`으로 **무조건** 되돌렸다.
 * 그래서 하나가 열린 채 다른 하나가 마운트되거나 닫히면 열린 쪽의 잠금까지
 * 풀렸다. 여기서는 첫 잠금이 원래 값을 기억하고, 마지막 해제만 그 값으로
 * 되돌린다.
 */
let locks = 0;
let saved = '';

/** 잠그고, 해제 함수를 돌려준다. 해제는 여러 번 불러도 한 번만 센다. */
export function lockBodyScroll(): () => void {
  if (locks === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.body.style.overflow = saved;
  };
}
