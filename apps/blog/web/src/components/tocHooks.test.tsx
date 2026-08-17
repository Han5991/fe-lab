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
import { act, render, renderHook } from '@testing-library/react';
import { useTocHook } from './tocHooks';

// 기준선은 window.innerHeight * 0.2이라 뷰포트를 1000으로 고정하면 200px이 된다.
const VIEWPORT_HEIGHT = 1000;
const LINE = 200;

/** 헤딩 한 줄의 높이. 활성 "구간" 판정이 bottom을 보므로 필요하다. */
const HEADING_HEIGHT = 40;

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
    // 훅이 읽는 값은 top·bottom뿐이므로 "문서 좌표 - 스크롤량"으로 뷰포트
    // 기준 위치만 흉내 낸다(bottom은 한 줄 높이를 더한 값).
    el.getBoundingClientRect = () =>
      ({
        top: spec.top - scrollY,
        bottom: spec.top - scrollY + HEADING_HEIGHT,
      }) as unknown as DOMRect;
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
  vi.stubGlobal('cancelAnimationFrame', () => {
    // frames 큐를 직접 비우며 진행하므로 취소를 흉내 낼 필요가 없다
  });
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

/**
 * 목차의 원본은 DOM이다 — 상태로 복사하지 않고 useSyncExternalStore로 구독한다.
 * 그 배관(MutationObserver 구독 → 스냅샷 무효화 → 다시 읽기)이 실제 DOM 변경에
 * 반응하는지, 그리고 헤딩이 그대로일 때 참조를 유지하는지를 고정한다.
 */
describe('useTocHook - 본문 변화 추적', () => {
  /** MutationObserver 콜백은 마이크로태스크다 — act 안에서 비운다. */
  const mutate = async (change: () => void) => {
    await act(async () => {
      change();
      await Promise.resolve();
    });
  };

  test('본문에 헤딩이 붙으면 목차가 따라 늘어난다', async () => {
    mountHeadings(HEADINGS);
    const { result } = renderHook(() => useTocHook());

    await mutate(() => {
      const el = document.createElement('h2');
      el.id = 'extra';
      el.textContent = '덧붙임';
      el.getBoundingClientRect = () =>
        ({
          top: 4400 - scrollY,
          bottom: 4400 - scrollY + HEADING_HEIGHT,
        }) as unknown as DOMRect;
      document.getElementById('post-content')?.appendChild(el);
    });

    expect(result.current.toc.map(item => item.id)).toEqual([
      'intro',
      'setup',
      'deploy',
      'wrap',
      'extra',
    ]);
  });

  // 코드 탭 전환처럼 본문 **안쪽만** 바뀌는 일은 흔하다. 그때마다 새 배열을
  // 돌려주면 아무것도 안 바뀐 채로 차례가 통째로 다시 그려진다.
  test('헤딩이 그대로면 같은 배열을 유지한다', async () => {
    mountHeadings(HEADINGS);
    const { result } = renderHook(() => useTocHook());
    const before = result.current.toc;

    await mutate(() => {
      const p = document.createElement('p');
      p.textContent = '헤딩과 무관한 본문 변경';
      document.getElementById('post-content')?.appendChild(p);
    });

    expect(result.current.toc).toBe(before);
  });

  // TOC와 MobileTOC가 같은 페이지에 함께 마운트된다(PostClient). 캐시는 인스턴스
  // 별로 따로 두지만 — 페이지 전환 중 두 글의 본문이 공존할 때 서로에게 새지
  // 않게 — 같은 본문을 읽으므로 내용은 같아야 한다.
  test('두 곳에서 함께 구독해도 같은 목차를 본다', () => {
    mountHeadings(HEADINGS);
    const first = renderHook(() => useTocHook());
    const second = renderHook(() => useTocHook());

    expect(second.result.current.toc).toEqual(first.result.current.toc);
  });

  // 스냅샷 캐시는 모듈 스코프에 있어 글이 바뀌어도 살아남는다. 구독(=무효화)은
  // 커밋 뒤에나 불리므로, 노드 동일성으로 먼저 잡지 않으면 **첫 렌더 한 프레임**
  // 동안 이전 글의 차례가 그대로 보인다.
  test('다른 글로 넘어오면 첫 렌더부터 새 글의 목차다', () => {
    mountHeadings(HEADINGS);
    renderHook(() => useTocHook()).unmount();

    // 클라이언트 내비게이션 — 본문 노드가 통째로 갈린다.
    document.body.replaceChildren();
    mountHeadings([{ id: 'next-post', tag: 'h2', text: '다음 글', top: 400 }]);

    const seen: string[][] = [];
    const Probe = () => {
      const { toc } = useTocHook();
      seen.push(toc.map(item => item.id));
      return null;
    };
    render(<Probe />);

    expect(seen[0]).toEqual(['next-post']);
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

/**
 * 활성 "구간" — 데스크톱 차례가 레일을 어디부터 어디까지 비출지.
 *
 * `activeId`(한 항목)와 달리 이쪽은 **화면에 온전히 들어온 헤딩 전체**다.
 * 레퍼런스(fumadocs)가 IntersectionObserver로 구하는 집합과 같은 것을
 * 스크롤마다 다시 계산할 뿐이라, 예전 누적 Set 방식의 잔상은 구조적으로
 * 생길 수 없다 — 그 성질을 아래 마지막 케이스가 지킨다.
 */
describe('useTocHook - 활성 구간', () => {
  /** 한 화면(1000px)에 여러 헤딩이 함께 들어오는 촘촘한 지면. */
  const DENSE: HeadingSpec[] = [
    { id: 'a', tag: 'h2', text: '가', top: 100 },
    { id: 'b', tag: 'h2', text: '나', top: 300 },
    { id: 'c', tag: 'h3', text: '다', top: 500 },
    { id: 'd', tag: 'h2', text: '라', top: 1500 },
  ];

  test('화면에 들어온 헤딩 전체가 구간이 된다', () => {
    mountHeadings(DENSE);
    const { result } = renderHook(() => useTocHook());
    flushFrames();

    // 100·300·500은 아래끝(각 +40)까지 1000 안에 들어오고, 1500은 밖이다.
    expect(result.current.activeRange).toEqual([0, 2]);
  });

  test('고정 헤더에 가린 헤딩은 구간에 넣지 않는다', () => {
    // 헤더는 sticky로 화면 맨 위를 덮고 있어서, 뷰포트 좌표가 0에 가까운
    // 헤딩은 화면 안에 있어도 눈에는 안 보인다. 그것까지 세면 아직 안
    // 읽고 있는 절이 레일에서 먼저 켜진다.
    mountHeadings(DENSE);
    const { result } = renderHook(() => useTocHook());
    // 'a'가 50까지 올라와 헤더(100) 아래로 들어간다.
    scrollToY(50);

    expect(result.current.activeRange).toEqual([1, 2]);
  });

  test('아래끝이 화면을 넘는 헤딩은 구간에 넣지 않는다', () => {
    mountHeadings(DENSE);
    const { result } = renderHook(() => useTocHook());
    // 'd'의 머리(1500 → 520)는 보이지만 아래끝(560)까지 들어오는지가 기준이다.
    scrollToY(980);

    // a(-880)·b(-680)은 위로 지나갔고 c(-480)도 마찬가지, d만 온전히 보인다.
    expect(result.current.activeRange).toEqual([3, 3]);
  });

  test('헤딩이 하나도 안 보이는 구간에서는 지나온 항목 한 줄만 비춘다', () => {
    // 긴 절의 한복판. 구간을 만들 수 없으니 폴백이 필요하다 — 여기서
    // 빈 구간을 돌려주면 레일이 통째로 꺼져 차례가 죽은 것처럼 보인다.
    mountHeadings([
      { id: 'head', tag: 'h2', text: '머리', top: 0 },
      { id: 'tail', tag: 'h2', text: '꼬리', top: 5000 },
    ]);
    const { result } = renderHook(() => useTocHook());
    scrollToY(1000);

    expect(result.current.activeRange).toEqual([0, 0]);
    expect(result.current.activeId).toBe('head');
  });

  test('되돌아가면 구간도 되돌아온다', () => {
    // 누적 상태가 없다는 것의 관측 가능한 증거.
    mountHeadings(DENSE);
    const { result } = renderHook(() => useTocHook());

    scrollToY(980);
    expect(result.current.activeRange).toEqual([3, 3]);

    scrollToY(0);
    expect(result.current.activeRange).toEqual([0, 2]);
  });
});
