/**
 * @deprecated 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새 코드에서는 `@/domain/post`를 직접 import 하세요.
 */
export type {
  PostData,
  PostNavItem,
  PostStatus,
  AdjacentPostsOptions,
} from '../domain/post/types';

export {
  getAllPosts,
  getAllPostsIncludingHidden,
  getPostBySlug,
  getAllPostSlugs,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
} from '../domain/post/service';

export { isPostVisible } from '../domain/post/visibility';
export {
  resolveThumbnailUrl,
  resolveAbsoluteThumbnailUrl,
} from '../domain/post/thumbnail';
