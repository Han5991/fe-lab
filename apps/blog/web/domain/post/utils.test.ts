import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodePostSlug } from './utils';

test('encodePostSlug: 영숫자/슬래시는 그대로 보존된다', () => {
  assert.equal(encodePostSlug('a/b/c'), 'a/b/c');
});

test('encodePostSlug: 대괄호·한글·공백 세그먼트는 인코딩되고 슬래시는 보존된다', () => {
  assert.equal(
    encodePostSlug('[Typescript로 설계하는 프로젝트]/글제목'),
    '%5BTypescript%EB%A1%9C%20%EC%84%A4%EA%B3%84%ED%95%98%EB%8A%94%20%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%5D/%EA%B8%80%EC%A0%9C%EB%AA%A9',
  );
});

test('encodePostSlug: 단일 한글 세그먼트는 encodeURIComponent 결과와 동일하다', () => {
  assert.equal(encodePostSlug('번들러'), '%EB%B2%88%EB%93%A4%EB%9F%AC');
  assert.equal(encodePostSlug('번들러'), encodeURIComponent('번들러'));
});

test('encodePostSlug: 빈 문자열은 빈 문자열을 반환한다', () => {
  assert.equal(encodePostSlug(''), '');
});

test('encodePostSlug: 이미 인코딩된 입력은 이중 인코딩된다(% → %25)', () => {
  assert.equal(encodePostSlug('%20'), '%2520');
  assert.equal(encodePostSlug('%5B'), '%255B');
});

test('encodePostSlug: 세그먼트 내부 공백은 %20으로 인코딩된다', () => {
  assert.equal(encodePostSlug('hello world'), 'hello%20world');
  assert.equal(encodePostSlug('a b/c d'), 'a%20b/c%20d');
});

test('encodePostSlug: 단일 슬래시는 빈 세그먼트 두 개로 join되어 그대로 유지된다', () => {
  assert.equal(encodePostSlug('/'), '/');
});

test('encodePostSlug: 연속 슬래시(빈 세그먼트)도 보존된다', () => {
  assert.equal(encodePostSlug('a//b'), 'a//b');
});

test('encodePostSlug: 앞뒤 슬래시는 빈 세그먼트로 보존된다', () => {
  assert.equal(encodePostSlug('/a/b/'), '/a/b/');
});

test('encodePostSlug: URL 예약/특수문자(? & #)는 퍼센트 인코딩된다', () => {
  assert.equal(encodePostSlug('foo?bar&baz'), 'foo%3Fbar%26baz');
  assert.equal(encodePostSlug('#anchor'), '%23anchor');
});

test('encodePostSlug: 악센트 문자(café)는 UTF-8 퍼센트 인코딩된다', () => {
  assert.equal(encodePostSlug('café'), 'caf%C3%A9');
});

test('encodePostSlug: 하이픈/언더스코어/숫자는 비예약 문자로 보존된다', () => {
  assert.equal(
    encodePostSlug('한글-제목_123'),
    '%ED%95%9C%EA%B8%80-%EC%A0%9C%EB%AA%A9_123',
  );
});

test('encodePostSlug: 이모지(서로게이트 페어)도 UTF-8 바이트로 인코딩된다', () => {
  assert.equal(encodePostSlug('emoji😀'), 'emoji%F0%9F%98%80');
});

test('encodePostSlug: 각 세그먼트가 독립적으로 encodeURIComponent된 결과와 일치한다', () => {
  const slug = '[A 1]/번들러/c d';
  const expected = slug
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/');
  assert.equal(encodePostSlug(slug), expected);
});
