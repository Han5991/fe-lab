/**
 * Post 도메인 타입 정의
 */

/**
 * 포스트의 공개 제어 축. frontmatter의 `status` 하나로만 결정합니다.
 * (예전 `published: boolean` 필드는 제거되었습니다 — validate-posts가 에러로 막습니다)
 */
export const POST_STATUSES = ['published', 'draft', 'scheduled'] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * frontmatter를 파싱한 **직후**의 원시 형태.
 *
 * gray-matter의 `data`는 `{ [key: string]: any }`라서 그대로 쓰면
 * `data.tags.map(...)`이나 `data.date.getTime()` 같은 코드가 컴파일은 통과하고
 * 런타임에 터집니다. YAML은 어떤 타입이든 줄 수 있으므로(`date: null`,
 * `tags: 'a'`, `status: 3` …) 모든 값을 `unknown`으로 받고 읽는 쪽에서 좁힙니다.
 *
 * 여기 없는 키는 validate-posts의 unknown-frontmatter-key 경고 대상입니다.
 */
export type RawFrontmatter = {
  title?: unknown;
  date?: unknown;
  updatedAt?: unknown;
  status?: unknown;
  scheduledDate?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  thumbnail?: unknown;
  tags?: unknown;
  hero?: unknown;
};

export interface PostData {
  slug: string;
  originalSlug: string;
  relativeDir: string;
  title: string;
  date: string | null;
  updatedAt?: string | null;
  content: string;
  readMin: number;
  excerpt?: string;
  thumbnail?: string;
  /**
   * 글 상단 히어로 슬롯에 꽂을 다이어그램 **이름**.
   * 유효성은 도메인이 아니라 렌더 계층(레지스트리)과 `lint:posts`가 판정합니다 —
   * 도메인이 UI 컴포넌트 목록을 알면 의존 방향이 뒤집힙니다.
   */
  hero?: string;
  tags?: string[];
  series?: string;
  // parsePost가 유효한 status 없는 파일을 걸러내므로 항상 채워져 있습니다.
  status: PostStatus;
  scheduledDate?: string;
}

export type PostSummary = Omit<PostData, 'content'>;

export interface PostNavItem {
  slug: string;
  title: string;
}

export interface AdjacentPostsOptions {
  filterTag?: string;
  filterSeries?: string;
  sortOrder?: 'newest' | 'oldest';
}
