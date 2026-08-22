/**
 * `defineContent`의 상대 경로(`dirs.*`)를 **절대 경로**로 푸는 node 전용 모듈.
 *
 * 앵커는 설정의 `root` — `process.cwd()`가 아니다. 예전에는 도메인
 * (repository·series)이 cwd 기준, 스크립트 일부가 import.meta.url 기준으로
 * **섞여** 있어서, cwd가 앱 루트가 아니면 두 계열이 서로 다른 posts/를 바라볼
 * 수 있었다(시리즈 메타만 조용히 사라지는 위험). 지금은 설정이 앵커를 한 번만
 * 선언하고(관례: content.config.ts의 `root: import.meta.url`), 전부 여기서 푼
 * 같은 절대 경로를 쓴다.
 *
 * node:path·node:url을 import하므로 클라이언트 컴포넌트에서 import하지 말 것 —
 * 데이터만 필요하면 `contentConfig.ts`를 쓴다.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentConfig } from './contentConfig.ts';

export interface ContentPaths {
  appRoot: string;
  /** 마크다운 원본 (dirs.content) */
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

/**
 * `config.root`를 앱 루트 디렉터리 절대 경로로 푼다.
 * - `file://` URL: 파일 URL이면(관례 `import.meta.url`) 그 파일이 있는 디렉터리,
 *   후행 슬래시가 있는 디렉터리 URL이면 그 디렉터리 자체
 * - 절대 경로: 그대로 (형태 검증은 defineContent의 assertValidRoot가 이미 했다)
 */
function resolveAppRoot(root: string): string {
  if (root.startsWith('file://')) {
    const path = fileURLToPath(root);
    return root.endsWith('/') ? resolve(path) : dirname(path);
  }
  return resolve(root);
}

/** 순수 함수 — 테스트가 임의 root의 설정으로 결과를 검증할 수 있다 */
export function resolveContentPaths(config: ContentConfig): ContentPaths {
  const appRoot = resolveAppRoot(config.root);
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
