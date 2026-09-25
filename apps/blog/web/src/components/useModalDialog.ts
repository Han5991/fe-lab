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

/** 열린 다이얼로그 스택 — 겹쳐 열려도 키 처리는 맨 위 하나만 한다. */
const openStack: symbol[] = [];

/** 첫 모달이 열릴 때의 body overflow — 스택이 다시 빌 때만 되돌린다. */
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
 * 모달 오버레이가 공유하는 동작 — 스크롤 잠금, 초점 이동·가두기·되돌리기, Escape.
 * `onClose`는 effect 이벤트로 읽는다: 인라인 화살표로 effect가 다시 돌면 초점이 튀고
 * 잠금이 깜빡인다.
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

    // focus()가 없는 Element(SVG 등)는 되돌릴 수 없어 기억하지 않는다.
    const active = document.activeElement;
    const returnTo = active instanceof HTMLElement ? active : null;

    // tabindex="-1"은 Tab 순서 밖이라 가두기의 처음·끝 계산에서 뺀다.
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
      // preventScroll: 차례 항목이 막 시작한 스크롤을 끊지 않는다.
      if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, [open, containerRef, initialFocusRef]);
}
