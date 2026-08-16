'use client';

import { useEffect, useState } from 'react';

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

export const useTocHook = () => {
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState('');
  // 지금 화면에 들어와 있는 헤딩들의 [첫, 마지막] 인덱스. 데스크톱 차례가
  // 레일을 **구간**으로 비추는 데 쓴다(아래 두 번째 effect 참고).
  const [activeRange, setActiveRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    const content = document.getElementById('post-content');
    if (!content) return;

    const headers = content.querySelectorAll('h1, h2, h3, h4');
    const items = Array.from(headers)
      .map(header => ({
        id: header.id,
        text: header.textContent || '',
        level: parseInt(header.tagName.substring(1)),
      }))
      .filter(item => item.id);

    // 마운트 시점 DOM 파싱 결과를 상태로 옮기는 정당한 외부 시스템 sync.
    // useSyncExternalStore로 모델링 가능하지만 1회성 측정이라 over-engineering.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(DOM) 1회 측정
    setToc(items);
  }, []);

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

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- effect 첫 줄에서 toc.length > 0 을 확인했고 current는 forEach 인덱스다
      const currentId = toc[current]!.id;
      setActiveId(prev => (prev === currentId ? prev : currentId));
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
