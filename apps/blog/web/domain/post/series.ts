import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const postsDirectory = join(process.cwd(), '..', 'posts');

export interface SeriesMeta {
  name: string;
  title?: string | undefined;
  description?: string | undefined;
  order?: string[] | undefined;
}

const _metaCache = new Map<string, SeriesMeta | null>();

export function getSeriesMeta(seriesName: string): SeriesMeta | null {
  if (process.env.NODE_ENV !== 'development' && _metaCache.has(seriesName)) {
    return _metaCache.get(seriesName) ?? null;
  }

  // 확장자는 `_series.yml` 하나만 본다. `.yaml`도 받아 주면 같은 뜻의 파일이 두
  // 이름으로 공존할 수 있고, 그때 어느 쪽이 이기는지는 후보 배열의 순서에만
  // 적혀 있다 — 혼자 쓰는 저장소에서 그 규칙을 기억할 이유가 없다.
  const filePath = join(postsDirectory, seriesName, '_series.yml');

  if (!existsSync(filePath)) {
    _metaCache.set(seriesName, null);
    return null;
  }

  const raw = readFileSync(filePath, 'utf8');
  const { data } = matter(`---\n${raw}\n---\n`);

  const meta: SeriesMeta = {
    name: seriesName,
    title: typeof data['title'] === 'string' ? data['title'] : undefined,
    description:
      typeof data['description'] === 'string' ? data['description'] : undefined,
    order: Array.isArray(data['order'])
      ? data['order'].filter((s): s is string => typeof s === 'string')
      : undefined,
  };

  _metaCache.set(seriesName, meta);
  return meta;
}

/**
 * 이 폴더를 "시리즈"로 볼 것인가 — **`_series.yml`이 있으면 시리즈다.**
 *
 * 폴더는 그냥 폴더다. 주제별로 정리해 둔 것도 있고, 고쳐 쓰는 동안 비슷한
 * 글을 모아 둔 것도 있다. 그중 "이어서 읽는 글"인 폴더만 시리즈다.
 *
 * 예전에는 2편 이상이면 선언 없이도 시리즈가 됐다. 그러면 파일을 폴더에
 * 넣는 것만으로 배지·시리즈 목록·검색 결과·OG 카드가 전부 따라붙어서,
 * 묶어 두려면 시리즈를 감수하거나 폴더를 포기하거나 둘 중 하나였다.
 * 지금은 저자가 `_series.yml`을 두는 것으로만 시리즈가 된다.
 *
 * 편수는 보지 않는다. 1편뿐인 연재 시작도 선언했다면 시리즈이고,
 * 8편이 모인 폴더라도 선언이 없으면 그냥 폴더다.
 */
export function isSeriesFolder(
  seriesName: string,
  // 디스크 접근(`_series.yml`)을 주입할 수 있게 열어 둔다 — 스크립트의 단위
  // 테스트가 실제 posts/ 폴더 상태에 따라 흔들리지 않도록.
  // `undefined`(미지정 → 디스크 조회)와 `null`(메타 없음)이 여기서 구분된다.
  meta?: SeriesMeta | null,
): boolean {
  return (meta === undefined ? getSeriesMeta(seriesName) : meta) !== null;
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
