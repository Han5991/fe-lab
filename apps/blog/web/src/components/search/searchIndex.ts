import { isRecord } from '@blog/content';

/** 검색 색인(`public/search-index.json`)의 글 한 편. */
export interface SearchPost {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  series: string | null;
  /** 시리즈 제목. 이 필드가 없는 색인이면 화면은 id로 대신한다. */
  seriesTitle?: string | null;
  contentPreview: string;
}

// `blog-content search-index`가 `public/`에 쓰는 산출물 이름과 같다
// (`packages/@blog/content/src/scripts/generate-search-index.ts`).
const SEARCH_INDEX_URL = '/search-index.json';

/** 네트워크로 온 색인 항목을 확인된 필드로 다시 만든다 — slug·title이 없으면 버린다. */
export function toSearchPost(item: unknown): SearchPost | null {
  if (!isRecord(item)) return null;
  const {
    slug,
    title,
    date,
    excerpt,
    tags,
    series,
    seriesTitle,
    contentPreview,
  } = item;
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
    seriesTitle:
      typeof seriesTitle === 'string' && seriesTitle ? seriesTitle : null,
    contentPreview: typeof contentPreview === 'string' ? contentPreview : '',
  };
}

/** 색인을 받아 온다 — 실패 응답은 던져 "결과 없음"과 구분되게 한다. */
export async function fetchSearchIndex(): Promise<SearchPost[]> {
  const res = await fetch(SEARCH_INDEX_URL);
  if (!res.ok) throw new Error(`search index: HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('search index: not an array');
  return data.map(toSearchPost).filter(post => post !== null);
}
