import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAdminPostsIndex,
  buildPublicSearchIndex,
  CONTENT_PREVIEW_CHARS,
  toPlainText,
} from './generate-search-index';
import type { PostData } from '../post';

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

test('toPlainText: 코드 블록 제거', () => {
  const raw = `before\n\`\`\`ts\nconst x = 1;\n\`\`\`\nafter`;
  assert.equal(toPlainText(raw), 'before after');
});

test('toPlainText: 이미지 마크업 제거', () => {
  assert.equal(toPlainText('text ![alt](url) more'), 'text more');
});

test('toPlainText: 링크는 텍스트만 남김', () => {
  assert.equal(
    toPlainText('see [Next.js](https://nextjs.org)!'),
    'see Next.js!',
  );
});

test('toPlainText: 마크다운 기호 제거', () => {
  assert.equal(
    toPlainText('## hello *world* `code` _emph_ ~strike~'),
    'hello world code emph strike',
  );
});

test('toPlainText: HTML 태그가 정상적으로 제거됨', () => {
  // HTML 태그 제거 → 그 다음 마크다운 기호 제거 → 공백 정리 순서.
  assert.equal(toPlainText('<div>hi</div><br/>there'), 'hi there');
});

test('toPlainText: 닫는 태그도 정상 처리', () => {
  assert.equal(toPlainText('<span>x</span>'), 'x');
});

test('toPlainText: 연속 공백 압축', () => {
  assert.equal(toPlainText('a  \n\n  b'), 'a b');
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
  assert.equal(idx.length, 1);
  assert.deepEqual(idx[0], {
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
  assert.equal(idx[0].excerpt, '');
  assert.deepEqual(idx[0].tags, []);
  assert.equal(idx[0].series, null);
});

test('buildPublicSearchIndex: contentPreview는 CONTENT_PREVIEW_CHARS로 제한', () => {
  const long = 'x'.repeat(CONTENT_PREVIEW_CHARS + 1000);
  const idx = buildPublicSearchIndex([makePost({ content: long })]);
  assert.equal(idx[0].contentPreview.length, CONTENT_PREVIEW_CHARS);
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
  assert.equal(idx[0].status, 'draft');
  assert.equal(idx[0].scheduledDate, null);
  assert.equal(idx[1].status, 'scheduled');
  assert.equal(idx[1].scheduledDate, '2026-06-01T00:00:00Z');
});

test('buildAdminPostsIndex: status를 그대로 전달 (published 폴백 없음)', () => {
  // 예전에는 `p.status || 'published'` 폴백이 있었습니다. status가 required가 된
  // 지금, 그 폴백은 draft를 published로 둔갑시킬 수 있는 fail-open 기본값입니다.
  const idx = buildAdminPostsIndex([makePost({ status: 'draft' })]);
  assert.equal(idx[0].status, 'draft');
});

test('buildAdminPostsIndex: contentPreview 필드 없음 (보안/용량 분리)', () => {
  const idx = buildAdminPostsIndex([makePost({ content: 'should not leak' })]);
  assert.ok(!('contentPreview' in idx[0]));
});

test('CONTENT_PREVIEW_CHARS 상수가 1500자', () => {
  // 검색 인덱스 크기를 통제하는 핵심 상수. 회귀 잠금.
  assert.equal(CONTENT_PREVIEW_CHARS, 1500);
});
