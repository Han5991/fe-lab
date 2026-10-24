import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { css } from '@blog/styled-system/css';
import type { ReactNode } from 'react';

import { actionButton } from '@/src/components/actionButton';

interface HomeSectionProps {
  /** 제목 요소의 id — 섹션(region 랜드마크)의 이름이 이 제목에서 온다. */
  id: string;
  title: string;
  /** 제목 행 오른쪽의 "더 보기" 링크(ghost 버튼). */
  more: { href: string; label: string };
  children: ReactNode;
}

/**
 * 홈의 글 섹션(최근 글 · 지난 글) — Astryx BlogShowcase의 머리 행: display2 제목과 ghost "더 보기"가
 * 양끝, 글줄 기준선에 맞춘다. 좁아서 한 줄에 못 들면 링크가 아래 줄로 내려간다.
 */
export const HomeSection = ({
  id,
  title,
  more,
  children,
}: HomeSectionProps) => (
  <section
    aria-labelledby={id}
    className={css({ display: 'flex', flexDir: 'column', gap: '8' })}
  >
    <div
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        rowGap: '2',
      })}
    >
      <h2 id={id} className={css({ textStyle: 'display2' })}>
        {title}
      </h2>
      <Link href={more.href} className={actionButton({ tone: 'ghost' })}>
        {more.label}
        <ArrowRight size={16} />
      </Link>
    </div>
    {children}
  </section>
);
