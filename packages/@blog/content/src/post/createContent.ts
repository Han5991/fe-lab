/**
 * 콘텐츠 API의 조립 지점 — `createContent(설정)`.
 *
 * 소비자는 자기 `content.config.ts`(관례: `root: import.meta.url`)로
 * `defineContent`를 호출해 만든 설정을 여기 넘기고, 경로 해석·로더·시리즈
 * 리더·집계가 그 설정에 앵커된 **인스턴스 하나**로 묶여 나온다. 캐시는 전부
 * 인스턴스 안에 살므로, 루트가 다른 인스턴스를 한 프로세스에서 여럿 만들어도
 * 서로 섞이지 않는다(테스트·멀티 사이트).
 *
 * node:fs를 전이 의존하므로 서버/빌드 전용이다 — 클라이언트 컴포넌트에서
 * import하지 말 것.
 */
import type { ContentConfig } from '../shared/contentConfig.ts';
import {
  resolveContentPaths,
  type ContentPaths,
} from '../shared/contentPaths.ts';
import { createSeriesReader, type SeriesReader } from './series.ts';
import { createRepository, type Repository } from './repository.ts';
import { createPostService, type PostService } from './service.ts';
import { createAggregate, type Aggregate } from './aggregate.ts';

export interface ContentApi
  extends SeriesReader, Repository, PostService, Aggregate {
  /** 이 인스턴스를 만든 설정 (defineContent 결과) */
  config: ContentConfig;
  /** `config.root` 기준으로 푼 절대 경로 집합 */
  paths: ContentPaths;
}

export function createContent(config: ContentConfig): ContentApi {
  const paths = resolveContentPaths(config);
  const isDevelopment = () => config.runtime.isDevelopment();

  const seriesReader = createSeriesReader({
    postsDir: paths.postsDir,
    isDevelopment,
  });
  const repository = createRepository({
    postsDir: paths.postsDir,
    isDevelopment,
    excerptMaxLength: config.seo.descriptionMaxLength,
    isSeriesFolder: name => seriesReader.isSeriesFolder(name),
  });
  const service = createPostService({
    readAllPosts: repository.readAllPosts,
    getSeriesMeta: seriesReader.getSeriesMeta,
    isDevelopment,
    timezone: config.timezone,
  });
  const aggregate = createAggregate({
    getAllPosts: () => service.getAllPosts(),
    getSeriesMeta: seriesReader.getSeriesMeta,
    registries: config.registries,
  });

  return {
    config,
    paths,
    ...seriesReader,
    ...repository,
    ...service,
    ...aggregate,
  };
}
