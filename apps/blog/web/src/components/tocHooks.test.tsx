/**
 * 목차 활성 항목 판정 규칙.
 *
 * 예전 구현은 IntersectionObserver 콜백을 Set에 누적해 활성 "구간"을 만들었고,
 * (1) 콜백이 한 번 어긋나면 이전 헤딩이 Set에 남아 하이라이트가 이전 위치까지
 * 늘어났고, (2) 관찰 밴드(상단 20%)에 헤딩이 하나도 없는 구간 — 글 첫 화면과
 * 긴 섹션 중간 — 에서는 아무것도 안 비쳤습니다.
 *
 * 지금은 스크롤마다 기준선을 지난 마지막 헤딩을 처음부터 다시 찾습니다. 이
 * 파일은 그 재계산 결과가 **항상 정확히 한 항목**이고 누적 상태가 없다는 것을
 * 고정합니다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTocHook } from './tocHooks';

// 기준선은 window.innerHeight * 0.2이라 뷰포트를 1000으로 고정하면 200px이 된다.
const VIEWPORT_HEIGHT = 1000;
const LINE = 200;

interface HeadingSpec {
  id: string;
  tag: string;
  text: string;
  /** 문서 좌표 기준 top (스크롤 0일 때의 위치) */
  top: number;
}

/** 기본 지면: 기준선(200)보다 아래에서 시작해 800px 간격으로 늘어선 헤딩 4개 */
const HEADINGS: HeadingSpec[] = [
  { id: 'intro', tag: 'h2', text: '들어가며', top: 400 },
  { id: 'setup', tag: 'h2', text: '환경 구성', top: 1400 },
  { id: 'deploy', tag: 'h3', text: '배포', top: 2400 },
  { id: 'wrap', tag: 'h2', text: '마치며', top: 3400 },
];

let scrollY = 0;
let frames: FrameRequestCallback[] = [];

function mountHeadings(specs: HeadingSpec[]) {
  const content = document.createElement('div');
  content.id = 'post-content';
  for (const spec of specs) {
    const el = document.createElement(spec.tag);
    if (spec.id) el.id = spec.id;
    el.textContent = spec.text;
    // jsdom은 레이아웃을 계산하지 않아 getBoundingClientRect가 전부 0이다.
    // 훅이 읽는 값은 top 하나뿐이므로 "문서 좌표 - 스크롤량"으로 뷰포트 기준
    // top만 흉내 낸다.
    el.getBoundingClientRect = () =>
      ({ top: spec.top - scrollY }) as unknown as DOMRect;
    content.appendChild(el);
  }
  document.body.appendChild(content);
}

/** 다음 프레임에 예약된 재계산을 수동으로 실행한다. */
function flushFrames() {
  const queued = frames;
  frames = [];
  act(() => {
    for (const cb of queued) cb(0);
  });
}

/** 스크롤 위치를 옮기고 그에 따른 재계산까지 끝낸다. */
function scrollToY(y: number) {
  scrollY = y;
  window.dispatchEvent(new Event('scroll'));
  flushFrames();
}

beforeEach(() => {
  scrollY = 0;
  frames = [];
  document.body.replaceChildren();
  vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT);
  // rAF를 수동 플러시로 바꿔 "스크롤 → 다음 프레임 재계산"을 결정적으로 만든다.
  // 훅이 핸들 0을 "예약 없음" 센티널로 쓰므로 1부터 반환해야 한다.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    frames.push(cb),
  );
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('useTocHook - 목차 추출', () => {
  test('#post-content 안의 h1~h4를 레벨과 함께 모은다', () => {
    mountHeadings(HEADINGS);
    const { result } = renderHook(() => useTocHook());

    expect(result.current.toc).toEqual([
      { id: 'intro', text: '들어가며', level: 2 },
      { id: 'setup', text: '환경 구성', level: 2 },
      { id: 'deploy', text: '배포', level: 3 },
      { id: 'wrap', text: '마치며', level: 2 },
    ]);
  });

  // id 없는 헤딩은 앵커로 이동할 수 없다. 목차에 남기면 클릭해도 아무 일이
  // 없는 죽은 항목이 되고, 활성 판정 루프에서도 매번 헛도는 조회가 된다.
  test('id 없는 헤딩은 목차에서 제외한다', () => {
    mountHeadings([
      { id: '', tag: 'h2', text: '앵커 없는 제목', top: 400 },
      ...HEADINGS,
    ]);
    const { result } = renderHook(() => useTocHook());

    expect(result.current.toc.map(item => item.id)).toEqual([
      'intro',
      'setup',
      'deploy',
      'wrap',
    ]);
  });

  test('#post-content가 없으면 목차는 비고 활성도 없다', () => {
    const { result } = renderHook(() => useTocHook());

    expect(result.current.toc).toEqual([]);
    expect(result.current.activeId).toBe('');
  });
});

describe('useTocHook - 활성 항목', () => {
  const renderToc = (specs: HeadingSpec[] = HEADINGS) => {
    mountHeadings(specs);
    return renderHook(() => useTocHook());
  };

  // 회귀 방지의 핵심. 밴드 방식에서는 첫 화면(모든 헤딩이 기준선 아래)에서
  // 활성 집합이 비어 목차 레일에 하이라이트가 아예 없었다.
  test('아직 아무 헤딩도 기준선을 지나지 않았으면 첫 항목이 활성이다', () => {
    const { result } = renderToc();
    flushFrames();

    expect(HEADINGS[0].top).toBeGreaterThan(LINE);
    expect(result.current.activeId).toBe('intro');
  });

  test('여러 헤딩을 지났으면 기준선을 지난 마지막 헤딩이 활성이다', () => {
    const { result } = renderToc();
    // intro(-1850) · setup(-850) · deploy(150)까지 지나고 wrap(1150)은 아직.
    scrollToY(2250);

    expect(result.current.activeId).toBe('deploy');
  });

  // 밴드(상단 0~200px)에 걸친 헤딩이 하나도 없는 긴 섹션 중간. 예전 구현이
  // 하이라이트를 놓치던 두 번째 구멍이라, 마지막으로 지나온 헤딩이 유지되는지를
  // 명시적으로 고정한다.
  test('헤딩 사이 긴 구간에서도 마지막으로 지나온 헤딩을 유지한다', () => {
    const { result } = renderToc();
    // setup(-600)은 밴드 위로 한참 지나갔고 deploy(400)는 아직 기준선 아래다.
    scrollToY(2000);

    expect(result.current.activeId).toBe('setup');
  });

  // 목차를 만든 뒤 헤딩이 사라질 수 있다(마크다운 리렌더 등). null 하나가
  // 루프를 끊으면 그 뒤의 헤딩이 통째로 무시돼 활성이 앞쪽에 멈춘다.
  test('중간 헤딩을 찾지 못해도 나머지로 활성을 판정한다', () => {
    const { result } = renderToc();
    document.getElementById('setup')?.remove();
    // intro(-1850) · [setup 소실] · deploy(150) 통과, wrap(1150)은 아직.
    // 소실 지점에서 멈췄다면 intro가 활성으로 남는다.
    scrollToY(2250);

    expect(result.current.toc.map(item => item.id)).toContain('setup');
    expect(result.current.activeId).toBe('deploy');
  });

  // 누적 상태가 없다는 것의 관측 가능한 증거. Set에 쌓던 시절에는 위로
  // 되돌려도 지나온 헤딩이 남아 하이라이트가 아래쪽까지 늘어나 있었다.
  test('스크롤을 되돌리면 활성도 되돌아온다', () => {
    const { result } = renderToc();

    scrollToY(3250);
    expect(result.current.activeId).toBe('wrap');

    scrollToY(2250);
    expect(result.current.activeId).toBe('deploy');

    scrollToY(0);
    expect(result.current.activeId).toBe('intro');
  });
});
