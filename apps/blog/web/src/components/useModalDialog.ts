'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 열린 다이얼로그 스택. 필터 시트 위에 ⌘K로 검색을 여는 식으로 겹칠 수 있는데,
 * 키 처리는 맨 위 하나만 한다 — 아니면 Escape 한 번에 둘 다 닫히고 Tab 가두기가
 * 서로 초점을 빼앗는다.
 */
const openStack: symbol[] = [];

/**
 * 첫 모달이 열릴 때의 body overflow. 스크롤 잠금은 스택이 비었다 찰 때 걸고,
 * 다시 빌 때 이 값으로 되돌린다 — 겹친 모달 하나가 닫혀도 남은 쪽의 잠금이 풀리지
 * 않는다.
 */
let savedOverflow = '';

interface ModalDialogOptions {
  open: boolean;
  onClose: () => void;
  /** 초점을 가둘 다이얼로그 요소(role="dialog"). */
  containerRef: RefObject<HTMLElement | null>;
  /** 열릴 때 초점을 줄 요소. 없으면 다이얼로그 안의 첫 초점 가능 요소. */
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
}

/**
 * 모달 오버레이(검색 다이얼로그·모바일 차례·필터 시트)가 공유하는 동작:
 * body 스크롤 잠금, 열릴 때 초점 이동, Tab 가두기, Escape로 닫기, 닫힐 때
 * 연 자리로 초점 되돌리기.
 *
 * 세 오버레이가 제각각 구현하던 시절엔 하나만 이걸 다 갖췄고(필터 시트), 나머지는
 * Tab이 dim 뒤 페이지로 빠져나가고 닫으면 초점이 `<body>`로 떨어졌다.
 *
 * `onClose`는 effect 이벤트로 읽는다 — 호출부가 인라인 화살표를 넘겨도 effect가
 * 다시 돌지 않는다. 다시 돌면 초점이 연 자리로 돌아갔다가 첫 요소로 튀고,
 * 스크롤 잠금이 풀렸다 걸리며 깜빡인다.
 */
export function useModalDialog({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}: ModalDialogOptions): void {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    if (openStack.length === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const token = Symbol('modal');
    openStack.push(token);

    // activeElement는 Element라 focus()가 없는 것(SVG 등)도 올 수 있다. 닫을 때
    // 되돌릴 대상이므로, 실제로 되돌릴 수 있는 것만 기억한다.
    const active = document.activeElement;
    const returnTo = active instanceof HTMLElement ? active : null;

    // tabindex="-1"은 초점을 받을 수는 있어도 Tab 순서 밖이다(콤보박스의
    // 결과 링크 등) — 가두기의 처음·끝 계산에서 뺀다.
    const focusables = () =>
      Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter(el => el.tabIndex >= 0);

    // 다음 프레임 — 포털·애니메이션으로 다이얼로그가 붙은 뒤에 옮긴다.
    const focusFirst = requestAnimationFrame(() => {
      (initialFocusRef?.current ?? focusables().at(0))?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (openStack.at(-1) !== token) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      const items = focusables();
      const first = items.at(0);
      const last = items.at(-1);
      if (!root || first === undefined || last === undefined) return;
      const current = document.activeElement;
      // 백드롭 클릭 등으로 초점이 다이얼로그 밖에 있으면 안으로 들인다.
      if (!root.contains(current)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(focusFirst);
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(token), 1);
      if (openStack.length === 0) document.body.style.overflow = savedOverflow;
      // 연 자리가 아직 문서에 있을 때만 — 사라진 요소에 focus()는 아무 일도
      // 하지 않고 초점은 body로 떨어진다. preventScroll: 닫으면서 스크롤을
      // 옮기지 않는다(차례 항목이 막 시작한 부드러운 스크롤을 끊지 않게).
      if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, [open, containerRef, initialFocusRef]);
}
