'use client';

import type { ReactNode } from 'react';
import { Ssgoi } from '@ssgoi/react';
import { fade, drill } from '@ssgoi/react/view-transitions';
import { css } from '@design-system/ui-lib/css';

export const PageTransition = ({ children }: { children: ReactNode }) => (
  <Ssgoi
    config={{
      defaultTransition: fade(),
      transitions: [
        {
          from: '/posts',
          to: '/posts/*',
          transition: drill({ direction: 'enter' }),
        },
        {
          from: '/posts/*',
          to: '/posts',
          transition: drill({ direction: 'exit', opacity: true }),
        },
      ],
    }}
  >
    <div className={css({ pos: 'relative', w: 'full' })}>{children}</div>
  </Ssgoi>
);
