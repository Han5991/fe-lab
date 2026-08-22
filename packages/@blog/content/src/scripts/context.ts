/**
 * 빌드 스텝이 받는 실행 컨텍스트.
 *
 * CLI(`cli/program.ts`)가 `content.config.ts`를 발견·로드한 뒤 여기서 컨텍스트
 * 하나를 만들어 각 스텝의 `main(ctx, …)`에 넘긴다. 스텝 모듈은 싱글턴을
 * import하지 않고 이 객체만 본다 — 경로·설정·로더가 전부 같은 root에 앵커된
 * 한 인스턴스에서 나오므로, 예전처럼 두 계열이 서로 다른 posts/를 보는 사고가
 * 구조적으로 불가능하다.
 */
import type { ContentConfig } from '../shared/contentConfig.ts';
import type { ContentPaths } from '../shared/contentPaths.ts';
import { createContent, type ContentApi } from '../post/createContent.ts';

export interface ContentContext {
  /** 로드된 content.config.ts의 절대 경로 — 자식 프로세스에 --config로 전달된다 */
  configPath: string;
  config: ContentConfig;
  paths: ContentPaths;
  /** 설정에 앵커된 로더 인스턴스 — 글 집합 선택은 artifacts.resolvePostSet 경유 */
  content: ContentApi;
}

export function createContext(
  config: ContentConfig,
  configPath: string,
): ContentContext {
  const content = createContent(config);
  return { configPath, config, paths: content.paths, content };
}
