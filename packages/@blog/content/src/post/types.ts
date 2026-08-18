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
 * frontmatter 원시 형태. 이제 손으로 적은 목록이 아니라 **서술자 테이블에서
 * 파생**됩니다(`frontmatterSchema.ts`) — 키 목록이 네 곳(RawFrontmatter ·
 * parsePost · validate-posts 허용 키 · CLAUDE.md 표)에 흩어져 서로 다른 순서로
 * 낡던 문제를 없애기 위해서입니다. "전 필드 unknown" 성질과 그 이유도 그쪽에
 * 있습니다.
 *
 * 여기서 다시 내보내는 이유는 `RawFrontmatter`를 "types.ts에 있는 것"으로
 * 가리키는 곳(repository.ts의 import, design/blog-redesign-handoff.md)이 있어서
 * 입니다. **반드시 `export type`이어야 합니다** — 값 re-export로 쓰면
 * types → frontmatterSchema → visibility → types의 진짜 런타임 순환이 생겨
 * `POST_STATUSES`가 TDZ에 걸립니다(컴파일은 통과하고 빌드 스크립트만 죽습니다).
 */
export type { RawFrontmatter } from './frontmatterSchema.ts';

export interface PostData {
  slug: string;
  originalSlug: string;
  relativeDir: string;
  title: string;
  /**
   * `<title>` 태그 전용의 짧은 제목. 없으면 `title`을 씁니다.
   *
   * 이 블로그의 제목에는 `[Typescript로 설계하는 프로젝트]` 같은 긴 시리즈
   * 접두사가 붙는데, 여기에 사이트 접미사(` | Frontend Lab`)까지 더해지면
   * 검색 결과에서 잘립니다(최장 94자). 화면·OG 카드·JSON-LD headline에는
   * 원래 제목이 그대로 나가고, 잘림이 실제로 문제인 `<title>`만 이 값으로
   * 바꿉니다 — 제목을 짧게 고쳐서 글의 정체성을 훼손하지 않으려는 분리입니다.
   */
  seoTitle?: string | undefined;
  date: string | null;
  updatedAt?: string | null;
  content: string;
  readMin: number;
  excerpt?: string;
  thumbnail?: string | undefined;
  /**
   * 글 상단 히어로 슬롯에 꽂을 다이어그램 **이름**.
   * 유효성은 도메인이 아니라 렌더 계층(레지스트리)과 `lint:posts`가 판정합니다 —
   * 도메인이 UI 컴포넌트 목록을 알면 의존 방향이 뒤집힙니다.
   */
  hero?: string | undefined;
  tags?: string[] | undefined;
  series?: string | undefined;
  // parsePost가 유효한 status 없는 파일을 걸러내므로 항상 채워져 있습니다.
  status: PostStatus;
  scheduledDate?: string | undefined;
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
