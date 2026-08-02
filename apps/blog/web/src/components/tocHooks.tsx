'use client';

import { useEffect, useState } from 'react';

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
      let current = toc[0].id;
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top > line) break;
        current = item.id;
      }
      setActiveId(prev => (prev === current ? prev : current));
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

  return { toc, activeId };
};
