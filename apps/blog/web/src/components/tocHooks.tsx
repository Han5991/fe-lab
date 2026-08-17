'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * 화면 맨 위에서 **고정 헤더가 덮는 높이.**
 *
 * 헤더는 `position: sticky; top: 0`으로 지면 위에 떠 있어서, 뷰포트 좌표로
 * 0에 가까운 헤딩은 화면 안에 있어도 실제로는 가려져 안 보인다. 앵커로
 * 이동할 때 이만큼 더 올려 주는 값과, 활성 구간을 셀 때 "여기부터가
 * 진짜 보이는 곳"으로 삼는 값이 같아야 둘이 어긋나지 않는다.
 */
export const HEADER_OFFSET = 100;

export const scrollToId = ({
  id,
  headerOffset,
  action,
}: {
  id: string;
  headerOffset: number;
  action?: () => void;
}) => {
  const el = document.getElementById(id);
  if (el) {
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
    action?.();
  }
};

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

/**
 * 헤딩 목록의 **원본은 DOM**이다 — 마크다운을 렌더한 결과라 이 훅이 소유한
 * 상태가 아니다. 그래서 상태로 복사하지 않고 외부 저장소로 읽는다.
 *
 * 예전에는 마운트 effect에서 `setToc(items)`로 옮겼다. 렌더 → effect → 리렌더가
 * 한 번 더 도는 데다(`react-hooks/set-state-in-effect`), 클라이언트 내비게이션으로
 * 들어온 첫 프레임에는 차례가 비어 있다가 뒤늦게 채워졌다. 아래 구독 모델에서는
 * 첫 렌더의 스냅샷이 이미 실제 헤딩이다.
 */
const EMPTY_TOC: TOCItem[] = [];

/** 마지막으로 돌려준 스냅샷. 참조가 바뀌면 이 훅을 쓰는 화면이 다시 그려진다. */
let tocSnapshot: TOCItem[] = EMPTY_TOC;
/** 본문이 바뀌었으니 다시 읽어야 한다는 표시. */
let tocStale = true;

const readToc = (): TOCItem[] => {
  const content = document.getElementById('post-content');
  if (!content) return EMPTY_TOC;

  return Array.from(content.querySelectorAll('h1, h2, h3, h4'))
    .map(header => ({
      id: header.id,
      text: header.textContent || '',
      level: parseInt(header.tagName.substring(1)),
    }))
    .filter(item => item.id);
};

const isSameToc = (a: TOCItem[], b: TOCItem[]): boolean =>
  a.length === b.length &&
  a.every((item, i) => {
    const other = b[i];
    return (
      other !== undefined &&
      item.id === other.id &&
      item.text === other.text &&
      item.level === other.level
    );
  });

const getTocSnapshot = (): TOCItem[] => {
  // getSnapshot은 **렌더마다** 불린다. 매번 DOM을 훑으면 스크롤 한 프레임마다
  // querySelectorAll이 도는 셈이라, 본문이 바뀌었다는 알림을 받았을 때만 읽는다.
  if (tocStale) {
    tocStale = false;
    const next = readToc();
    // 코드 탭 전환처럼 본문 안쪽만 바뀐 경우 헤딩은 그대로다. 그때 새 배열을
    // 돌려주면 아무것도 안 바뀐 채로 차례가 통째로 다시 그려진다.
    if (!isSameToc(tocSnapshot, next)) tocSnapshot = next;
  }
  return tocSnapshot;
};

/** 서버에는 DOM이 없다. 하이드레이션까지 빈 목록이고 그 직후 실제 헤딩이 온다. */
const getServerTocSnapshot = (): TOCItem[] => EMPTY_TOC;

const subscribeToc = (onStoreChange: () => void): (() => void) => {
  // 다른 글로 넘어와 본문이 통째로 갈렸을 수 있다 — 이전 글의 목록을 첫
  // 스냅샷으로 내보내지 않도록 구독 시점에 무효화한다.
  tocStale = true;

  const content = document.getElementById('post-content');
  // 본문이 없으면 지켜볼 것도 없다(예전 effect의 `if (!content) return`과 같다).
  if (!content) return () => undefined;

  const observer = new MutationObserver(() => {
    tocStale = true;
    onStoreChange();
  });
  observer.observe(content, { childList: true, subtree: true });
  return () => observer.disconnect();
};

export const useTocHook = () => {
  const toc = useSyncExternalStore(
    subscribeToc,
    getTocSnapshot,
    getServerTocSnapshot,
  );
  const [activeId, setActiveId] = useState('');
  // 지금 화면에 들어와 있는 헤딩들의 [첫, 마지막] 인덱스. 데스크톱 차례가
  // 레일을 **구간**으로 비추는 데 쓴다(아래 두 번째 effect 참고).
  const [activeRange, setActiveRange] = useState<[number, number] | null>(null);

  // 활성 항목은 **매번 스크롤 위치에서 처음부터 다시 계산**한다.
  //
  // 예전에는 IntersectionObserver 콜백을 Set에 누적해 두고 그 집합의 최소~최대
  // 구간을 비췄다. 문제가 둘이었다.
  //
  // 하나, 콜백이 한 번만 어긋나 이전 헤딩 id가 Set에 남으면 구간이 그 헤딩부터
  // 현재 헤딩까지 통째로 늘어난다 — 화면에는 "이전 위치가 그대로 남아 겹친"
  // 것처럼 보인다. 누적된 상태라 한 번 어긋나면 스스로 회복하지 못한다.
  //
  // 둘, 관찰 밴드가 화면 상단 20%뿐이라 헤딩이 밴드에 하나도 없는 구간
  // — 긴 섹션 중간, 그리고 히어로가 큰 글의 **첫 화면** — 에서는 Set이 비어
  // 아무것도 안 비쳤다.
  //
  // 스크롤할 때마다 기준선을 지난 마지막 헤딩을 새로 찾으면 누적될 상태가
  // 없어서 두 문제가 같이 사라지고, 항상 정확히 한 항목만 활성이 된다.
  useEffect(() => {
    if (toc.length === 0) return;

    let raf = 0;
    const compute = () => {
      raf = 0;
      const line = window.innerHeight * 0.2;
      // 기준선을 이미 지난 헤딩 중 마지막 것. 하나도 못 지났으면 첫 항목이
      // 활성이다(글 첫머리에서도 레일이 비어 보이지 않는다).
      let current = 0;
      // 동시에, 지금 화면 안에 **들어와 있는** 헤딩들의 범위도 잡는다.
      // 레퍼런스(fumadocs)는 IntersectionObserver로 같은 집합을 구해
      // 레일을 그 구간만큼 비춘다 — 화면에 보이는 절이 셋이면 셋이 함께
      // 밝다. 여기서도 같은 걸 스크롤마다 다시 계산할 뿐이라, 예전
      // 누적 Set 방식이 앓던 잔상은 여전히 생길 수 없다.
      let first = -1;
      let last = -1;
      toc.forEach((item, i) => {
        const el = document.getElementById(item.id);
        if (!el) return;
        const { top, bottom } = el.getBoundingClientRect();
        if (top <= line) current = i;
        // 헤더에 가려지는 구간(0 ~ HEADER_OFFSET)은 "보인다"로 치지 않는다.
        // 거기 걸친 헤딩까지 세면 아직 눈에 안 들어온 절이 레일에서 먼저
        // 켜진다.
        if (top >= HEADER_OFFSET && bottom <= window.innerHeight) {
          if (first === -1) first = i;
          last = i;
        }
      });

      // effect 첫 줄에서 toc.length > 0 을 확인했고 current는 forEach 인덱스라
      // 실제로는 항상 잡힌다. 못 잡으면 비출 항목이 없다는 뜻이라 그냥 둔다.
      const currentId = toc[current]?.id;
      if (currentId !== undefined) {
        setActiveId(prev => (prev === currentId ? prev : currentId));
      }
      // 헤딩이 하나도 안 보이는 구간(긴 절의 한복판)에서는 구간을 만들 수
      // 없다. 그때는 방금 지나온 절 한 줄만 비춘다.
      const range: [number, number] =
        first === -1 ? [current, current] : [first, last];
      setActiveRange(prev =>
        prev && prev[0] === range[0] && prev[1] === range[1] ? prev : range,
      );
    };
    // 렌더 중이 아니라 다음 프레임에 계산한다. 스크롤 이벤트가 몰려도
    // 프레임당 한 번만 돈다.
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [toc]);

  return { toc, activeId, activeRange };
};
