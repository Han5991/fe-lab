import { expect, test } from 'vitest';

import {
  buildAuthorJsonLd,
  buildOrganizationJsonLd,
  safeJsonLd,
  siteNodeId,
} from './jsonLd.ts';
import { TEST_VALUES } from './testValues.ts';

test('safeJsonLd: 일반 객체는 JSON.stringify와 동일한 직렬화', () => {
  const data = { '@type': 'Person', name: 'Sangwook' };
  expect(safeJsonLd(data)).toBe('{"@type":"Person","name":"Sangwook"}');
});

test('safeJsonLd: </script> 의 < 를 \\u003c 로 바꿔 태그 조기 종료를 막는다', () => {
  const out = safeJsonLd({ bio: 'x</script><script>alert(1)</script>' });
  expect(
    !out.includes('</script>'),
    '원시 </script> 시퀀스가 남으면 안 된다',
  ).toBeTruthy();
  expect(
    out.includes('\\u003c/script'),
    '< 가 \\u003c 로 치환돼야 한다',
  ).toBeTruthy();
});

test('safeJsonLd: <!-- (HTML 주석 시작)도 무력화', () => {
  const out = safeJsonLd({ note: '<!-- hi' });
  expect(!out.includes('<!--')).toBeTruthy();
  expect(out.includes('\\u003c!--')).toBeTruthy();
});

test('safeJsonLd: 이스케이프해도 다시 파싱하면 원래 값과 같다(의미 보존)', () => {
  const data = { x: 'a < b </script>', nested: { y: ['<', '<!'] } };
  expect(JSON.parse(safeJsonLd(data))).toStrictEqual(data);
});

test('safeJsonLd: < 가 없으면 JSON.stringify 결과와 완전히 동일', () => {
  const data = { a: 1, b: ['x', 'y'], c: { d: true } };
  expect(safeJsonLd(data)).toBe(JSON.stringify(data));
});

// 홈 @graph의 정의와 글의 publisher·author가 같은 공통 필드를 쓴다 — id·로고 URL 규칙을 여기서 잠근다.
test('siteNodeId: 사이트 origin 뒤에 /#노드', () => {
  expect(siteNodeId('https://blog.test', 'organization')).toBe(
    'https://blog.test/#organization',
  );
});

test('buildOrganizationJsonLd: id·이름·로고 절대 URL과 크기가 설정에서 온다', () => {
  expect(buildOrganizationJsonLd(TEST_VALUES.site)).toStrictEqual({
    '@type': 'Organization',
    '@id': 'https://blog.test/#organization',
    name: 'Test Blog',
    url: 'https://blog.test',
    logo: {
      '@type': 'ImageObject',
      url: 'https://blog.test/test-logo.svg',
      width: 100,
      height: 20,
    },
  });
});

test('buildAuthorJsonLd: id·이름·alternateName이 설정에서 온다', () => {
  expect(buildAuthorJsonLd(TEST_VALUES.site, TEST_VALUES.author)).toStrictEqual(
    {
      '@type': 'Person',
      '@id': 'https://blog.test/#author',
      name: 'Test Author',
      alternateName: '테스트',
      url: 'https://blog.test',
    },
  );
});
