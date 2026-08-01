import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const postsDirectory = join(process.cwd(), '..', 'posts');

export interface SeriesMeta {
  name: string;
  title?: string;
  description?: string;
  order?: string[];
}

const _metaCache = new Map<string, SeriesMeta | null>();

export function getSeriesMeta(seriesName: string): SeriesMeta | null {
  if (process.env.NODE_ENV !== 'development' && _metaCache.has(seriesName)) {
    return _metaCache.get(seriesName) ?? null;
  }

  const candidates = ['_series.yml', '_series.yaml'].map(name =>
    join(postsDirectory, seriesName, name),
  );
  const filePath = candidates.find(p => existsSync(p)) ?? null;

  if (!filePath) {
    _metaCache.set(seriesName, null);
    return null;
  }

  const raw = readFileSync(filePath, 'utf8');
  const { data } = matter(`---\n${raw}\n---\n`);

  const meta: SeriesMeta = {
    name: seriesName,
    title: typeof data.title === 'string' ? data.title : undefined,
    description:
      typeof data.description === 'string' ? data.description : undefined,
    order: Array.isArray(data.order)
      ? data.order.filter((s): s is string => typeof s === 'string')
      : undefined,
  };

  _metaCache.set(seriesName, meta);
  return meta;
}

export function clearSeriesMetaCache(): void {
  _metaCache.clear();
}

/** 폴더 이름만으로 시리즈가 되기 위한 최소 편수. */
export const SERIES_MIN_POSTS = 2;

/**
 * 이 폴더를 "시리즈"로 볼 것인가.
 *
 * 시리즈는 frontmatter가 아니라 폴더 경로로 결정된다(`repository.ts`). 그래서
 * 주제별로 글을 묶어 둔 폴더까지 전부 시리즈가 되어, 한 편짜리 폴더가
 * `시리즈 · testing 1/1` 같은 배지를 달고 시리즈 목록·필터에 섞였다.
 * "여러 편으로 이어지는 글"이라는 시리즈의 뜻과 맞지 않는다.
 *
 * 판정은 둘 중 하나다:
 * - `_series.yml` 이 있다 → 편수와 무관하게 저자가 시리즈로 선언한 것
 * - 글이 2편 이상이다 → 선언이 없어도 실제로 이어지는 글
 *
 * 한 편짜리 폴더는 글이 하나 더 들어오는 순간 자동으로 시리즈가 된다.
 */
export function isSeriesFolder(seriesName: string, postCount: number): boolean {
  if (postCount >= SERIES_MIN_POSTS) return true;
  return getSeriesMeta(seriesName) !== null;
}

/**
 * 시리즈 내 포스트 정렬.
 * `_series.yml`에 `order` 배열이 있으면 그 순서를 우선시하고, 없으면 date 오름차순.
 * (서로 다른 호출부에서 같은 로직을 반복하던 것을 한 곳으로 모음.)
 */
export function sortPostsBySeriesOrder<
  T extends {
    slug: string;
    originalSlug: string;
    date?: string | null;
  },
>(posts: T[], order: string[] | undefined): T[] {
  if (order && order.length > 0) {
    const orderMap = new Map(order.map((s, i) => [s, i]));
    return [...posts].sort((a, b) => {
      const aRank =
        orderMap.get(a.slug) ??
        orderMap.get(a.originalSlug) ??
        Number.POSITIVE_INFINITY;
      const bRank =
        orderMap.get(b.slug) ??
        orderMap.get(b.originalSlug) ??
        Number.POSITIVE_INFINITY;
      if (aRank === bRank) {
        return (a.date ?? '').localeCompare(b.date ?? '');
      }
      return aRank - bRank;
    });
  }
  return [...posts].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}
