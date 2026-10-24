import { POSTS_PATH } from '@blog/content/client';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { css } from '@blog/styled-system/css';

import { actionButton } from '@/src/components/actionButton';
import {
  SOCIAL_LINKS,
  ShellLink,
  type SocialLabel,
} from '@/src/components/shellLinks';

/**
 * 바깥 채널 버튼의 tone — 목록 자체는 셸의 `SOCIAL_LINKS`(헤더·푸터 아이콘과 같은 출처)이고, 히어로가
 * 정하는 건 모양뿐이다. 주 행동(모든 글 보기) 다음 자리라 GitHub가 보조(neutral), RSS가 가장 약한
 * ghost다(승인 목업).
 */
const SOCIAL_TONE = {
  GitHub: 'neutral',
  RSS: 'ghost',
} as const satisfies Record<SocialLabel, 'neutral' | 'ghost'>;

/**
 * 소개 문단의 한 문장 — sm(640) 이상에서만 제 줄을 차지한다. 문장 하나가 한 줄에 드는 폭부터 문장마다
 * 끊고, 그보다 좁으면 이어 흐른다. 줄바꿈(`<br>`)을 박아 두면 375에서 첫 문장이 접히며 "엔지니어."가
 * 한 줄에 혼자 남았다.
 */
const introSentence = css({ display: { sm: 'block' } });

export const Hero = () => {
  return (
    // <header>로 감싸면 Chrome이 main 안에서도 banner 랜드마크로 노출해
    // 사이트 헤더와 banner가 둘이 된다(axe: no-duplicate-banner). 그냥 div.
    //
    // 레퍼런스는 우측 210px에 장식 다이어그램 모티프를 뒀지만 걷어냈다.
    // `aria-hidden` 장식이라 정보가 0인데, 정작 다이어그램이 의미를 갖는 자리
    // (글 히어로·본문)와 언어가 겹쳐 그쪽 무게를 깎았다. 다이어그램은 글 안에서만
    // 쓴다.
    <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
      {/* 페이지의 최상위 제목 — 본문 잉크(ink.950). 아래 소개 문단(ink.700)과는 크기·굵기·명도로 갈린다. */}
      <h1 className={css({ textStyle: 'display1' })}>한상욱</h1>
      {/* 승인 목업의 문단 폭 상한(752)은 두지 않았다 — 문장마다 줄을 끊어 두 줄 다 그보다 짧다. */}
      <p className={css({ textStyle: 'large', color: 'ink.700' })}>
        <span className={introSentence}>
          구조를 그려서 문제를 푸는 프론트엔드 엔지니어.
        </span>{' '}
        <span className={introSentence}>
          디자인 시스템, 모노레포, 배포 파이프라인을 다룹니다.
        </span>
      </p>
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2',
          mt: '2',
        })}
      >
        <Link
          href={POSTS_PATH}
          className={actionButton({ tone: 'solid', size: 'lg' })}
        >
          모든 글 보기
          <ArrowRight size={16} />
        </Link>
        {SOCIAL_LINKS.map(({ label, href, kind }) => (
          <ShellLink
            key={label}
            href={href}
            kind={kind}
            className={actionButton({ tone: SOCIAL_TONE[label], size: 'lg' })}
          >
            {label}
          </ShellLink>
        ))}
      </div>
    </div>
  );
};
