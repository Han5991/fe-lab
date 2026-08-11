import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { TagSummary } from '@/domain/post/aggregate';
import { tagPillStyle } from '@/src/components/blog/tagPillStyle';

/** 홈에 노출할 태그 수. 빈도 내림차순 상위만 세우고 나머지는 `/posts/`가 받는다. */
export const HOME_TAG_COUNT = 12;

/**
 * 홈에 세울 태그의 최소 글 수.
 *
 * 한 번만 쓰인 태그는 **묶음이 아니다** — 눌러도 글 한 편짜리 목록이 나오므로
 * 글 제목을 한 번 더 보여주는 것과 다르지 않다. 지금 태그 분포는 꼬리가 길어서
 * (`build 1`, `baseUrl 1` …) 문턱이 없으면 이 면의 절반이 그런 값으로 찬다.
 * 태그 전체는 `/posts/`의 필터가 계속 보여준다.
 */
export const HOME_TAG_MIN_COUNT = 2;

/**
 * 이 면이 세울 태그가 하나라도 있는가.
 *
 * 밴드 머리(`DiscoveryBand`)는 목록 **밖**에 있어서 목록이 스스로 비었다고
 * 판단해 `null`을 내도 헤더와 "태그 전체 →"만 남는다. 호출부가 면 전체를
 * 걷어낼 수 있도록 판정을 여기서 내보낸다 — 문턱 규칙이 두 곳에 복사되면
 * 한쪽만 바뀌어 헤더와 목록의 판단이 어긋난다.
 */
export const hasHomeTags = (
  tags: TagSummary[],
  minCount: number = HOME_TAG_MIN_COUNT,
): boolean => tags.some(tag => tag.count >= minCount);

interface TagBandProps {
  tags: TagSummary[];
  /** 목록을 이름 짓는 밴드 라벨의 id. */
  labelledBy: string;
  limit?: number;
  minCount?: number;
}

/**
 * "태그로 읽기" 면 — 상위 태그를 글 수와 함께 칩으로 세운다.
 *
 * 시리즈 면이 **묶음** 축이라면 이쪽은 **주제** 축이다. 시리즈에 속하지 않은
 * 낱글(현재 홈에서 가장 찾기 어려운 부류)이 여기서 처음으로 묶여 보인다.
 *
 * 칩은 목록 계열이 공유하는 `tagPillStyle`을 그대로 쓴다 — 홈만 다른 모양의
 * 태그를 갖게 되면 `/posts/`로 넘어갔을 때 같은 것이 다르게 보인다.
 * 글 수는 칩 안에서 한 단계 흐리게 둔다: 태그 이름이 링크의 이름이고 숫자는
 * 부연이다.
 */
export const TagBand = ({
  tags,
  labelledBy,
  limit = HOME_TAG_COUNT,
  minCount = HOME_TAG_MIN_COUNT,
}: TagBandProps) => {
  const shown = tags.filter(tag => tag.count >= minCount).slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <ul
      aria-labelledby={labelledBy}
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        gap: '[7px]',
        listStyleType: 'none',
        p: '0',
        m: '[14px 0 0]',
      })}
    >
      {shown.map(tag => (
        <li key={tag.id}>
          <Link
            href={`/posts/?tag=${encodeURIComponent(tag.id)}`}
            className={css(tagPillStyle, {
              gap: '[6px]',
              transition: '[color 0.15s, background-color 0.15s]',
              _hover: { bg: 'paper.300', color: 'ink.950' },
            })}
          >
            {tag.id}
            <span
              className={css({
                fontFamily: 'mono',
                fontWeight: 'normal',
                color: 'ink.500',
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {tag.count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};
