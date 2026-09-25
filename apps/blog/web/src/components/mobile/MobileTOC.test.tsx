/**
 * 모바일 차례 항목의 **클릭 계약.**
 *
 * 항목은 `<li onClick>`이 아니라 `<a href="#id">`다 — 마우스 없이도 닿아야 하고
 * (키보드 초점·Enter), 새 탭으로 열기도 살아 있어야 한다. 그래서 두 갈래가 있다:
 * 평범한 클릭은 가로채서 고정 헤더 높이만큼 보정해 직접 스크롤하고 드로어를 닫고,
 * 수정자 키를 동반한 클릭은 브라우저에 그대로 넘긴다. 데스크탑 차례(post/TOC.tsx)와
 * 같은 규칙이고, 여기서 그 두 갈래를 고정한다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HEADER_OFFSET } from '@/src/components/tocHooks';
import { MobileTOC } from './MobileTOC';

const HEADING = { id: 'intro', text: '들어가며' };

let scrollToMock: ReturnType<typeof vi.fn>;
let content: HTMLElement;

/** 드로어를 열고 목차 항목 앵커를 준다. */
const openDrawer = () => {
  render(<MobileTOC />);
  fireEvent.click(screen.getByRole('button', { name: '목차 열기' }));
  return screen.getByRole('link', { name: HEADING.text });
};

/**
 * 수정자 키를 담아 클릭한다. fireEvent 대신 MouseEvent를 직접 만드는 이유는
 * `defaultPrevented`를 그대로 읽기 위해서고, act로 감싸는 이유는 클릭이 부르는
 * 상태 변경(드로어 닫기)과 그에 딸린 effect까지 흘려보내기 위해서다.
 */
const dispatchClick = (el: Element, init: MouseEventInit = {}) => {
  const ev = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    el.dispatchEvent(ev);
  });
  return ev;
};

/**
 * 드로어가 열려 있는지는 **body 스크롤 잠금**으로 본다.
 *
 * 닫기는 AnimatePresence의 exit 애니메이션을 거치므로 DOM에서 사라지는 시점이
 * jsdom에서는 결정적이지 않다. 잠금은 isOpen에 직접 매달린 effect라 상태가
 * 바뀌는 즉시 반영된다.
 */
const drawerOpen = () => document.body.style.overflow === 'hidden';

beforeEach(() => {
  // 차례가 읽어 가는 본문. 앵커 대상이 실제로 있어야 스크롤까지 간다.
  content = document.createElement('div');
  content.id = 'post-content';
  const heading = document.createElement('h2');
  heading.id = HEADING.id;
  heading.textContent = HEADING.text;
  // jsdom은 레이아웃을 계산하지 않는다 — 스크롤 목표 계산이 읽는 top만 흉내 낸다.
  heading.getBoundingClientRect = () => ({ top: 400 }) as unknown as DOMRect;
  content.appendChild(heading);
  document.body.appendChild(content);

  scrollToMock = vi.fn();
  vi.stubGlobal('scrollTo', scrollToMock);
  vi.stubGlobal('pageYOffset', 0);
});

afterEach(() => {
  // body를 통째로 비우지 않는다 — 드로어는 Portal로 body에 붙으므로, RTL이
  // 언마운트하기 전에 지워 버리면 정리 단계가 NotFoundError로 죽는다.
  content.remove();
  document.body.style.overflow = '';
  vi.unstubAllGlobals();
});

describe('MobileTOC 항목 클릭', () => {
  test('평범한 클릭은 가로채서 직접 스크롤하고 드로어를 닫는다', () => {
    const link = openDrawer();
    expect(drawerOpen()).toBe(true);

    const ev = dispatchClick(link);

    expect(ev.defaultPrevented).toBe(true);
    expect(scrollToMock).toHaveBeenCalled();
    expect(drawerOpen()).toBe(false);
  });

  // 활성 구간 판정(useTocHook)과 같은 헤더 높이만큼 보정해야, 이동한 헤딩이
  // 곧바로 활성으로 잡힌다. 예전엔 여기만 80을 적어 데스크탑 차례(100)와 갈렸다.
  test('스크롤 목표는 공용 헤더 오프셋만큼 올린 자리다', () => {
    const link = openDrawer();

    dispatchClick(link);

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: 400 - HEADER_OFFSET }),
    );
  });

  // 여기서 기본 동작을 막으면 Cmd/Ctrl+클릭의 새 탭이 열리지 않는다 — 앵커로
  // 바꾼 이유가 사라진다.
  test.each([
    ['meta', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
  ])('%s 키를 누른 클릭은 브라우저에 맡긴다', (_name, init) => {
    const link = openDrawer();

    const ev = dispatchClick(link, init);

    expect(ev.defaultPrevented).toBe(false);
    expect(scrollToMock).not.toHaveBeenCalled();
    // 새 탭으로 열었을 뿐이니 이 화면의 드로어는 그대로 열려 있어야 한다.
    expect(drawerOpen()).toBe(true);
  });
});

describe('MobileTOC 드로어 접근성', () => {
  test('드로어는 이름 있는 모달 다이얼로그다', () => {
    openDrawer();

    const dialog = screen.getByRole('dialog', { name: '목차' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('Escape로 닫히고 초점이 여는 버튼으로 돌아간다', () => {
    render(<MobileTOC />);
    const fab = screen.getByRole('button', { name: '목차 열기' });
    fab.focus();
    fireEvent.click(fab);
    expect(drawerOpen()).toBe(true);

    act(() => {
      fireEvent.keyDown(document.activeElement ?? document.body, {
        key: 'Escape',
      });
    });

    expect(drawerOpen()).toBe(false);
    expect(fab).toHaveFocus();
  });

  // h2~h4가 없는 글에서는 빈 드로어를 여는 버튼이 떴다.
  test('헤딩이 없는 글에는 목차 버튼이 없다', () => {
    content.replaceChildren();
    render(<MobileTOC />);

    expect(
      screen.queryByRole('button', { name: '목차 열기' }),
    ).not.toBeInTheDocument();
  });
});
