/**
 * 이 사이트의 값 — 순수 리터럴(값 import 없음, 타입만 `satisfies`로 계약 확인).
 * `apps/blog/web/content.values.mts`와 같은 규약이다.
 *
 * ## ⚠ 알려진 중복 — PR 2에서 해소할 것
 *
 * 지금 이 파일은 `apps/blog/web/content.values.mts`의 **부분 사본**이다. 두
 * 앱이 같은 사이트를 짓는데 사이트 정체성이 두 곳에 살아 있으므로, 한쪽만
 * 고치면 두 산출물이 조용히 갈라진다 — 이 저장소가 `published` 필드와 판정
 * 규칙 이중화에서 이미 겪은 실패 모양이다.
 *
 * 지금 사본을 두는 이유는 하나다: 해소책 셋(① 공유 패키지 `@blog/site-values`로
 * 추출 ② 상대 경로 교차 import ③ 계약 테스트로 두 파일을 글자 단위 대조)이
 * 전부 `apps/blog/web`이나 워크스페이스 구조를 건드리는데, 이 PR의 완료 기준이
 * "React 앱은 한 줄도 바뀌지 않는다"이기 때문이다. **여기서 값을 고치지 말 것** —
 * 고쳐야 하면 React 판을 먼저 고치고 그대로 옮긴다.
 *
 * 뼈대 단계라 `defineContent`가 필수로 요구하는 축만 담았다. sitemap 정적
 * 페이지·llms 산문·번들 규칙은 해당 화면과 함께 PR 2 이후에 들어온다.
 */
import type {
  AuthorConfig,
  ContentValues,
  SiteConfig,
  TimezoneConfig,
} from '@blog/content';

export const SITE_URL = 'https://blog.sangwook.dev';
export const SITE_NAME = 'Frontend Lab';
export const SITE_DESCRIPTION =
  '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.';
export const OG_DEFAULT_IMAGE = '/og-default.jpg';

export const SITE = {
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  ogDefaultImage: OG_DEFAULT_IMAGE,
} as const satisfies SiteConfig;

export const AUTHOR = {
  name: 'Sangwook Han',
  alternateName: '한상욱',
  role: 'Frontend Engineer',
  github: 'https://github.com/Han5991',
  linkedin: 'https://www.linkedin.com/in/sangwook-han/',
} as const satisfies AuthorConfig;

export const TIMEZONE = {
  iana: 'Asia/Seoul',
  isoOffset: '+09:00',
  utcOffsetMs: 9 * 60 * 60 * 1000,
} as const satisfies TimezoneConfig;

export const DIAGRAM_NAMES = [
  'deploy-pipeline',
] as const satisfies ContentValues['diagramNames'];

export const META_FILENAMES = [
  'PLAN.md',
  'THUMBNAIL_LOG.md',
  'STUDY_LOG.md',
] as const;
