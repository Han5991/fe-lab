import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import type { PostRecord } from './shared.ts';
import { findSeriesFiles, validateSeriesFile } from './series.ts';

function post(relPath: string, data: Record<string, unknown> = {}): PostRecord {
  return {
    absPath: `/posts/${relPath}`,
    relPath,
    data: { title: 'x', status: 'published', ...data },
    content: '',
  };
}

const RECORDS = [
  post('bundler/0. 프롤로그.md', { slug: 'bundler-00-prologue' }),
  post('bundler/1. 개념.md'),
  post('bundler/deep/nested.md', { slug: 'nested-post' }),
  // status가 없는 메타 노트 — 빌드에 없으므로 order가 가리킬 수 없다
  { ...post('bundler/PLAN.md', { slug: 'plan' }), data: { slug: 'plan' } },
];

const rules = (raw: string, records = RECORDS) =>
  validateSeriesFile('bundler/_series.yml', raw, records).map(i => [
    i.rule,
    i.severity,
    i.line,
  ]);

test('_series.yml: 주석뿐인 선언·정상 선언은 이슈 없음', () => {
  expect(rules('# 시리즈로 선언한다\n')).toStrictEqual([]);
  expect(
    rules(
      [
        'title: 번들러 만들기',
        'description: 설명',
        'order:',
        '  - bundler-00-prologue',
        // 명시 slug가 없는 글은 파일 경로 slug로 맞춘다
        '  - bundler/1. 개념',
      ].join('\n'),
    ),
  ).toStrictEqual([]);
});

// 정규식 메타 문자가 든 키에서도 검사가 멈추지 않는다.
test.each([
  ['title: t\norders:\n  - bundler-00-prologue\n', 2],
  ['order(:\n  - x\ntitle: t\n', null],
  ['order[:\n  - x\ntitle: t\n', null],
])('_series.yml: 모르는 키 %j → unknown-series-key 경고', (raw, line) => {
  expect(rules(raw)).toStrictEqual([['unknown-series-key', 'warning', line]]);
});

test('_series.yml: 어떤 글과도 맞지 않는 order 항목은 unmatched-series-order 에러', () => {
  const issues = validateSeriesFile(
    'bundler/_series.yml',
    'order:\n  - bundler-00-prologue\n  - bundler-01-typo\n  - nested-post\n  - plan\n',
    RECORDS,
  );
  expect(issues.map(i => [i.rule, i.severity, i.line])).toStrictEqual([
    ['unmatched-series-order', 'error', 1],
  ]);
  // 하위 폴더의 글(자기 시리즈)·메타 노트(빌드에 없음)도 이 폴더의 글이 아니다.
  expect(issues[0]?.message).toContain('bundler-01-typo, nested-post, plan');
});

test.each([
  ['order가 배열이 아님', 'order: bundler-00-prologue\n', 1],
  ['order에 문자열 아닌 항목', 'order:\n  - 1\n', 1],
  ['title이 문자열이 아님', 'title:\n  - a\n', 1],
  ['YAML 문법 오류', 'title: a: b: c\n', null],
  ['매핑이 아님', '- a\n- b\n', null],
])('_series.yml: %s → invalid-series-meta 에러', (_, raw, line) => {
  expect(rules(raw)).toStrictEqual([['invalid-series-meta', 'error', line]]);
});

test('findSeriesFiles: 원고 폴더 아래의 _series.yml을 하위 폴더까지 찾는다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'series-files-'));
  try {
    mkdirSync(join(dir, 'a', 'b'), { recursive: true });
    writeFileSync(join(dir, 'a', '_series.yml'), '');
    writeFileSync(join(dir, 'a', 'b', '_series.yml'), '');
    writeFileSync(join(dir, 'a', '_series.yaml'), '');
    expect(findSeriesFiles(dir)).toStrictEqual([
      'a/_series.yml',
      'a/b/_series.yml',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
