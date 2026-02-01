'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';

interface TOCItem {
    id: string;
    text: string;
    level: number;
}

export const MobileTOC = () => {
    const [isOpen, setIsOpen] = useState(false);
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

        // ReactMarkdown 렌더링 타이밍을 고려해 약간 지연
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
            // 헤더 높이만큼 오프셋을 줌 (약 80px)
            const headerOffset = 80;
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            setIsOpen(false);
        }
    };

    if (toc.length === 0) return null;

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                className={css({
                    position: 'fixed',
                    bottom: '20',
                    right: '6',
                    w: '12',
                    h: '12',
                    bg: 'white',
                    rounded: 'full',
                    shadow: 'lg',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'gray.600',
                    borderWidth: '1px',
                    borderColor: 'gray.200',
                    zIndex: 39,
                    cursor: 'pointer',
                    _hover: { color: 'blue.600', borderColor: 'blue.200' },
                })}
            >
                <List size={24} />
            </motion.button>

            {/* Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className={css({
                                position: 'fixed',
                                inset: 0,
                                bg: 'black',
                                zIndex: 50,
                            })}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={css({
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                bg: 'white',
                                zIndex: 51,
                                roundedTop: '2xl',
                                maxH: '70vh',
                                display: 'flex',
                                flexDirection: 'column',
                                shadow: '2xl',
                                paddingBottom: 'safe-area-inset-bottom', // iOS safe area
                            })}
                        >
                            <div className={css({ p: '5', borderBottomWidth: '1px', borderColor: 'gray.100', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                                <h2 className={css({ fontSize: 'lg', fontWeight: 'bold' })}>목차</h2>
                                <button onClick={() => setIsOpen(false)}>
                                    <X size={24} className={css({ color: 'gray.400' })} />
                                </button>
                            </div>
                            <div className={css({ p: '5', overflowY: 'auto', flex: 1 })}>
                                <ul className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                                    {toc.map((item, index) => (
                                        <li key={index}
                                            onClick={() => scrollToId(item.id)}
                                            className={css({
                                                pl: item.level === 3 ? '4' : (item.level === 2 ? '2' : '0'),
                                                fontSize: 'md',
                                                fontWeight: activeId === item.id ? 'bold' : 'medium',
                                                color: activeId === item.id ? 'blue.600' : 'gray.600',
                                                cursor: 'pointer',
                                                transition: 'color 0.2s',
                                                _hover: { color: 'blue.600' }
                                            })}
                                        >
                                            {item.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
