import { isRecord } from '@blog/content';

/** 검색 색인(`public/search-index.json`)의 글 한 편. */
export interface SearchPost {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  /** 시리즈 id(폴더 경로). 화면은 제목 표로 바꿔 보인다. */
  series: string | null;
  contentPreview: string;
}

// `blog-content search-index`가 `public/`에 쓰는 산출물 이름과 같다
// (`packages/@blog/content/src/scripts/generate-search-index.ts`).
const SEARCH_INDEX_URL = '/search-index.json';

/**
 * 색인 항목을 확인된 필드로 **다시 만든다.** 색인은 네트워크로 오는 외부 입력이라
 * 모양을 단정하지 않는다 — 필수(slug·title)가 없으면 버리고 나머지는 빈 값으로 둔다.
 */
export function toSearchPost(item: unknown): SearchPost | null {
  if (!isRecord(item)) return null;
  const { slug, title, date, excerpt, tags, series, contentPreview } = item;
  if (typeof slug !== 'string' || typeof title !== 'string') return null;
  return {
    slug,
    title,
    date: typeof date === 'string' ? date : null,
    excerpt: typeof excerpt === 'string' ? excerpt : '',
    tags: Array.isArray(tags)
      ? tags.filter((t): t is string => typeof t === 'string')
      : [],
    series: typeof series === 'string' && series ? series : null,
    contentPreview: typeof contentPreview === 'string' ? contentPreview : '',
  };
}

/**
 * 색인을 받아 온다. 응답이 실패(4xx/5xx)면 던진다 — 예전엔 `res.ok`를 보지 않아
 * 404 HTML을 JSON으로 읽다 실패한 것이 콘솔에만 남고, 다이얼로그는 "검색 결과가
 * 없습니다"인 채로 영영 비어 있었다.
 */
export async function fetchSearchIndex(): Promise<SearchPost[]> {
  const res = await fetch(SEARCH_INDEX_URL);
  if (!res.ok) throw new Error(`search index: HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('search index: not an array');
  return data.map(toSearchPost).filter(post => post !== null);
}
