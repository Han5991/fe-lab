import Link from 'next/link';
import { css, cva } from '@design-system/ui-lib/css';
// leaf import — 홈에서만 쓰는 프레젠테이션 컴포넌트라 배럴을 물릴 이유가 없다.
import { postPath } from '@/domain/post/urls';
import { MERGED_PR_COUNT_FALLBACK } from '@/lib/shared/constants';

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

const chip = cva({
  base: {
    display: 'inline-block',
    fontFamily: 'mono',
    fontWeight: 'normal',
    fontSize: '[12px]',
    color: 'ink.500',
    bg: 'paper.100',
    rounded: 'control',
    px: '[11px]',
    py: '[4px]',
  },
  variants: {
    kind: {
      link: {
        transition: '[color 0.15s]',
        _hover: { color: 'ink.950' },
      },
      highlight: { color: 'accent.600' },
    },
  },
});

const CAPTION_ID = 'oss-strip-caption';

export const OssStrip = () => {
  // about 페이지와 같은 규칙: CI가 NEXT_PUBLIC_PR_COUNT를 주입, 없으면 폴백.
  const mergedPrCount = process.env.NEXT_PUBLIC_PR_COUNT
    ? process.env.NEXT_PUBLIC_PR_COUNT
    : MERGED_PR_COUNT_FALLBACK;

  return (
    // section에 이름이 없으면 이름 없는 region 랜드마크로 노출된다 → 제목과 연결.
    <section aria-labelledby={CAPTION_ID} className={css({ mt: '[26px]' })}>
      <h2
        id={CAPTION_ID}
        className={css({
          fontSize: '[12px]',
          fontWeight: 'normal',
          color: 'ink.600',
          mb: '[10px]',
        })}
      >
        오픈소스 기여
      </h2>
      <ul
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '[8px]',
          listStyleType: 'none',
          p: '0',
          m: '0',
        })}
      >
        {OSS_CHIPS.map(item => (
          <li key={item.label}>
            <Link href={item.href} className={chip({ kind: 'link' })}>
              {item.label}
            </Link>
          </li>
        ))}
        <li>
          <span className={chip({ kind: 'highlight' })}>
            {mergedPrCount}+ merged
          </span>
        </li>
      </ul>
    </section>
  );
};
