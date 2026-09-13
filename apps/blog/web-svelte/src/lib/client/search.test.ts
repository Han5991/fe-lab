import { expect, test } from 'vitest';
import {
  MAX_RESULTS,
  filterPosts,
  highlightParts,
  parseSearchIndex,
  pickContentSnippet,
  type SearchPost,
} from './search.ts';

/**
 * 검색 규칙 계약.
 *
 * 여기가 조용히 어긋나면 "검색은 열리는데 아무것도 안 나오는" 상태가 되는데,
 * 빌드도 `check-seo`도 통과한다. 화면 없이 확인할 수 있어야 하는 이유다.
 */

const post = (over: Partial<SearchPost> & { slug: string }): SearchPost => ({
  title: over.slug,
  date: '2026-01-01',
  excerpt: '',
  tags: [],
  series: null,
  ...over,
});

test('parseSearchIndex: 산출물이 아닌 값에도 던지지 않는다', () => {
  // fetch 응답은 외부 입력이다 — 배열이 아니면 빈 목록이지 예외가 아니다.
  expect(parseSearchIndex(null)).toStrictEqual([]);
  expect(parseSearchIndex({ posts: [] })).toStrictEqual([]);
  // slug·title이 없는 항목만 버리고 나머지는 기본값으로 살린다. 인덱스 한 줄이
  // 이상하다고 검색 전체가 죽는 것이 훨씬 나쁘다.
  expect(
    parseSearchIndex([
      { slug: 'a' },
      { title: '제목만' },
      { slug: 'b', title: 'B' },
    ]),
  ).toStrictEqual([
    { slug: 'b', title: 'B', date: null, excerpt: '', tags: [], series: null },
  ]);
});

test('parseSearchIndex: 태그 배열에서 문자열 아닌 원소를 걸러 낸다', () => {
  const [only] = parseSearchIndex([
    { slug: 'a', title: 'A', tags: ['ts', 3, null, 'svelte'] },
  ]);
  expect(only?.tags).toStrictEqual(['ts', 'svelte']);
});

test('제목·발췌·태그·시리즈·본문 미리보기를 모두 본다', () => {
  // React 판과 같은 필드 집합이다. 하나가 빠지면 결과 목록이 갈려
  // 프레임워크 비교가 아니라 검색 정책 비교가 된다.
  const posts = [
    post({ slug: 'a', title: '터보레포' }),
    post({ slug: 'b', excerpt: '터보레포로 캐시를 붙였다' }),
    post({ slug: 'c', tags: ['터보레포'] }),
    post({ slug: 'd', series: '터보레포 시리즈' }),
    post({ slug: 'e', contentPreview: '본문에 터보레포가 나온다' }),
    post({ slug: 'f', title: '무관' }),
  ];
  expect(filterPosts(posts, '터보레포').map(p => p.slug)).toStrictEqual([
    'a',
    'b',
    'c',
    'd',
    'e',
  ]);
});

test('대소문자를 가리지 않고, 앞뒤 공백은 무시한다', () => {
  const posts = [post({ slug: 'a', title: 'SvelteKit 이야기' })];
  expect(filterPosts(posts, '  sveltekit ').map(p => p.slug)).toStrictEqual([
    'a',
  ]);
});

test('빈 검색어: 최근 본 글이 있으면 그것이, 없으면 최신 글이 온다', () => {
  const posts = [post({ slug: 'a' }), post({ slug: 'b' })];
  const recent = [post({ slug: 'b' })];
  expect(filterPosts(posts, '', recent).map(p => p.slug)).toStrictEqual(['b']);
  expect(filterPosts(posts, '').map(p => p.slug)).toStrictEqual(['a', 'b']);
});

test(`결과는 ${MAX_RESULTS}건까지다`, () => {
  const posts = Array.from({ length: 30 }, (_, i) =>
    post({ slug: `p${i}`, title: '같은 제목' }),
  );
  expect(filterPosts(posts, '같은')).toHaveLength(MAX_RESULTS);
  expect(filterPosts(posts, '')).toHaveLength(MAX_RESULTS);
});

test('스니펫은 검색어 주변을 자른다 — 앞 140자가 아니다', () => {
  // 걸린 자리가 본문 한가운데일 때가 대부분이라, 앞부분만 보여주면 왜 이 글이
  // 걸렸는지 알 수 없다.
  const content = `${'가'.repeat(300)}핵심${'나'.repeat(300)}`;
  const snippet = pickContentSnippet(content, '핵심', 10);
  expect(snippet).toBe(`…${'가'.repeat(10)}핵심${'나'.repeat(10)}…`);
});

test('스니펫: 검색어가 없거나 안 걸리면 앞부분을 준다', () => {
  const content = '가'.repeat(300);
  expect(pickContentSnippet(content, '')).toHaveLength(140);
  expect(pickContentSnippet(content, '없는말')).toHaveLength(140);
  expect(pickContentSnippet('', '가')).toBe('');
});

test('스니펫: 문서 처음/끝에 걸리면 말줄임을 붙이지 않는다', () => {
  expect(pickContentSnippet('핵심이다', '핵심', 10)).toBe('핵심이다');
});

test('하이라이트는 겹치는 조각을 모두 표시한다', () => {
  expect(highlightParts('abcAbc', 'b')).toStrictEqual([
    { text: 'a', hit: false },
    { text: 'b', hit: true },
    { text: 'cA', hit: false },
    { text: 'b', hit: true },
    { text: 'c', hit: false },
  ]);
});

test('하이라이트는 원문을 한 글자도 잃거나 더하지 않는다', () => {
  // 표시 여부와 무관하게 조각을 이으면 원문이어야 한다.
  for (const query of ['a', 'ab', 'x', '']) {
    const text = 'aXabXABxa';
    expect(
      highlightParts(text, query)
        .map(part => part.text)
        .join(''),
      query,
    ).toBe(text);
  }
});

test('하이라이트: 정규식 특수문자가 든 검색어도 그대로 찾는다', () => {
  // 정규식으로 쪼개지 않으므로 이스케이프가 필요 없다. React 판은
  // escapeRegex를 따로 들고 있고, 그걸 빠뜨리면 `next.js` 같은 검색어가
  // 엉뚱한 자리를 표시한다.
  expect(highlightParts('next.js와 nextxjs', 'next.js')).toStrictEqual([
    { text: 'next.js', hit: true },
    { text: '와 nextxjs', hit: false },
  ]);
});

test('하이라이트: 빈 검색어는 원문 한 조각이다', () => {
  expect(highlightParts('가나다', '  ')).toStrictEqual([
    { text: '가나다', hit: false },
  ]);
});
