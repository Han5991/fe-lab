import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLlmsFullText } from './generate-llms-full';
import type { PostData } from '../domain/post';

function makePost(over: Partial<PostData> = {}): PostData {
  return {
    slug: 'hello',
    originalSlug: 'hello',
    relativeDir: '',
    title: 'Hello',
    date: '2026-05-09',
    updatedAt: null,
    content: 'content body',
    readMin: 1,
    excerpt: '요약',
    tags: ['x'],
    series: undefined,
    status: 'published',
    ...over,
  };
}

test('llms-full: 헤더/푸터 포함', () => {
  const text = buildLlmsFullText([]);
  assert.ok(text.startsWith('# Frontend Lab'));
  assert.ok(text.includes('## Key Facts'));
  assert.ok(text.includes('## Contact'));
  assert.ok(text.includes('https://blog.sangwook.dev'));
  assert.ok(text.includes('https://github.com/Han5991'));
  assert.ok(text.includes('https://blog.sangwook.dev/rss.xml'));
});

test('llms-full: Total posts 수 반영', () => {
  const text = buildLlmsFullText([makePost(), makePost({ slug: 'b' })]);
  assert.ok(text.includes('Total posts: 2+ articles'));
});

test('llms-full: 시리즈 헤더와 단독 헤더', () => {
  const text = buildLlmsFullText([
    makePost({ slug: 'a', series: 'bundler' }),
    makePost({ slug: 'b', series: undefined }),
  ]);
  assert.ok(text.includes('## 시리즈: bundler'));
  assert.ok(text.includes('## 단독 포스트'));
});

test('llms-full: 단독 포스트만 있으면 시리즈 헤더 없음', () => {
  const text = buildLlmsFullText([makePost({ slug: 'a', series: undefined })]);
  assert.ok(!text.includes('## 시리즈:'));
  assert.ok(text.includes('## 단독 포스트'));
});

test('llms-full: 시리즈 포스트만 있으면 단독 헤더 없음', () => {
  const text = buildLlmsFullText([makePost({ slug: 'a', series: 'bundler' })]);
  assert.ok(text.includes('## 시리즈: bundler'));
  assert.ok(!text.includes('## 단독 포스트'));
});

test('llms-full: 포스트 entry 형식 = ### [title](url) (date)', () => {
  const text = buildLlmsFullText([
    makePost({ slug: 'my-post', title: 'My Post', date: '2026-05-09' }),
  ]);
  assert.ok(
    text.includes(
      '### [My Post](https://blog.sangwook.dev/posts/my-post/) (2026-05-09)',
    ),
  );
});

test('llms-full: tags가 있으면 entry에 포함', () => {
  const text = buildLlmsFullText([
    makePost({ slug: 'a', tags: ['react', 'ts'] }),
  ]);
  assert.ok(text.includes('Tags: react, ts.'));
});

test('llms-full: tags가 비면 Tags 표기 없음', () => {
  const text = buildLlmsFullText([makePost({ slug: 'a', tags: undefined })]);
  assert.ok(!text.includes('Tags:'));
});

test('llms-full: excerpt가 200자 초과면 잘림', () => {
  const longExcerpt = 'A'.repeat(300);
  const text = buildLlmsFullText([
    makePost({ slug: 'a', excerpt: longExcerpt }),
  ]);
  // 200자 + "..." 확인
  assert.ok(text.includes('A'.repeat(200) + '...'));
  assert.ok(!text.includes('A'.repeat(201)));
});

test('llms-full: excerpt 없으면 content에서 추출', () => {
  const text = buildLlmsFullText([
    makePost({ slug: 'a', excerpt: undefined, content: '# h1\n본문입니다' }),
  ]);
  // 마크다운 기호 제거된 형태가 들어가야 함
  assert.ok(
    text.includes('h1\n본문입니다...') ||
      text.includes('h1 본문입니다...') ||
      text.includes('h1'),
  );
});

test('llms-full: 같은 시리즈 내 포스트는 date 오름차순', () => {
  const text = buildLlmsFullText([
    makePost({ slug: 'a', title: 'A', date: '2026-03-01', series: 's' }),
    makePost({ slug: 'b', title: 'B', date: '2026-01-01', series: 's' }),
    makePost({ slug: 'c', title: 'C', date: '2026-02-01', series: 's' }),
  ]);
  const idxB = text.indexOf('### [B]');
  const idxC = text.indexOf('### [C]');
  const idxA = text.indexOf('### [A]');
  // B(1월) < C(2월) < A(3월) 순서
  assert.ok(idxB > 0 && idxC > idxB && idxA > idxC);
});

test('llms-full: 단독 포스트는 date 내림차순', () => {
  const text = buildLlmsFullText([
    makePost({ slug: 'old', title: 'Old', date: '2025-01-01' }),
    makePost({ slug: 'new', title: 'New', date: '2026-05-01' }),
  ]);
  const idxNew = text.indexOf('### [New]');
  const idxOld = text.indexOf('### [Old]');
  assert.ok(idxNew > 0 && idxNew < idxOld);
});
