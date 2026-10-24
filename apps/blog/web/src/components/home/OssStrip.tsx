import { MERGED_PR_COUNT_FALLBACK } from '@/content.values.mts';
import Link from 'next/link';
import { css } from '@blog/styled-system/css';
// leaf import — 홈에서만 쓰는 프레젠테이션 컴포넌트라 배럴을 물릴 이유가 없다.
import { postPath } from '@blog/content/client';
import { chip } from '@/src/components/chip';

/**
 * 오픈소스 기여를 칩 한 줄로만 노출합니다. 네비에서는 뺐고(SPEC §1), 자세한
 * 내용은 /about/ 이 담당하므로 여기서는 "어디에 기여했는지"만 보여줍니다.
 *
 * 칩 목록·링크는 `src/app/about/page.tsx`의 기여 데이터와 같은 출처입니다.
 * about 쪽을 고칠 때 여기도 함께 갱신하세요.
 */
const OSS_CHIPS = [
  { label: 'node.js', href: postPath('nodejs-contribution') },
  { label: 'next.js', href: postPath('nextjs-contributor') },
  { label: 'gemini-cli', href: postPath('ai-opensource-contribution') },
  { label: 'mantine', href: postPath('first-open-source-contribution') },
] as const;

/** 프로젝트 칩 — 글자가 코드 이름이라 mono다(`chip` 머리 주석). 크기는 승인 목업의 13px. */
const projectChip = css(chip.raw({ tone: 'neutral' }), {
  fontFamily: 'mono',
  fontSize: '[13px]',
});

const mergedChip = chip({ tone: 'accent' });

const CAPTION_ID = 'oss-strip-caption';

export const OssStrip = () => {
  // about 페이지와 같은 규칙: CI가 NEXT_PUBLIC_PR_COUNT를 주입, 없으면 폴백.
  const mergedPrCount = process.env.NEXT_PUBLIC_PR_COUNT
    ? process.env.NEXT_PUBLIC_PR_COUNT
    : MERGED_PR_COUNT_FALLBACK;

  return (
    // section에 이름이 없으면 이름 없는 region 랜드마크로 노출된다 → 제목과 연결.
    // 섹션 사이 간격은 홈 페이지가 준다(`gap: 'section'`).
    <section
      aria-labelledby={CAPTION_ID}
      className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
    >
      <h2 id={CAPTION_ID} className={css({ textStyle: 'display3' })}>
        오픈소스 기여
      </h2>
      <ul
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '2',
          listStyleType: 'none',
          p: '0',
          m: '0',
        })}
      >
        {/* 합계가 줄의 맨 앞이다 — 프로젝트 칩은 그 숫자의 출처 몇 곳이다. */}
        <li>
          <span className={mergedChip}>{mergedPrCount}+ merged</span>
        </li>
        {OSS_CHIPS.map(item => (
          <li key={item.label}>
            <Link href={item.href} className={projectChip}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
