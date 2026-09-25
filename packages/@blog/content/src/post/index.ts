/**
 * Post domain 공개 API
 *
 * 외부에서는 이 파일을 통해 접근합니다.
 */
export * from './types.ts';
// 설정에 앵커한 인스턴스 API — 소비자의 기본 진입점 (content.config.ts + createContent)
export * from './createContent.ts';
export * from './visibility.ts';
export * from './thumbnail.ts';
export * from './service.ts';
export * from './series.ts';
export * from './utils.ts';
export * from './urls.ts';
export * from './aggregate.ts';
// repository는 인프라(파일시스템)라 순수 계산만 공개한다 — 렌더·검증·생성기가 같은 값을 내야 한다.
export {
  extractPlainText,
  resolveExcerpt,
  sortByDateDesc,
} from './repository.ts';
// frontmatter 계약의 단일 출처 — lint:posts가 허용 키·거부 사유와 로더의 좁히기를 읽는다.
export {
  FRONTMATTER_FIELDS,
  FRONTMATTER_KEYS,
  REJECTED_FRONTMATTER_KEYS,
  rejectionReasonFor,
} from './frontmatterSchema.ts';
export type {
  FrontmatterField,
  FrontmatterKey,
  FrontmatterKind,
} from './frontmatterSchema.ts';
