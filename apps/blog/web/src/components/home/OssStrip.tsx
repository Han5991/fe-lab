import Link from 'next/link';
import { css } from '@blog/styled-system/css';
// leaf import — 홈에서만 쓰는 프레젠테이션 컴포넌트라 배럴을 물릴 이유가 없다.
import { postPath } from '@blog/content/client';
import { chip } from '@/src/components/chip';
import {
  mergedPrCount,
  OSS_CONTRIBUTIONS,
} from '@/src/components/ossContributions';

/**
 * 오픈소스 기여를 칩 한 줄로만 노출합니다. 네비에서는 뺐고(SPEC §1), 자세한
 * 내용은 /about/ 이 담당하므로 여기서는 "어디에 기여했는지"만 보여줍니다.
 * 칩 목록과 숫자는 /about과 같은 출처(`ossContributions.ts`)에서 읽습니다.
 */

/** 프로젝트 칩 — 글자가 코드 이름이라 mono다(`chip` 머리 주석). 크기는 승인 목업의 13px. */
const projectChip = css(chip.raw({ tone: 'neutral' }), {
  fontFamily: 'mono',
  fontSize: '[13px]',
});

const mergedChip = chip({ tone: 'accent' });

const CAPTION_ID = 'oss-strip-caption';

export const OssStrip = () => {
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
          <span className={mergedChip}>{mergedPrCount()}+ merged</span>
        </li>
        {OSS_CONTRIBUTIONS.map(item => (
          <li key={item.slug}>
            <Link href={postPath(item.slug)} className={projectChip}>
              {item.project}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
