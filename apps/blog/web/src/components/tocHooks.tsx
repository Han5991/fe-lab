import { useEffect, useState } from 'react';

export const scrollToId = ({
  id,
  headerOffset,
  closeCallBack,
}: {
  id: string;
  headerOffset: number;
  closeCallBack?: () => void;
}) => {
  const el = document.getElementById(id);
  if (el) {
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
    closeCallBack && closeCallBack();
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
    // DOM이 렌더링된 후 헤더를 찾습니다.
    const updateToc = () => {
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

      setToc(items);
    };

    const timer = setTimeout(updateToc, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0px 0px -80% 0px' },
    );

    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  return { toc, activeId };
};
