import { expect, test } from 'vitest';
import {
  buildAdminPostsIndex,
  buildPublicSearchIndex,
  CONTENT_PREVIEW_CHARS,
} from './generate-search-index.ts';
import type { PostData } from '../post/index.ts';

function makePost(over: Partial<PostData> = {}): PostData {
  return {
    slug: 'hello',
    originalSlug: 'hello',
    relativeDir: '',
    title: 'Hello',
    date: '2026-05-09',
    updatedAt: null,
    content: '',
    readMin: 1,
    excerpt: 'short',
    tags: ['t'],
    series: undefined,
    status: 'published',
    ...over,
  };
}

/** 검색 미리보기(contentPreview) — 본문 평문에서 펜스 코드를 뺀 것 */
const preview = (content: string): string =>
  buildPublicSearchIndex([makePost({ content })])[0].contentPreview;

test.each([
  ['before\n```ts\nconst x = 1;\n```\nafter', 'before after'],
  ['> 인용\n> ```ts\n> const x = 1;\n> ```\n다음', '인용 다음'],
  ['text ![alt](url) more', 'text more'],
  ['see [Next.js](https://nextjs.org)!', 'see Next.js!'],
  ['## hello *world* `code` _emph_ ~strike~', 'hello world code emph strike'],
  ['<div>hi</div><br/>there', 'hi there'],
  ['<span>x</span>', 'x'],
  ['a  \n\n  b', 'a b'],
  // 사이트 본문(extractPlainText)과 같은 규칙 — 식별자·비교식·제네릭을 뜯지 않는다.
  [
    'snake_case와 `arr[0] > 1`, Promise<void>',
    'snake_case와 arr[0] > 1, Promise<void>',
  ],
])('contentPreview: %j → %j', (content, expected) => {
  expect(preview(content)).toBe(expected);
});

test('buildPublicSearchIndex: 필수 필드 모두 포함', () => {
  const idx = buildPublicSearchIndex([
    makePost({
      slug: 'a',
      title: 'A',
      date: '2026-01-01',
      excerpt: 'ex',
      tags: ['x', 'y'],
      series: 's',
      content: 'hello world',
    }),
  ]);
  expect(idx.length).toBe(1);
  expect(idx[0]).toStrictEqual({
    slug: 'a',
    title: 'A',
    date: '2026-01-01',
    excerpt: 'ex',
    tags: ['x', 'y'],
    series: 's',
    contentPreview: 'hello world',
  });
});

test('buildPublicSearchIndex: 결측 필드는 기본값', () => {
  const idx = buildPublicSearchIndex([
    makePost({
      excerpt: undefined,
      tags: undefined,
      series: undefined,
    }),
  ]);
  expect(idx[0].excerpt).toBe('');
  expect(idx[0].tags).toStrictEqual([]);
  expect(idx[0].series).toBe(null);
});

test('buildPublicSearchIndex: contentPreview는 CONTENT_PREVIEW_CHARS로 제한', () => {
  const long = 'x'.repeat(CONTENT_PREVIEW_CHARS + 1000);
  const idx = buildPublicSearchIndex([makePost({ content: long })]);
  expect(idx[0].contentPreview.length).toBe(CONTENT_PREVIEW_CHARS);
});

test('buildAdminPostsIndex: status/scheduledDate 보존', () => {
  const idx = buildAdminPostsIndex([
    makePost({ status: 'draft' }),
    makePost({
      slug: 'b',
      status: 'scheduled',
      scheduledDate: '2026-06-01T00:00:00Z',
    }),
  ]);
  expect(idx[0].status).toBe('draft');
  expect(idx[0].scheduledDate).toBe(null);
  expect(idx[1].status).toBe('scheduled');
  expect(idx[1].scheduledDate).toBe('2026-06-01T00:00:00Z');
});

test('buildAdminPostsIndex: status를 그대로 전달 (published 폴백 없음)', () => {
  // 예전에는 `p.status || 'published'` 폴백이 있었습니다. status가 required가 된
  // 지금, 그 폴백은 draft를 published로 둔갑시킬 수 있는 fail-open 기본값입니다.
  const idx = buildAdminPostsIndex([makePost({ status: 'draft' })]);
  expect(idx[0].status).toBe('draft');
});

test('buildAdminPostsIndex: contentPreview 필드 없음 (보안/용량 분리)', () => {
  const idx = buildAdminPostsIndex([makePost({ content: 'should not leak' })]);
  expect(!('contentPreview' in idx[0])).toBeTruthy();
});

test('buildAdminPostsIndex: 대시보드가 읽는 필드만 싣는다 (공개 전 글의 요약·시리즈 비노출)', () => {
  // 이 파일은 인증 없이 받는 정적 산출물이다 — draft의 excerpt가 새면 안 된다.
  const idx = buildAdminPostsIndex([
    makePost({ status: 'draft', excerpt: '아직 공개 전인 요약', series: 's' }),
  ]);
  expect(Object.keys(idx[0]).sort()).toStrictEqual([
    'date',
    'scheduledDate',
    'slug',
    'status',
    'tags',
    'title',
  ]);
});

test('CONTENT_PREVIEW_CHARS 상수가 1500자', () => {
  // 검색 인덱스 크기를 통제하는 핵심 상수. 회귀 잠금.
  expect(CONTENT_PREVIEW_CHARS).toBe(1500);
});
