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
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (toc.length === 0) return;

    // 화면에 걸쳐 있는 헤딩을 **집합**으로 들고 있는다. 데스크톱 차례는 이 구간을
    // 레일에 비추고(여러 개가 동시에 활성), 모바일 차례는 그중 첫 항목만 쓴다.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
            setActiveId(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        });
        // 문서 순서를 유지해야 레일 구간이 위아래로 이어진다.
        setVisibleIds(toc.filter(i => visible.has(i.id)).map(i => i.id));
      },
      { rootMargin: '0px 0px -80% 0px' },
    );

    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  return { toc, activeId, visibleIds };
};
