import { isRecord } from '@blog/content/client';

/**
 * 검색의 **순수 부분** — 인덱스 파싱, 필터링, 스니펫, 하이라이트 조각.
 *
 * 화면(`SearchDialog.svelte`)에서 떼어 둔 이유는 테스트다. 이 규칙들이 조용히
 * 어긋나면 "검색은 되는데 아무것도 안 나오는" 상태가 되는데, 빌드도
 * `check-seo`도 통과한다. 화면 없이 확인할 수 있어야 한다.
 *
 * `apps/blog/web/src/components/search/SearchDialog.tsx`가 대응 코드다.
 * 필터 대상 필드(제목·발췌·태그·시리즈·본문 미리보기)와 상한(10건)을 맞췄다 —
 * 결과 목록이 다르면 프레임워크 비교가 아니라 검색 정책 비교가 된다.
 */

/**
 * 빌드 산출물 `/search-index.json`의 한 항목.
 *
 * 이 모양의 단일 출처는 `@blog/content`의 `generate-search-index`다. 여기서
 * 타입을 다시 적는 것은 **클라이언트 그래프**이기 때문이다 — 생성기는 node
 * 전용 모듈이라 들여올 수 없다. 대신 아래 `parseSearchIndex`가 실제 산출물을
 * 좁히고, `searchIndex.test.ts`가 그 산출물과 이 타입을 대조한다.
 */
export interface SearchPost {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  series: string | null;
  contentPreview?: string;
}

function toSearchPost(item: unknown): SearchPost | null {
  if (!isRecord(item)) return null;
  const { slug, title, date, excerpt, tags, series, contentPreview } = item;
  // slug와 title이 없으면 항목으로 성립하지 않는다. 나머지는 비어도 화면이
  // 그려지므로 기본값으로 떨어뜨린다 — 인덱스 한 줄이 이상하다고 검색 전체가
  // 죽는 것이 훨씬 나쁘다.
  if (typeof slug !== 'string' || typeof title !== 'string') return null;
  const post: SearchPost = {
    slug,
    title,
    date: typeof date === 'string' ? date : null,
    excerpt: typeof excerpt === 'string' ? excerpt : '',
    tags: Array.isArray(tags) ? tags.filter(t => typeof t === 'string') : [],
    series: typeof series === 'string' ? series : null,
  };
  if (typeof contentPreview === 'string') post.contentPreview = contentPreview;
  return post;
}

/** fetch 응답은 외부 입력이다 — `unknown`에서 좁힌다. */
export function parseSearchIndex(data: unknown): SearchPost[] {
  if (!Array.isArray(data)) return [];
  return data.map(toSearchPost).filter(post => post !== null);
}

/** 결과 상한. React 판과 같은 값이다. */
export const MAX_RESULTS = 10;

function matches(post: SearchPost, lower: string): boolean {
  return (
    post.title.toLowerCase().includes(lower) ||
    post.excerpt.toLowerCase().includes(lower) ||
    post.tags.some(tag => tag.toLowerCase().includes(lower)) ||
    (post.series?.toLowerCase().includes(lower) ?? false) ||
    (post.contentPreview?.toLowerCase().includes(lower) ?? false)
  );
}

/**
 * 검색어가 비어 있으면 최근 본 글을, 그것도 없으면 최신 글을 보여준다 —
 * 빈 화면 대신 무엇이든 고를 것을 준다.
 */
export function filterPosts(
  posts: SearchPost[],
  query: string,
  recent: SearchPost[] = [],
): SearchPost[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return (recent.length > 0 ? recent : posts).slice(0, MAX_RESULTS);
  }
  const lower = trimmed.toLowerCase();
  return posts.filter(post => matches(post, lower)).slice(0, MAX_RESULTS);
}

/**
 * 본문 미리보기에서 검색어 **주변**을 잘라 낸다. 앞 140자를 그냥 보여주면
 * 왜 이 글이 걸렸는지 알 수 없다 — 걸린 자리가 본문 한가운데일 때가 대부분이다.
 */
export function pickContentSnippet(
  content: string,
  query: string,
  radius = 60,
): string {
  if (content.length === 0) return '';
  const trimmed = query.trim();
  if (trimmed.length === 0) return content.slice(0, 140);
  const idx = content.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return content.slice(0, 140);
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + trimmed.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  return `${prefix}${content.slice(start, end)}${suffix}`;
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

/**
 * 검색어와 겹치는 조각을 표시해 돌려준다. `<mark>`를 만드는 일은 화면의 몫이다.
 *
 * **정규식으로 쪼개지 않는다.** React 판은 `split(/(q)/gi)` 뒤 조각마다
 * `regex.test(part)`로 되묻는데, `g` 플래그가 붙은 정규식은 `lastIndex`를
 * 들고 다녀 같은 조각에 두 번 물으면 답이 달라진다. 지금 검색어에서는 우연히
 * 맞지만 규칙이 아니다. 여기서는 인덱스를 직접 세어 **조각의 자리**로 판정한다 —
 * 상태가 없다.
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const trimmed = query.trim();
  if (trimmed.length === 0 || text.length === 0) {
    return [{ text, hit: false }];
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const parts: HighlightPart[] = [];
  let cursor = 0;
  for (;;) {
    const idx = lowerText.indexOf(lowerQuery, cursor);
    if (idx === -1) break;
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), hit: false });
    parts.push({ text: text.slice(idx, idx + lowerQuery.length), hit: true });
    cursor = idx + lowerQuery.length;
  }
  if (cursor < text.length)
    parts.push({ text: text.slice(cursor), hit: false });
  return parts;
}
