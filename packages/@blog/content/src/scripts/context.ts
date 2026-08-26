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
import { createContent, type ContentApi } from '../post/createContent.ts';

/**
 * **필드가 둘뿐인 것이 요점이다.**
 *
 * 예전에는 `config`와 `paths`도 여기 있었다. 값은 `content`의 것과 같은 객체를
 * 넣어 뒀을 뿐이라(`paths: content.paths`), 위 문단의 "한 인스턴스에서 나온다"가
 * 관례로만 참이었다 — 필드 셋을 각자 채운 객체도 이 타입을 만족하므로 타입이
 * 막아 주는 건 없었다. 사본을 없애면 경로·설정이 있는 곳이 실제로 하나가 되고,
 * 호출부의 `ctx.content.paths`가 그 출처를 매번 말해 준다.
 *
 * 로더 API를 여기 상속시키는(`extends ContentApi`) 길도 있었지만 택하지 않았다.
 * 호출부는 한 글자도 안 바뀌지만 컨텍스트가 멤버 21개로 부풀어, 경로 하나만
 * 쓰는 스텝까지 글 로더·집계 함수를 통째로 받게 된다.
 */
export interface ContentContext {
  /** 로드된 content.config.ts의 절대 경로 — 자식 프로세스에 --config로 전달된다 */
  configPath: string;
  /**
   * 설정에 앵커된 로더 인스턴스 — 글 집합 선택은 artifacts.resolvePostSet 경유.
   * 설정과 경로도 여기서 읽는다(`content.config` · `content.paths`).
   */
  content: ContentApi;
}

export function createContext(
  config: ContentConfig,
  configPath: string,
): ContentContext {
  return { configPath, content: createContent(config) };
}
