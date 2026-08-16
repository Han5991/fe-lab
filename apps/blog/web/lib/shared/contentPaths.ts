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
import { CONTENT, type ContentConfig } from './contentConfig';

/** 앱 루트 — lib/shared/ 에서 두 단계 위. cwd와 무관하게 안정적이다. */
const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

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
  /** OG 카드 렌더링 폰트 */
  ogFontDir: string;
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
    ogFontDir: resolve(appRoot, dirs.ogFonts),
  };
}

/** 이 사이트의 절대 경로 집합 — 도메인과 빌드 스크립트가 공유하는 단일 출처 */
export const CONTENT_PATHS: ContentPaths = resolveContentPaths(
  CONTENT,
  APP_ROOT,
);
