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
import { basename, join } from 'node:path';

/** repository.ts 와 validate-posts.ts 모두가 스킵하는 메타 파일 이름 목록 */
const META_FILENAMES = new Set(['PLAN.md', 'THUMBNAIL_LOG.md', 'STUDY_LOG.md']);

/**
 * 파일 이름만으로 빌드 대상에서 제외할 메타 파일인지 판단합니다.
 *
 * @param absPath 절대 경로 또는 파일 이름
 */
export function isMetaFile(absPath: string): boolean {
  // host OS 기준 path.basename으로 파일명만 추출(빌드는 POSIX에서 실행).
  // (이전 'absPath.split("/")' 보다 견고하나, POSIX에서는 백슬래시 경로를 분리하지 않음)
  return META_FILENAMES.has(basename(absPath));
}

/**
 * 디렉토리를 재귀 순회하여 `.md` / `.mdx` 파일의 절대 경로를 모두 반환합니다.
 *
 * 메타 파일(META_FILENAMES)은 자동으로 제외됩니다.
 *
 * 내부 누적 배열은 외부 노출하지 않고 private helper로 격리합니다.
 * (이전 시그니처는 acc를 public API에 두어 호출자가 실수로 외부 배열을 넘기면
 * 의도치 않게 오염되는 위험이 있었음)
 */
export function collectMarkdownFiles(dir: string): string[] {
  const acc: string[] = [];
  walk(dir, acc);
  return acc;
}

function walk(dir: string, acc: string[]): void {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (item.endsWith('.md') || item.endsWith('.mdx')) {
      if (!isMetaFile(full)) {
        acc.push(full);
      }
    }
  }
}

/**
 * frontmatter delimiter(`---`)로 시작하고 닫히는 구간이 있는지 확인합니다.
 * delimiter 가 없으면 메타 노트로 간주합니다.
 */
export function hasFrontmatter(raw: string): boolean {
  // CRLF(\r\n) / LF(\n) 모두 안전하게 분할.
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return false;
  for (const line of lines.slice(1)) {
    if (line.trim() === '---') return true;
  }
  return false;
}
