'use client';

import { motion, useScroll } from 'motion/react';
import { css } from '@design-system/ui-lib/css';

export const ReadingProgressBar = () => {
    const { scrollYProgress } = useScroll();

    return (
        <motion.div
            className={css({
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                bg: 'blue.500',
                transformOrigin: '0%',
                zIndex: 100,
            })}
            style={{ scaleX: scrollYProgress }}
        />
    );
};
