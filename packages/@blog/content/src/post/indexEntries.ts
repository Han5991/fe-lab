import { isRecord, isStringArray } from '../shared/guards.ts';
import type { PostStatus } from './types.ts';
import { isPostStatus } from './visibility.ts';

/**
 * 검색 색인 두 벌(`SEARCH_INDEX_PATH`·`ADMIN_POSTS_INDEX_PATH`)의 행 계약 — 생성기
 * (`scripts/generate-search-index.ts`)가 쓰고 앱이 fetch해 읽는다. 타입과 런타임 검사가 이
 * 파일 하나에 있어서, 필드를 바꾸면 아래 표가 컴파일되지 않는다(`satisfies`).
 */
export interface PublicSearchIndexEntry {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  series: string | null;
  /** 시리즈 표시명(`_series.yml`의 `title`) — 없으면 null(화면은 `series`로 폴백) */
  seriesTitle: string | null;
  contentPreview: string;
}

/** admin 대시보드가 읽는 필드만 — 인증 없이 받는 정적 파일이라 공개 전 글의 요약·시리즈는 싣지 않는다. */
export interface AdminPostsIndexEntry {
  slug: string;
  title: string;
  date: string | null;
  tags: string[];
  status: PostStatus;
  scheduledDate: string | null;
}

/** 필드마다 값 검사 — 검사가 좁히는 타입이 필드 타입보다 넓으면 컴파일 에러다. */
type FieldChecks<T> = {
  readonly [K in keyof T]-?: (value: unknown) => value is T[K];
};

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const PUBLIC_ENTRY = {
  slug: isString,
  title: isString,
  date: isNullableString,
  excerpt: isString,
  tags: isStringArray,
  series: isNullableString,
  seriesTitle: isNullableString,
  contentPreview: isString,
} satisfies FieldChecks<PublicSearchIndexEntry>;

const ADMIN_ENTRY = {
  slug: isString,
  title: isString,
  date: isNullableString,
  tags: isStringArray,
  status: isPostStatus,
  scheduledDate: isNullableString,
} satisfies FieldChecks<AdminPostsIndexEntry>;

function hasFields(
  value: unknown,
  checks: Readonly<Record<string, (field: unknown) => boolean>>,
): boolean {
  return (
    isRecord(value) &&
    Object.entries(checks).every(([name, check]) => check(value[name]))
  );
}

export function isPublicSearchIndexEntry(
  value: unknown,
): value is PublicSearchIndexEntry {
  return hasFields(value, PUBLIC_ENTRY);
}

export function isAdminPostsIndexEntry(
  value: unknown,
): value is AdminPostsIndexEntry {
  return hasFields(value, ADMIN_ENTRY);
}
