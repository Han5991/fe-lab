/**
 * 공유 요소 이름 — 카드와 글 상세가 같은 함수로 만드는 `view-transition-name`.
 *
 * 이름이 CSS 식별자 글자를 벗어나면 React가 `btoa`로 바꾸려 하고(한글에서 throw), 서로 다른 slug가
 * 같은 이름이 되면 한 페이지에 같은 이름이 둘이라 브라우저가 전환을 통째로 건너뛴다. 둘 다 빌드·
 * 렌더 테스트에는 보이지 않는다.
 */
import { describe, expect, test } from 'vitest';
import {
  POST_SHARED,
  postSharedName,
  type PostSharedPart,
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
