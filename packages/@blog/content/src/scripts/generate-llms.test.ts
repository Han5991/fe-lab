import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLlmsText, toSummary } from './generate-llms';
import type { PostData } from '../post';

const SITE = 'https://example.dev';

function makePost(over: Partial<PostData> = {}): PostData {
  return {
    slug: 'hello',
    originalSlug: 'hello',
    relativeDir: '',
    title: '안녕',
    date: '2026-01-01',
    content: '본문',
    readMin: 1,
    excerpt: '요약',
    status: 'published',
    ...over,
  };
}

// 시리즈 메타는 디스크의 `_series.yml`에서 오므로, 단위 테스트에서는 없는 것으로
// 주입한다 (실제 시리즈 메타가 바뀌어도 이 테스트는 흔들리지 않는다).
const OPTS = { siteUrl: SITE, resolveSeriesMeta: () => null };

// ── toSummary ────────────────────────────────────────────────────────────────

test('toSummary: excerpt가 있으면 그대로', () => {
  assert.equal(toSummary({ excerpt: '요약문', content: '본문' }), '요약문');
});

test('toSummary: excerpt가 비어 있으면 본문으로 폴백 (마크다운 기호 제거)', () => {
  assert.equal(
    toSummary({ excerpt: '', content: '# 제목 **굵게**' }),
    '제목 굵게',
  );
});

test('toSummary: 140자를 넘으면 말줄임', () => {
  const s = toSummary({ excerpt: '가'.repeat(200), content: '' });
  assert.ok(s.length <= 141, `${s.length}자`);
  assert.ok(s.endsWith('…'));
});

test('toSummary: 개행은 공백 하나로 압축 (링크 한 줄이 깨지지 않도록)', () => {
  // 목록 항목 안에 개행이 들어가면 마크다운 리스트가 끊긴다.
  assert.equal(toSummary({ excerpt: '앞\n\n뒤', content: '' }), '앞 뒤');
});

// ── buildLlmsText ────────────────────────────────────────────────────────────

test('llms: 모든 글이 링크로 나온다 (손으로 관리하다 6편이 누락됐던 회귀)', () => {
  const posts = [
    makePost({ slug: 'a', title: 'A' }),
    makePost({ slug: 'b', title: 'B', series: 'bundler' }),
    makePost({ slug: 'c', title: 'C' }),
  ];
  const text = buildLlmsText(posts, OPTS);
  for (const slug of ['a', 'b', 'c']) {
    assert.ok(text.includes(`${SITE}/posts/${slug}/`), `${slug} 링크가 없음`);
  }
});

test('llms: 글 수는 실제 개수 ("45+" 같은 손으로 적은 숫자가 아님)', () => {
  const text = buildLlmsText(
    [makePost({ slug: 'a' }), makePost({ slug: 'b' })],
    OPTS,
  );
  assert.ok(
    text.includes('Complete archive of 2 frontend engineering articles'),
  );
  assert.ok(text.includes('- Total posts: 2 articles'));
});

test('llms: Last updated는 가장 최근 글 날짜 (빌드 날짜가 아님)', () => {
  // 빌드 날짜를 쓰면 매일 도는 cron 빌드마다 값이 전진한다.
  const text = buildLlmsText(
    [
      makePost({ slug: 'a', date: '2025-03-01' }),
      makePost({ slug: 'b', date: '2026-07-31' }),
      makePost({ slug: 'c', date: '2026-01-15' }),
    ],
    OPTS,
  );
  assert.ok(text.includes('Last updated: 2026-07-31'));
});

test('llms: 날짜 있는 글이 하나도 없으면 (미상)', () => {
  const text = buildLlmsText([makePost({ slug: 'a', date: null })], OPTS);
  assert.ok(text.includes('Last updated: (미상)'));
});

test('llms: 시리즈 글은 시리즈 섹션에, 나머지는 단독 포스트 섹션에', () => {
  const text = buildLlmsText(
    [
      makePost({ slug: 'solo', title: '단독글' }),
      makePost({ slug: 's1', title: '시리즈글1', series: 'bundler' }),
      makePost({ slug: 's2', title: '시리즈글2', series: 'bundler' }),
    ],
    // 편수가 아니라 `_series.yml`의 존재가 시리즈를 만든다 — 메타를 주입한다.
    { siteUrl: SITE, resolveSeriesMeta: () => ({ name: 'bundler' }) },
  );
  const seriesIdx = text.indexOf('## 시리즈: bundler');
  const soloIdx = text.indexOf('## 단독 포스트');
  assert.ok(seriesIdx > 0 && soloIdx > 0);
  assert.ok(
    text.indexOf('시리즈글1') > seriesIdx &&
      text.indexOf('시리즈글1') < soloIdx,
  );
  assert.ok(text.indexOf('단독글') > soloIdx);
});

test('llms: _series.yml이 없는 폴더는 시리즈가 아니다 (/series 페이지와 같은 판정)', () => {
  // 선언 없는 폴더까지 시리즈로 부르면, 사이트에는 없는 "시리즈"가 색인에만 생긴다.
  const text = buildLlmsText(
    [makePost({ slug: 'only', title: '한편글', series: 'testing' })],
    OPTS,
  );
  assert.ok(!text.includes('## 시리즈: testing'));
  assert.ok(text.includes('## 단독 포스트'));
  assert.ok(text.includes('한편글'));
});

test('llms: 여러 편이어도 _series.yml이 없으면 단독 포스트로 내려간다', () => {
  // 편수 기반 자동 승격을 없앤 뒤의 회귀 가드 — 폴더에 모아 두는 것만으로
  // 색인에 시리즈가 생기면 안 된다.
  const text = buildLlmsText(
    [
      makePost({ slug: 'a', title: 'CI글1', series: 'ci' }),
      makePost({ slug: 'b', title: 'CI글2', series: 'ci' }),
      makePost({ slug: 'c', title: 'CI글3', series: 'ci' }),
    ],
    OPTS,
  );
  assert.ok(!text.includes('## 시리즈: ci'));
  assert.ok(text.includes('## 단독 포스트'));
  for (const t of ['CI글1', 'CI글2', 'CI글3']) {
    assert.ok(text.includes(t), `${t}가 빠짐`);
  }
});

test('llms: _series.yml이 있으면 한 편이어도 시리즈 (표시명·설명도 함께)', () => {
  const text = buildLlmsText(
    [makePost({ slug: 'only', title: '한편글', series: 'ci' })],
    {
      siteUrl: SITE,
      resolveSeriesMeta: () => ({
        name: 'ci',
        title: 'CI 파이프라인',
        description: '빌드를 빠르게',
      }),
    },
  );
  assert.ok(text.includes('## 시리즈: CI 파이프라인'));
  assert.ok(text.includes('빌드를 빠르게'));
});

test('llms: _series.yml의 order가 날짜보다 우선한다', () => {
  // 저자가 정해둔 읽는 순서를 무시하면 색인이 사이트와 다른 순서를 말하게 된다.
  const text = buildLlmsText(
    [
      makePost({ slug: 'b', title: '나중글', series: 's', date: '2026-01-01' }),
      makePost({ slug: 'a', title: '먼저글', series: 's', date: '2026-02-01' }),
    ],
    {
      siteUrl: SITE,
      resolveSeriesMeta: () => ({ name: 's', order: ['a', 'b'] }),
    },
  );
  assert.ok(text.indexOf('먼저글') < text.indexOf('나중글'));
});

test('llms: 시리즈 안에서는 1편부터 (날짜 오름차순)', () => {
  const text = buildLlmsText(
    [
      makePost({ slug: 'p3', title: '3편', series: 's', date: '2026-03-01' }),
      makePost({ slug: 'p1', title: '1편', series: 's', date: '2026-01-01' }),
      makePost({ slug: 'p2', title: '2편', series: 's', date: '2026-02-01' }),
    ],
    // 시리즈 섹션 안의 정렬을 보는 테스트이므로 시리즈로 선언해 둔다.
    { siteUrl: SITE, resolveSeriesMeta: () => ({ name: 's' }) },
  );
  assert.ok(text.indexOf('1편') < text.indexOf('2편'));
  assert.ok(text.indexOf('2편') < text.indexOf('3편'));
});

test('llms: 같은 날짜 글은 입력 순서를 지킨다 (빌드마다 흔들리지 않도록)', () => {
  // 정렬은 사이트와 공유하는 sortPostsBySeriesOrder가 하고, 그 정렬은 안정적이다.
  // 입력(getAllPosts)이 이미 originalSlug로 2차 정렬돼 결정적이므로 그대로 유지된다 —
  // 여기서 따로 2차 키를 두면 색인만 사이트와 다른 순서를 말하게 된다.
  const first = makePost({
    slug: 'zzz',
    title: 'Z글',
    series: 's',
    date: '2026-01-01',
  });
  const second = makePost({
    slug: 'aaa',
    title: 'A글',
    series: 's',
    date: '2026-01-01',
  });
  const text = buildLlmsText([first, second], OPTS);
  assert.ok(text.indexOf('Z글') < text.indexOf('A글'));
  // 같은 입력이면 언제나 같은 출력
  assert.equal(text, buildLlmsText([first, second], OPTS));
});

test('llms: 한글 slug는 URL 인코딩 (sitemap/rss와 동일)', () => {
  const text = buildLlmsText([makePost({ slug: '한글/글' })], OPTS);
  assert.ok(text.includes(`${SITE}/posts/${encodeURIComponent('한글')}/`));
});

test('llms: siteUrl은 주입값을 쓴다 (하드코딩 도메인 없음)', () => {
  const text = buildLlmsText([makePost()], OPTS);
  assert.ok(!text.includes('blog.sangwook.dev'));
});
