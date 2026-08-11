import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import { MERGED_PR_COUNT_FALLBACK } from '@/lib/constants';
import { DiscoveryBand } from '@/src/components/blog/DiscoveryBand';

/**
 * 오픈소스 기여를 칩 한 줄로만 노출합니다. 네비에서는 뺐고(SPEC §1), 자세한
 * 내용은 /about/ 이 담당하므로 여기서는 "어디에 기여했는지"만 보여줍니다.
 *
 * 칩 목록·링크는 `src/app/about/page.tsx`의 기여 데이터와 같은 출처입니다.
 * about 쪽을 고칠 때 여기도 함께 갱신하세요.
 */
const OSS_CHIPS = [
  { label: 'node.js', href: '/posts/nodejs-contribution/' },
  { label: 'next.js', href: '/posts/nextjs-contributor/' },
  { label: 'gemini-cli', href: '/posts/ai-opensource-contribution/' },
  { label: 'mantine', href: '/posts/first-open-source-contribution/' },
] as const;

const chip = css({
  display: 'inline-block',
  fontFamily: 'mono',
  fontWeight: 'normal',
  fontSize: '[12px]',
  color: 'ink.500',
  bg: 'paper.100',
  rounded: 'control',
  px: '[11px]',
  py: '[4px]',
});

const chipLink = css({
  transition: '[color 0.15s]',
  _hover: { color: 'ink.950' },
});

const chipHighlight = css({ color: 'accent.600' });

const CAPTION_ID = 'oss-strip-caption';

export const OssStrip = () => {
  // about 페이지와 같은 규칙: CI가 NEXT_PUBLIC_PR_COUNT를 주입, 없으면 폴백.
  const mergedPrCount = process.env.NEXT_PUBLIC_PR_COUNT
    ? process.env.NEXT_PUBLIC_PR_COUNT
    : MERGED_PR_COUNT_FALLBACK;

  return (
    // section에 이름이 없으면 이름 없는 region 랜드마크로 노출된다 → 제목과 연결.
    <section aria-labelledby={CAPTION_ID}>
      {/* 홈의 마지막 발견 면이다. 위의 대표/최근/시리즈/태그와 같은 밴드 머리를
          쓴다 — 여기만 다른 모양의 라벨을 달면 면 넷은 한 체계, 이건 딴 것으로
          읽힌다. 칩 목록 자체는 그대로다. */}
      <DiscoveryBand
        id={CAPTION_ID}
        title="오픈소스 기여"
        more={{ href: '/about/', label: '소개 →' }}
      />
      <ul
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '[8px]',
          listStyleType: 'none',
          p: '0',
          m: '[14px 0 0]',
        })}
      >
        {OSS_CHIPS.map(item => (
          <li key={item.label}>
            <Link href={item.href} className={cx(chip, chipLink)}>
              {item.label}
            </Link>
          </li>
        ))}
        <li>
          <span className={cx(chip, chipHighlight)}>
            {mergedPrCount}+ merged
          </span>
        </li>
      </ul>
    </section>
  );
};
