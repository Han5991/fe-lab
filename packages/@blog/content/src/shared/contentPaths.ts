/**
 * `defineContent`의 상대 경로(`dirs.*`)를 **절대 경로**로 푸는 node 전용 모듈.
 *
 * 앵커는 이 파일의 위치에서 계산한 앱 루트다 — `process.cwd()`가 아니다.
 * 예전에는 도메인(repository·series)이 cwd 기준, 스크립트 일부가
 * import.meta.url 기준으로 **섞여** 있어서, cwd가 앱 루트가 아니면 두 계열이
 * 서로 다른 posts/를 바라볼 수 있었다(시리즈 메타만 조용히 사라지는 위험).
 * 이제 전부 여기서 푼 같은 절대 경로를 쓴다.
 *
 * node:path·node:url을 import하므로 클라이언트 컴포넌트에서 import하지 말 것 —
 * 데이터만 필요하면 `contentConfig.ts`를 쓴다.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT, type ContentConfig } from './contentConfig.ts';

/**
 * 앱 루트 — 이 파일(packages/@blog/content/src/shared/)에서 워크스페이스
 * 루트로 다섯 단계 올라간 뒤 `apps/blog/web`. `dirs.*`가 "앱 루트 기준 상대
 * 경로"라는 계약은 패키지로 이사한 뒤에도 그대로다 — 앵커만 패키지 위치에서
 * 다시 계산한다. cwd와 무관하게 안정적이다(node ESM 로더는 pnpm 심링크를
 * realpath로 풀므로 import.meta.url은 항상 packages/ 아래의 실제 경로다).
 *
 * 이 상수는 이 패키지가 fe-lab 워크스페이스의 `apps/blog/web` 전용이라는
 * 하드코딩이다 — 다른 앱이 생기면 CONTENT_PATHS 싱글턴 대신
 * `resolveContentPaths(config, appRoot)`를 직접 호출할 것.
 */
const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)), // …/packages/@blog/content/src/shared
  '..', // …/packages/@blog/content/src
  '..', // …/packages/@blog/content
  '..', // …/packages/@blog
  '..', // …/packages
  '..', // 워크스페이스 루트
);
const APP_ROOT = resolve(WORKSPACE_ROOT, 'apps', 'blog', 'web');

export interface ContentPaths {
  appRoot: string;
  /** 마크다운 원본 (apps/blog/posts) */
  postsDir: string;
  publicDir: string;
  cacheDir: string;
  /** next build 산출물 — check-seo가 검사 */
  outDir: string;
  /** sync-posts 미디어 산출물 */
  mediaOutDir: string;
  /** generate-thumbnails 산출물 */
  thumbsOutDir: string;
  /** generate-og-images 산출물 */
  ogOutDir: string;
}

/** 순수 함수 — 테스트가 임의 appRoot로 결과를 검증할 수 있다 */
export function resolveContentPaths(
  config: ContentConfig,
  appRoot: string,
): ContentPaths {
  const { dirs } = config;
  return {
    appRoot,
    postsDir: resolve(appRoot, dirs.content),
    publicDir: resolve(appRoot, dirs.public),
    cacheDir: resolve(appRoot, dirs.cache),
    outDir: resolve(appRoot, dirs.out),
    mediaOutDir: resolve(appRoot, dirs.media),
    thumbsOutDir: resolve(appRoot, dirs.thumbs),
    ogOutDir: resolve(appRoot, dirs.og),
  };
}

/** 이 사이트의 절대 경로 집합 — 도메인과 빌드 스크립트가 공유하는 단일 출처 */
export const CONTENT_PATHS: ContentPaths = resolveContentPaths(
  CONTENT,
  APP_ROOT,
);
