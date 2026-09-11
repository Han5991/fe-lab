/**
 * 이 앱의 콘텐츠 인스턴스 — fs를 읽는 로더·SEO 빌더의 **유일한** 조립 지점.
 * `apps/blog/web/src/content.ts`와 같은 역할이다.
 *
 * `src/lib/server/` 아래인 것이 계약이다 — SvelteKit이 이 디렉터리의 모듈을
 * 클라이언트 그래프에서 import하면 **빌드를 실패시킨다**. React 판은 같은
 * 성질을 주석과 리뷰로만 지켰다(`src/content.ts`는 "서버 전용이다"라고 적혀
 * 있을 뿐이다). 여기서는 도구가 강제한다.
 */
import { createContent } from '@blog/content';
import { createPostSeo } from '@blog/content/seo';
import contentConfig from '../../../content.config.mts';

/**
 * 앵커 덮어쓰기 — 이유는 `vite.config.ts`의 `__CONTENT_ROOT__` 주석에 있다.
 * 요약하면 번들된 설정의 `import.meta.url`은 출력 파일을 가리켜 `../posts`가
 * `.svelte-kit/output/server/posts`로 풀린다. 빌드 타임에 아는 실제 앱
 * 디렉터리로 바꿔 준다(`defineContent`는 절대 경로 앵커도 받는다).
 */
declare const __CONTENT_ROOT__: string;

const config = { ...contentConfig, root: __CONTENT_ROOT__ };

export const content = createContent(config);
export { config };

export const {
  getAllPosts,
  getAllPostSummaries,
  getPostBySlug,
  getAllPostSlugs,
  getAdjacentPosts,
  getAllSeries,
  // admin은 draft·scheduled의 통계도 연다 — 목록에는 보이는데 상세가 404가
  // 되지 않으려면 그 라우트도 프리렌더돼야 한다.
  getAllPostsIncludingHidden,
} = content;

export const { buildPostSeo } = createPostSeo(config);
