/**
 * validate-posts 계층 공용의 **형태와 위치 계산**만 둡니다.
 *
 * - 규칙의 목록·심각도·범위는 `rules.ts`(평면 테이블)
 * - 실행 체크는 `frontmatter.ts` / `body.ts` / `corpus.ts` (판정 사슬)
 * - CLI 진입점과 재수출은 `../validate-posts.ts`
 */

export type Severity = 'error' | 'warning';

export interface Issue {
  file: string;
  line: number | null;
  severity: Severity;
  rule: string;
  message: string;
}

export interface PostRecord {
  absPath: string;
  relPath: string;
  data: Record<string, unknown>;
  content: string;
}

export interface ValidateOptions {
  /**
   * SEO 계약 위반을 에러로 취급할지. **prebuild에서만** 켭니다.
   *
   * `check-seo`(빌드 산출물 검사)는 발행되는 페이지를 보고, 위반하면 배포를
   * 막습니다. 그 원인이 되는 원문 문제가 항상 경고에 그치면 `draft`를
   * `published`로 바꾸는 순간 로컬 검사와 빌드는 통과하고 **CI에서만** 터집니다.
   * 그래서 빌드 직전에는 같은 조건을 에러로 올려, 15초짜리 빌드를 돌리기 전에
   * 파일·줄 번호와 함께 먼저 잡습니다.
   *
   * 반대로 `predev:web`(dev 서버)와 `pnpm lint:posts`에서는 켜지 않습니다 — 글을
   * 쓰는 중에 `status: published`로 두는 건 흔한데, 요약을 아직 안 적었다고
   * dev 서버가 안 뜨면 도구가 방해물이 됩니다.
   */
  strict?: boolean;
}

/** frontmatter 블록 안에서 `key:` 줄의 1-based 줄 번호. 없으면 null. */
export function findFrontmatterLine(raw: string, key: string): number | null {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  for (const [i, line] of lines.entries()) {
    if (i === 0) continue;
    if (line.trim() === '---') return null;
    const m = line.match(/^(\w+)\s*:/);
    if (m && m[1] === key) return i + 1;
  }
  return null;
}

/** frontmatter가 차지한 줄 수(본문 줄 번호 → 파일 줄 번호 변환용). */
export function frontmatterOffset(raw: string): number {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return 0;
  for (const [i, line] of lines.entries()) {
    if (i !== 0 && line.trim() === '---') return i + 1;
  }
  return 0;
}
