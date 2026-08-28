import { expect, test } from 'vitest';
import { hasFrontmatter, isMetaFile } from './postFiles.ts';

// ── hasFrontmatter (frontmatter 구간 존재 여부 = 빌드 대상 판별) ──────────────

test('hasFrontmatter: --- 로 열고 닫으면 true', () => {
  expect(hasFrontmatter('---\ntitle: A\n---\n본문')).toBe(true);
});

test('hasFrontmatter: 첫 줄이 --- 가 아니면 false (메타 노트)', () => {
  expect(hasFrontmatter('# 제목\n본문')).toBe(false);
  expect(hasFrontmatter('본문만')).toBe(false);
});

test('hasFrontmatter: 여는 --- 만 있고 닫는 --- 가 없으면 false', () => {
  expect(hasFrontmatter('---\ntitle: A\n본문(닫는 구분자 없음)')).toBe(false);
});

test('hasFrontmatter: CRLF(\\r\\n) 개행도 정상 처리', () => {
  expect(hasFrontmatter('---\r\ntitle: A\r\n---\r\n본문')).toBe(true);
});

test('hasFrontmatter: 첫 줄 앞뒤 공백이 있어도 --- 인식', () => {
  expect(hasFrontmatter('  ---  \ntitle: A\n  ---  \n본문')).toBe(true);
});

test('hasFrontmatter: 빈 문자열은 false', () => {
  expect(hasFrontmatter('')).toBe(false);
});

// ── isMetaFile (이름 기반 메타 파일 제외 — 이름 집합은 설정이 준다) ──────────

// 어휘는 소비자 소유다 — 테스트도 소비자처럼 자기 집합을 만든다.
const META = new Set(['PLAN.md', 'THUMBNAIL_LOG.md', 'STUDY_LOG.md']);

test('isMetaFile: 집합에 있는 파일명은 true', () => {
  expect(isMetaFile('PLAN.md', META)).toBe(true);
  expect(isMetaFile('THUMBNAIL_LOG.md', META)).toBe(true);
  expect(isMetaFile('STUDY_LOG.md', META)).toBe(true);
});

test('isMetaFile: 경로가 붙어 있어도 basename으로 판별', () => {
  expect(isMetaFile('/abs/posts/번들러/PLAN.md', META)).toBe(true);
  expect(isMetaFile('posts/PLAN.md', META)).toBe(true);
});

test('isMetaFile: 집합에 없는 파일은 false', () => {
  expect(isMetaFile('intro.md', META)).toBe(false);
  expect(isMetaFile('/abs/posts/번들러/3편.md', META)).toBe(false);
  expect(isMetaFile('plan.md', META)).toBe(false); // 대소문자 구분
});

test('isMetaFile: 빈 집합(기본값)이면 어떤 이름도 제외하지 않는다', () => {
  expect(isMetaFile('PLAN.md', new Set())).toBe(false);
});
