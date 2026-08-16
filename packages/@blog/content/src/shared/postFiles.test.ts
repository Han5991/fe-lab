import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasFrontmatter, isMetaFile } from './postFiles';

// ── hasFrontmatter (frontmatter 구간 존재 여부 = 빌드 대상 판별) ──────────────

test('hasFrontmatter: --- 로 열고 닫으면 true', () => {
  assert.equal(hasFrontmatter('---\ntitle: A\n---\n본문'), true);
});

test('hasFrontmatter: 첫 줄이 --- 가 아니면 false (메타 노트)', () => {
  assert.equal(hasFrontmatter('# 제목\n본문'), false);
  assert.equal(hasFrontmatter('본문만'), false);
});

test('hasFrontmatter: 여는 --- 만 있고 닫는 --- 가 없으면 false', () => {
  assert.equal(hasFrontmatter('---\ntitle: A\n본문(닫는 구분자 없음)'), false);
});

test('hasFrontmatter: CRLF(\\r\\n) 개행도 정상 처리', () => {
  assert.equal(hasFrontmatter('---\r\ntitle: A\r\n---\r\n본문'), true);
});

test('hasFrontmatter: 첫 줄 앞뒤 공백이 있어도 --- 인식', () => {
  assert.equal(hasFrontmatter('  ---  \ntitle: A\n  ---  \n본문'), true);
});

test('hasFrontmatter: 빈 문자열은 false', () => {
  assert.equal(hasFrontmatter(''), false);
});

// ── isMetaFile (PLAN.md 등 메타 파일 제외) ────────────────────────────────────

test('isMetaFile: 메타 파일명은 true', () => {
  assert.equal(isMetaFile('PLAN.md'), true);
  assert.equal(isMetaFile('THUMBNAIL_LOG.md'), true);
  assert.equal(isMetaFile('STUDY_LOG.md'), true);
});

test('isMetaFile: 경로가 붙어 있어도 basename으로 판별', () => {
  assert.equal(isMetaFile('/abs/posts/번들러/PLAN.md'), true);
  assert.equal(isMetaFile('posts/PLAN.md'), true);
});

test('isMetaFile: 일반 글 파일은 false', () => {
  assert.equal(isMetaFile('intro.md'), false);
  assert.equal(isMetaFile('/abs/posts/번들러/3편.md'), false);
  assert.equal(isMetaFile('plan.md'), false); // 대소문자 구분
});
