import { POSTS_PATH } from '@blog/content';
import { OG_DEFAULT_IMAGE, SITE_NAME, SITE_URL } from '@blog/site-values';
import { ABOUT_PATH, SERIES_PATH } from '$lib/shared/routes';

/**
 * 모든 페이지가 쓰는 사이트 값·경로 — **서버에서 읽어 내려보낸다.**
 *
 * 화면이 `@blog/content`를 직접 import하면 안 된다. 그 패키지의 배럴은
 * 로더(`node:fs`)까지 함께 여는데, 클라이언트 그래프에 들어가면 Vite가
 * "Module node:fs has been externalized for browser compatibility"로 경고하며
 * 빈 스텁을 넣는다 — 빌드는 성공하고 런타임에만 깨진다. React 판은
 * `optimizePackageImports: ['@blog/content']`로 이 누수를 막는데, 그건 Next
 * 전용 최적화라 여기에는 없다.
 *
 * 그래서 URL 계약(`postPath`·`POSTS_PATH`)은 **전부 서버에서 풀어** 문자열로
 * 내려보낸다. 화면은 완성된 href만 받는다.
 */
export const load = () => ({
  site: { name: SITE_NAME, url: SITE_URL, ogDefaultImage: OG_DEFAULT_IMAGE },
  paths: { posts: POSTS_PATH, series: SERIES_PATH, about: ABOUT_PATH },
});
