import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterGroupedEntries,
  filterPostsByQuery,
  groupPostsBySeries,
  groupPostsByTags,
} from './filtering';

const posts = [
  {
    title: 'Bundler 첫 글',
    excerpt: 'webpack 이야기',
    series: 'bundler',
    tags: ['webpack', 'build'],
    date: '2025-03-01',
  },
  {
    title: 'TypeScript 타입',
    excerpt: 'Conditional types',
    series: 'typescript',
    tags: ['typescript'],
    date: '2025-04-01',
  },
  {
    title: 'Bundler 두 번째',
    excerpt: 'Vite 비교',
    series: 'bundler',
    tags: ['vite', 'build'],
    date: '2025-05-01',
  },
  {
    title: '시리즈 없는 글',
    excerpt: '',
    tags: ['etc'],
    date: '2025-06-01',
  },
];

test('filterPostsByQuery: query가 비면 입력 그대로', () => {
  assert.deepEqual(filterPostsByQuery(posts, ''), posts);
  assert.deepEqual(filterPostsByQuery(posts, '   '), posts);
});

test('filterPostsByQuery: title 매칭', () => {
  const result = filterPostsByQuery(posts, 'TypeScript');
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'TypeScript 타입');
});

test('filterPostsByQuery: excerpt 매칭, 대소문자 무시', () => {
  const result = filterPostsByQuery(posts, 'VITE');
  assert.equal(result.length, 1);
  assert.equal(result[0].excerpt, 'Vite 비교');
});

test('groupPostsBySeries: series 없는 글은 제외', () => {
  const groups = groupPostsBySeries(posts);
  const seriesNames = groups.map(([name]) => name);
  assert.deepEqual(seriesNames.sort(), ['bundler', 'typescript']);
});

test('groupPostsBySeries: 첫 글 date 내림차순 정렬', () => {
  // posts 배열 순서대로 들어가므로 bundler 그룹의 첫 글은 2025-03-01,
  // typescript 그룹의 첫 글은 2025-04-01 → typescript가 먼저
  const groups = groupPostsBySeries(posts);
  assert.equal(groups[0][0], 'typescript');
  assert.equal(groups[1][0], 'bundler');
});

test('groupPostsByTags: 글 수 내림차순', () => {
  const groups = groupPostsByTags(posts);
  // build: 2개 / 나머지: 1개
  assert.equal(groups[0][0], 'build');
  assert.equal(groups[0][1].length, 2);
});

test('filterGroupedEntries: 그룹명 매칭', () => {
  const entries = groupPostsByTags(posts);
  const filtered = filterGroupedEntries(entries, 'webpack');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0][0], 'webpack');
});

test('filterGroupedEntries: 글 제목 매칭으로 그룹 통과', () => {
  const entries = groupPostsBySeries(posts);
  const filtered = filterGroupedEntries(entries, 'TypeScript');
  // typescript 그룹의 글 제목이 매칭되어 typescript 그룹만 남음
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0][0], 'typescript');
});
