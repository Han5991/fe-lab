import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { CONTENT } from '../../lib/shared/contentConfig';
import { CONTENT_PATHS } from '../../lib/shared/contentPaths';

// repository.ts와 **같은** 설정 값이다. 예전에는 두 파일이 각자
// `join(process.cwd(), '..', 'posts')`를 선언해, 한쪽만 어긋나면 시리즈
// 메타만 조용히 사라질 수 있었다(아래 getSeriesMeta의 경고 참고).
const postsDirectory = CONTENT_PATHS.postsDir;

export interface SeriesMeta {
  name: string;
  title?: string | undefined;
  description?: string | undefined;
  order?: string[] | undefined;
}

const _metaCache = new Map<string, SeriesMeta | null>();

export function getSeriesMeta(seriesName: string): SeriesMeta | null {
  if (!CONTENT.runtime.isDevelopment() && _metaCache.has(seriesName)) {
    return _metaCache.get(seriesName) ?? null;
  }

  // 시리즈 폴더 자체가 없다 = 경로 불일치다. seriesName은 실제 폴더 스캔
  // (repository.ts)에서 온 값이라, 폴더가 안 보이면 "시리즈가 아님"이 아니라
  // 이쪽의 postsDirectory가 다른 곳을 보고 있다는 뜻이다. 예전에는 이 경우에도
  // 조용히 null이라 시리즈 표시명·order 정렬·nav가 통째로 사라진 채 빌드가
  // 성공했고, 앱 런타임은 멀쩡해 로컬 dev에서 재현되지 않았다. 최소한 경고를
  // 남긴다 — 계약 자체는 contract.test.ts("시리즈로 선언된 폴더는 메타를 읽을
  // 수 있어야 한다")가 잠근다.
  const seriesDir = join(postsDirectory, seriesName);
  if (!existsSync(seriesDir)) {
    console.warn(
      `[series] 시리즈 폴더를 찾을 수 없습니다: ${seriesDir} — ` +
        `defineContent의 dirs.content가 실제 posts 위치와 어긋났거나, ` +
        `실제 스캔에 없는 폴더 이름을 직접 조회한 것일 수 있습니다(테스트 등).`,
    );
    _metaCache.set(seriesName, null);
    return null;
  }

  // 확장자는 `_series.yml` 하나만 본다. `.yaml`도 받아 주면 같은 뜻의 파일이 두
  // 이름으로 공존할 수 있고, 그때 어느 쪽이 이기는지는 후보 배열의 순서에만
  // 적혀 있다 — 혼자 쓰는 저장소에서 그 규칙을 기억할 이유가 없다.
  const filePath = join(seriesDir, '_series.yml');

  if (!existsSync(filePath)) {
    // 폴더는 있는데 `_series.yml`이 없다 — 정상적인 "시리즈 아님" 판정.
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
