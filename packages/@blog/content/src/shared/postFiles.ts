/**
 * 마크다운 포스트 파일 수집 공통 헬퍼.
 *
 * repository.ts 와 validate-posts.ts 에서 동일한 로직이 중복 구현되어 있었습니다.
 * - 두 곳 모두 `.md` / `.mdx` 를 재귀 수집
 * - 메타 파일 제외 규칙이 별개로 관리되어 표류 가능
 *
 * 이 모듈로 통합하여 동작 불일치를 방지합니다.
 *
 * 어떤 파일명이 메타 파일(작업 노트)인지는 **이 패키지가 정하지 않는다** —
 * 그 사이트 글쓰기 워크플로의 어휘라 설정(`registries.metaFilenames`)이 주고,
 * 여기는 받은 집합으로 판정만 한다(check-bundle의 BUNDLE_GUARDS와 같은 분리).
 */

import { readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

/** `dir` 아래 모든 파일의 `/` 구분 상대 경로(깊이 우선) — 원고·미디어·out/의 순회는 전부 이것이다. */
export function listFilesRecursive(dir: string): string[] {
  const files: string[] = [];
  const walk = (rel: string) => {
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      const isDirectory =
        entry.isDirectory() ||
        (entry.isSymbolicLink() && statSync(join(dir, child)).isDirectory());
      if (isDirectory) walk(child);
      else files.push(child);
    }
  };
  walk('');
  return files;
}

/**
 * 파일 이름만으로 빌드 대상에서 제외할 메타 파일인지 판단합니다.
 *
 * @param absPath 절대 경로 또는 파일 이름
 * @param metaFilenames 이름으로 제외할 파일 집합 — `registries.metaFilenames`
 */
export function isMetaFile(
  absPath: string,
  metaFilenames: ReadonlySet<string>,
): boolean {
  // host OS 기준 path.basename으로 파일명만 추출(빌드는 POSIX에서 실행).
  // (이전 'absPath.split("/")' 보다 견고하나, POSIX에서는 백슬래시 경로를 분리하지 않음)
  return metaFilenames.has(basename(absPath));
}

/**
 * 디렉토리를 재귀 순회하여 `.md` / `.mdx` 파일의 절대 경로를 모두 반환합니다.
 *
 * 메타 파일(`metaFilenames`에 이름이 있는 파일)은 자동으로 제외됩니다.
 */
export function collectMarkdownFiles(
  dir: string,
  metaFilenames: ReadonlySet<string>,
): string[] {
  return listFilesRecursive(dir)
    .filter(
      rel =>
        (rel.endsWith('.md') || rel.endsWith('.mdx')) &&
        !isMetaFile(rel, metaFilenames),
    )
    .map(rel => join(dir, rel));
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
