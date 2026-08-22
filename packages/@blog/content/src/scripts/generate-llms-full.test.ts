import { expect, test } from 'vitest';
import { buildLlmsFullText } from './generate-llms-full.ts';
import type { PostData } from '../post/index.ts';
import { defineTestContent } from '../shared/testValues.ts';
import { sep } from 'node:path';

// 사이트 정체성·저자·산문은 전부 설정에서 온다(기본값 없음).
const CONFIG = defineTestContent({ root: `${sep}tmp${sep}app` });
const OPTS = {
  site: CONFIG.site,
  author: CONFIG.author,
  llms: CONFIG.llms,
};

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
  const text = buildLlmsFullText([], OPTS);
  expect(text.startsWith(`# ${CONFIG.site.name}`)).toBeTruthy();
  expect(text.includes('## Key Facts')).toBeTruthy();
  expect(text.includes('## Contact')).toBeTruthy();
  expect(text.includes(CONFIG.site.url)).toBeTruthy();
  expect(text.includes(CONFIG.author.github)).toBeTruthy();
  expect(text.includes(`${CONFIG.site.url}/rss.xml`)).toBeTruthy();
});

test('llms-full: Total posts 수 반영', () => {
  const text = buildLlmsFullText([makePost(), makePost({ slug: 'b' })], OPTS);
  expect(text.includes('Total posts: 2+ articles')).toBeTruthy();
});

test('llms-full: 시리즈 헤더와 단독 헤더', () => {
  const text = buildLlmsFullText(
    [
      makePost({ slug: 'a', series: 'bundler' }),
      makePost({ slug: 'b', series: undefined }),
    ],
    OPTS,
  );
  expect(text.includes('## 시리즈: bundler')).toBeTruthy();
  expect(text.includes('## 단독 포스트')).toBeTruthy();
});

test('llms-full: 단독 포스트만 있으면 시리즈 헤더 없음', () => {
  const text = buildLlmsFullText(
    [makePost({ slug: 'a', series: undefined })],
    OPTS,
  );
  expect(!text.includes('## 시리즈:')).toBeTruthy();
  expect(text.includes('## 단독 포스트')).toBeTruthy();
});

test('llms-full: 시리즈 포스트만 있으면 단독 헤더 없음', () => {
  const text = buildLlmsFullText(
    [makePost({ slug: 'a', series: 'bundler' })],
    OPTS,
  );
  expect(text.includes('## 시리즈: bundler')).toBeTruthy();
  expect(!text.includes('## 단독 포스트')).toBeTruthy();
});

test('llms-full: 포스트 entry 형식 = ### [title](url) (date)', () => {
  const text = buildLlmsFullText(
    [makePost({ slug: 'my-post', title: 'My Post', date: '2026-05-09' })],
    OPTS,
  );
  expect(
    text.includes(
      `### [My Post](${CONFIG.site.url}/posts/my-post/) (2026-05-09)`,
    ),
  ).toBeTruthy();
});

test('llms-full: tags가 있으면 entry에 포함', () => {
  const text = buildLlmsFullText(
    [makePost({ slug: 'a', tags: ['react', 'ts'] })],
    OPTS,
  );
  expect(text.includes('Tags: react, ts.')).toBeTruthy();
});

test('llms-full: tags가 비면 Tags 표기 없음', () => {
  const text = buildLlmsFullText(
    [makePost({ slug: 'a', tags: undefined })],
    OPTS,
  );
  expect(!text.includes('Tags:')).toBeTruthy();
});

test('llms-full: excerpt가 200자 초과면 잘림', () => {
  const longExcerpt = 'A'.repeat(300);
  const text = buildLlmsFullText(
    [makePost({ slug: 'a', excerpt: longExcerpt })],
    OPTS,
  );
  // 200자 + "..." 확인
  expect(text.includes('A'.repeat(200) + '...')).toBeTruthy();
  expect(!text.includes('A'.repeat(201))).toBeTruthy();
});

test('llms-full: excerpt 없으면 content에서 추출 (마크다운 # 만 제거, 개행 유지)', () => {
  const text = buildLlmsFullText(
    [makePost({ slug: 'a', excerpt: undefined, content: '# h1\n본문입니다' })],
    OPTS,
  );
  // generate-llms-full의 content 추출은 `[#`*\[\]]` 만 제거하고 개행은 보존.
  // `# h1\n본문입니다` → `h1\n본문입니다` (trim 후 slice(0, 200))
  expect(
    text.includes('h1\n본문입니다...'),
    `expected 'h1\\n본문입니다...' in output, got: ${text.slice(0, 500)}`,
  ).toBeTruthy();
});

test('llms-full: 같은 시리즈 내 포스트는 date 오름차순', () => {
  const text = buildLlmsFullText(
    [
      makePost({ slug: 'a', title: 'A', date: '2026-03-01', series: 's' }),
      makePost({ slug: 'b', title: 'B', date: '2026-01-01', series: 's' }),
      makePost({ slug: 'c', title: 'C', date: '2026-02-01', series: 's' }),
    ],
    OPTS,
  );
  const idxB = text.indexOf('### [B]');
  const idxC = text.indexOf('### [C]');
  const idxA = text.indexOf('### [A]');
  // B(1월) < C(2월) < A(3월) 순서
  expect(idxB > 0 && idxC > idxB && idxA > idxC).toBeTruthy();
});

test('llms-full: 단독 포스트는 date 내림차순', () => {
  const text = buildLlmsFullText(
    [
      makePost({ slug: 'old', title: 'Old', date: '2025-01-01' }),
      makePost({ slug: 'new', title: 'New', date: '2026-05-01' }),
    ],
    OPTS,
  );
  const idxNew = text.indexOf('### [New]');
  const idxOld = text.indexOf('### [Old]');
  expect(idxNew > 0 && idxNew < idxOld).toBeTruthy();
});
