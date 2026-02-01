'use client';

import { useState, useEffect } from 'react';
import { css } from '@design-system/ui-lib/css';

interface TOCItem {
    id: string;
    text: string;
    level: number;
}

export const DesktopTOC = () => {
    const [toc, setToc] = useState<TOCItem[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        // DOM이 렌더링된 후 헤더를 찾습니다.
        const updateToc = () => {
            const content = document.getElementById('post-content');
            if (!content) return;

            const headers = content.querySelectorAll('h1, h2, h3');
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
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '0px 0px -80% 0px' }
        );

        toc.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [toc]);

    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const headerOffset = 100;
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    if (toc.length === 0) return null;

    return (
        <nav
            className={css({
                position: 'sticky',
                top: '120px',
                alignSelf: 'start',
                display: 'none',
                lg: { display: 'block' }, // 데스크탑에서만 표시
                w: '240px',
                maxH: 'calc(100vh - 140px)',
                overflowY: 'auto',
                pl: '4',
                borderLeftWidth: '1px',
                borderColor: 'gray.100',
            })}
        >
            <h4 className={css({ textTransform: 'uppercase', fontSize: 'xs', fontWeight: 'bold', color: 'gray.400', mb: '4', letterSpacing: 'wider' })}>
                On this page
            </h4>
            <ul className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                {toc.map((item, index) => (
                    <li
                        key={index}
                        onClick={() => scrollToId(item.id)}
                        className={css({
                            pl: item.level === 3 ? '4' : '0',
                            fontSize: 'sm',
                            color: activeId === item.id ? 'blue.600' : 'gray.500',
                            fontWeight: activeId === item.id ? 'bold' : 'medium',
                            cursor: 'pointer',
                            lineHeight: '1.4',
                            transition: 'all 0.2s',
                            borderLeftWidth: '2px',
                            borderLeftColor: activeId === item.id ? 'blue.600' : 'transparent',
                            ml: '-17px', // border-left를 위한 보정 (1px + 16px pl)
                            paddingLeft: '15px',
                            _hover: { color: 'gray.900' },
                        })}
                    >
                        {item.text}
                    </li>
                ))}
            </ul>
        </nav>
    );
};
