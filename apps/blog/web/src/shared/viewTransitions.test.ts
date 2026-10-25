/**
 * 페이지 전환의 두 규칙.
 *
 * - **공유 요소 이름** — 카드와 글 상세가 같은 함수로 만드는 `view-transition-name`. 이름이 CSS 식별자
 *   글자를 벗어나면 React가 `btoa`로 바꾸려 하고(한글에서 throw), 서로 다른 slug가 같은 이름이 되면 한
 *   페이지에 같은 이름이 둘이라 브라우저가 전환을 통째로 건너뛴다.
 * - **이동의 방향** — 출발·도착 경로로 고르는 transition type. 어긋나면 글로 들어가는데 뒤로 가는
 *   것처럼 미끄러지거나, 이전·다음 글이 slug 모양에 따라 앞뒤로 갈린다.
 *
 * 둘 다 빌드·렌더 테스트에는 보이지 않는다.
 */
import { describe, expect, test } from 'vitest';
import { archivePath, POSTS_PATH, postPath } from '@blog/content/client';
import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH, SERIES_PATH } from './routes';
import {
  linkTransitionTypes,
  NAV_TRANSITION,
  navDepth,
  navTransitionType,
  POST_OPEN_TRANSITION_TYPE,
  POST_SHARED,
  postSharedName,
  type NavTransitionType,
  type PostSharedPart,
  type SiblingOrder,
} from './viewTransitions';

/**
 * React(`applyViewTransitionName`)는 `CSS.escape(name) !== name`이면 이름을 `btoa`로 바꾼다.
 * `CSS.escape`는 영문자로 시작하고 영숫자·`_`·`-`만 있는 문자열을 그대로 둔다 — node에는
 * `CSS.escape`가 없어 그 조건을 정규식으로 적는다.
 */
const UNTOUCHED_BY_CSS_ESCAPE = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** 짝의 종류 전부 — `POST_SHARED`에 짝이 늘면 아래 검사가 새 접두사도 본다. */
const PARTS = Object.keys(POST_SHARED).filter((key): key is PostSharedPart =>
  Object.hasOwn(POST_SHARED, key),
);

/** 단순 치환(`.`·`/`→`-`, 비ASCII 제거)이면 서로 부딪히는 slug들. */
const TRICKY_SLUGS = [
  'turborepo-next.js-docker',
  'turborepo-next-js-docker',
  'react/component/toast',
  'react-component-toast',
  'a_b',
  'a_5fb',
  'a.b',
  'a_2eb',
  '디자인-시스템',
  '디자인 시스템',
  '🚨3분-장애-대응',
  '2024-retrospect',
];

describe('postSharedName', () => {
  test('ASCII kebab slug는 접두사 뒤에 그대로 붙는다 — devtools에서 읽힌다', () => {
    expect(postSharedName('cover', 'next-js-ecs-deploy')).toBe(
      `${POST_SHARED.cover}-next-js-ecs-deploy`,
    );
    expect(postSharedName('title', 'next-js-ecs-deploy')).toBe(
      `${POST_SHARED.title}-next-js-ecs-deploy`,
    );
  });

  test('어떤 slug든 React가 손대지 않는 CSS 식별자가 된다', () => {
    for (const slug of TRICKY_SLUGS) {
      for (const part of PARTS) {
        expect(postSharedName(part, slug)).toMatch(UNTOUCHED_BY_CSS_ESCAPE);
      }
    }
  });

  test('slug나 짝이 다르면 이름이 다르다 — 홈 한 화면에 카드 열한 장의 커버·제목이 함께 있다', () => {
    expect(PARTS.length).toBeGreaterThan(1);
    const names = TRICKY_SLUGS.flatMap(slug =>
      PARTS.map(part => postSharedName(part, slug)),
    );
    expect(new Set(names).size).toBe(TRICKY_SLUGS.length * PARTS.length);
  });
});

const POST = postPath('vitest-project-split');
// 폴더 slug — 경로 세그먼트가 더 많아도 글 하나다.
const FOLDER_POST = postPath('react/component/toast');

/**
 * 후행 슬래시를 뗀 경로 — dev 서버는 슬래시 없는 경로도 그대로 서빙해 usePathname이 그 모양을
 * 돌려준다. 경로를 문자열로 옮겨 적지 않고 출처에서 뗀다(`POSTS_PATH`가 바뀌면 함께 바뀌게).
 */
const withoutTrailingSlash = (path: string): string => {
  if (!path.endsWith('/')) throw new Error(`후행 슬래시 계약 밖: ${path}`);
  return path.slice(0, -1);
};

describe('navDepth — 앱의 계층', () => {
  test.each([
    [HOME_PATH, 0],
    [POSTS_PATH, 1],
    [SERIES_PATH, 1],
    [ABOUT_PATH, 1],
    [PRIVACY_PATH, 1],
    [archivePath({ tag: 'ci' }), 1],
    [POST, 2],
    [FOLDER_POST, 2],
    [`${POST}#heading`, 2],
    [withoutTrailingSlash(POSTS_PATH), 1],
    [withoutTrailingSlash(POST), 2],
  ])('%s → %i', (path, depth) => {
    expect(navDepth(path)).toBe(depth);
  });
});

describe('navTransitionType — 출발·도착 경로 → 방향', () => {
  const { forward, back } = NAV_TRANSITION;
  const cases: [
    string,
    string,
    string,
    SiblingOrder | undefined,
    NavTransitionType | null,
  ][] = [
    // 더 깊이 — 홈 → 섹션, 목록 → 글
    ['홈 → 글 목록(헤더 "글")', HOME_PATH, POSTS_PATH, undefined, forward],
    ['홈 → 시리즈', HOME_PATH, SERIES_PATH, undefined, forward],
    ['홈 → 소개', HOME_PATH, ABOUT_PATH, undefined, forward],
    ['홈 카드 → 글', HOME_PATH, POST, undefined, forward],
    ['글 목록 카드 → 글', POSTS_PATH, POST, undefined, forward],
    ['시리즈 행 → 폴더 slug 글', SERIES_PATH, FOLDER_POST, undefined, forward],
    ['필터된 목록 → 글', archivePath({ tag: 'ci' }), POST, undefined, forward],
    // 위로 — 글 → 섹션·홈, 섹션 → 홈
    ['글 → 글 목록(헤더 "글")', POST, POSTS_PATH, undefined, back],
    ['글 → 홈(워드마크)', POST, HOME_PATH, undefined, back],
    [
      '글 → 태그로 필터된 목록',
      POST,
      archivePath({ tag: 'ci' }),
      undefined,
      back,
    ],
    ['글 목록 → 홈(워드마크)', POSTS_PATH, HOME_PATH, undefined, back],
    // 깊이가 순서보다 먼저 — 시리즈 마지막 편의 "시리즈 목록 →"
    ['글 → 시리즈 목록(다음 자리)', POST, SERIES_PATH, 'next', back],
    // 같은 깊이 — 순서가 있을 때만
    ['다음 글', POST, FOLDER_POST, 'next', forward],
    ['이전 글', FOLDER_POST, POST, 'prev', back],
    ['글 → 글(순서 없음)', POST, FOLDER_POST, undefined, null],
    ['글 목록 ↔ 시리즈(헤더 형제)', POSTS_PATH, SERIES_PATH, undefined, null],
    ['시리즈 ↔ 소개(헤더 형제)', SERIES_PATH, ABOUT_PATH, undefined, null],
    [
      '시리즈 → 시리즈로 필터된 목록',
      SERIES_PATH,
      archivePath({ series: 'ci' }),
      undefined,
      null,
    ],
    ['홈 → 홈', HOME_PATH, HOME_PATH, undefined, null],
  ];
  test.each(cases)('%s', (_, from, to, order, expected) => {
    expect(navTransitionType(from, to, order)).toBe(expected);
  });

  test('방향은 이동의 성질이다 — 같은 두 경로를 거꾸로 가면 반대 방향이다', () => {
    for (const [, from, to, order, expected] of cases) {
      if (expected === null || order !== undefined) continue;
      expect(navTransitionType(to, from)).toBe(
        expected === forward ? back : forward,
      );
    }
  });
});

describe('linkTransitionTypes — 링크 이동 하나의 type 전부', () => {
  test('글을 여는 카드는 공유 요소의 type과 방향을 함께 단다', () => {
    expect(linkTransitionTypes(HOME_PATH, POST, { opensPost: true })).toEqual([
      POST_OPEN_TRANSITION_TYPE,
      NAV_TRANSITION.forward,
    ]);
  });

  test('방향이 없는 이동은 type이 없다 — 기본 페이드', () => {
    expect(linkTransitionTypes(POSTS_PATH, SERIES_PATH)).toEqual([]);
  });

  test('형제 순서를 넘긴다', () => {
    expect(linkTransitionTypes(POST, FOLDER_POST, { order: 'prev' })).toEqual([
      NAV_TRANSITION.back,
    ]);
  });
});
