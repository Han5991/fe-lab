/**
 * 모바일 차례 항목은 앵커다 — 평범한 클릭은 가로채 스크롤하고 드로어를 닫고, 수정자 키
 * 클릭은 브라우저(새 탭)에 넘긴다.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MobileTOC } from './MobileTOC';

const HEADING = { id: 'intro', text: '들어가며' };

let scrollIntoViewMock: Mock<Element['scrollIntoView']>;
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
  // jsdom에는 scrollIntoView가 없다.
  scrollIntoViewMock = vi.fn<Element['scrollIntoView']>();
  heading.scrollIntoView = scrollIntoViewMock;
  content.appendChild(heading);
  document.body.appendChild(content);
});

afterEach(() => {
  // body를 통째로 비우지 않는다 — 드로어는 Portal로 body에 붙으므로, RTL이
  // 언마운트하기 전에 지워 버리면 정리 단계가 NotFoundError로 죽는다.
  content.remove();
  document.body.style.overflow = '';
});

describe('MobileTOC 항목 클릭', () => {
  // 고정 헤더만큼의 여백은 헤딩의 scroll-margin-top(PostBody)이 준다.
  test('평범한 클릭은 가로채서 헤딩 맨 위로 스크롤하고 드로어를 닫는다', () => {
    const link = openDrawer();
    expect(drawerOpen()).toBe(true);

    const ev = dispatchClick(link);

    expect(ev.defaultPrevented).toBe(true);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'start' });
    expect(drawerOpen()).toBe(false);
  });

  // 기본 동작을 막으면 새 탭이 열리지 않는다(키 종류별 판정은 데스크탑 차례 테스트가 본다).
  test('수정자 키를 누른 클릭은 브라우저에 맡긴다', () => {
    const link = openDrawer();

    const ev = dispatchClick(link, { ctrlKey: true });

    expect(ev.defaultPrevented).toBe(false);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
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

  // 빈 드로어를 여는 버튼이 뜨면 안 된다.
  test('헤딩이 없는 글에는 목차 버튼이 없다', () => {
    content.replaceChildren();
    render(<MobileTOC />);

    expect(
      screen.queryByRole('button', { name: '목차 열기' }),
    ).not.toBeInTheDocument();
  });
});
