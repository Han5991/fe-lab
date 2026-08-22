/**
 * 테스트 전용 사이트 값 — **패키지 안의 유일한 "어떤 사이트"**.
 *
 * 프로덕션 소스에는 사이트 고유 값이 하나도 없다(`ContentValues` 참고). 그래서
 * 단위 테스트는 기대값을 어딘가에서 받아야 하는데, 실제 사이트 값을 복제하면
 * 앱과 갈라질 수 있는 두 번째 출처가 다시 생긴다. 대신 **일부러 다른** 픽스처
 * 값을 두고 기대값도 여기서 가져온다 — 테스트가 "설정이 실제로 흐르는가"까지
 * 함께 검증하게 된다. 값이 `blog.sangwook.dev`로 하드코딩돼 있었다면, 소비처가
 * 설정을 무시하고 옛 상수를 읽어도 테스트는 통과했을 것이다.
 *
 * 프로덕션 코드는 이 모듈을 import하지 않는다(배럴에도 없다).
 */
import {
  defineContent,
  type ContentConfig,
  type ContentUserConfig,
  type ContentValues,
} from './contentConfig.ts';

export const TEST_VALUES: ContentValues = {
  site: {
    url: 'https://blog.test',
    name: 'Test Blog',
    description: '테스트 픽스처 사이트입니다.',
    descriptionExpanded: '테스트 픽스처 사이트의 긴 소개입니다.',
    ogDefaultImage: '/og-default.jpg',
    rssPath: '/rss.xml',
    aboutPageModified: '2026-01-01',
    mergedPrCountFallback: '0',
  },
  author: {
    name: 'Test Author',
    alternateName: '테스트',
    role: 'Frontend Engineer',
    github: 'https://github.com/test',
    linkedin: 'https://www.linkedin.com/in/test/',
  },
  /**
   * 이 축만 실제 사이트와 같다 — 저장소의 원고가 KST 기준으로 날짜를 적어서,
   * 실제 원고를 읽는 코퍼스 계약 테스트가 다른 타임존에서는 예약 발행 판정을
   * 다르게 낸다.
   */
  timezone: {
    iana: 'Asia/Seoul',
    isoOffset: '+09:00',
    utcOffsetMs: 9 * 60 * 60 * 1000,
  },
  /** 실제 원고가 `hero:`로 부르는 이름 — 코퍼스 테스트가 이 목록으로 검증한다. */
  diagramNames: ['deploy-pipeline'],
};

/** 픽스처 값 위에 설정을 만든다. `root`만 테스트가 정한다. */
export function defineTestContent(
  overrides: Omit<Partial<ContentUserConfig>, 'root'> & { root: string },
): ContentConfig {
  return defineContent({
    site: TEST_VALUES.site,
    author: TEST_VALUES.author,
    timezone: TEST_VALUES.timezone,
    registries: { diagramNames: TEST_VALUES.diagramNames },
    ...overrides,
  });
}
