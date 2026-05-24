/**
 * 마크다운 포스트 파일 수집 공통 헬퍼.
 *
 * repository.ts 와 validate-posts.ts 에서 동일한 로직이 중복 구현되어 있었습니다.
 * - 두 곳 모두 `.md` / `.mdx` 를 재귀 수집
 * - 메타 파일(PLAN.md 등) 제외 규칙이 별개로 관리되어 표류 가능
 *
 * 이 모듈로 통합하여 동작 불일치를 방지합니다.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** repository.ts 와 validate-posts.ts 모두가 스킵하는 메타 파일 이름 목록 */
const META_FILENAMES = new Set(['PLAN.md', 'THUMBNAIL_LOG.md', 'STUDY_LOG.md']);

/**
 * 파일 이름만으로 빌드 대상에서 제외할 메타 파일인지 판단합니다.
 *
 * @param absPath 절대 경로 또는 파일 이름
 */
export function isMetaFile(absPath: string): boolean {
  const name = absPath.split('/').pop() ?? '';
  return META_FILENAMES.has(name);
}

/**
 * 디렉토리를 재귀 순회하여 `.md` / `.mdx` 파일의 절대 경로를 모두 반환합니다.
 *
 * 메타 파일(META_FILENAMES)은 자동으로 제외됩니다.
 *
 * @param dir   탐색 시작 디렉토리
 * @param acc   내부 재귀용 누적 배열 (외부에서 넘기지 않아도 됨)
 */
export function collectMarkdownFiles(
  dir: string,
  acc: string[] = [],
): string[] {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectMarkdownFiles(full, acc);
      continue;
    }
    if (item.endsWith('.md') || item.endsWith('.mdx')) {
      if (!isMetaFile(full)) {
        acc.push(full);
      }
    }
  }
  return acc;
}

/**
 * frontmatter delimiter(`---`)로 시작하고 닫히는 구간이 있는지 확인합니다.
 * delimiter 가 없으면 메타 노트로 간주합니다.
 */
export function hasFrontmatter(raw: string): boolean {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return true;
  }
  return false;
}
