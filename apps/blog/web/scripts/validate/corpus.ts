/**
 * 코퍼스 **판정 사슬** — 파일 하나가 아니라 **전체 집합**을 봐야 판정할 수 있는
 * 규칙들(rules.ts에서 scope가 `corpus`/`corpusVisible`인 행).
 *
 * 파일 단위 사슬과 실행 시점이 다릅니다: 진입점(validate-posts.ts)이 모든 파일을
 * 훑은 **뒤에** 한 번 돕니다.
 */
import { isPostFile, resolveExcerpt } from '@/domain/post';
import type { Issue, PostRecord, ValidateOptions } from './shared';
import { resolveSeverity, isVisibleFrontmatter } from './rules';

// 명시 slug가 없으면 파일경로(확장자 제거)를 기본 slug로 사용 — repository.ts의 rawSlug 규칙과 동일
function deriveDefaultSlug(relPath: string): string {
  return relPath.replace(/\.(md|mdx)$/, '');
}

/**
 * 발행될 글들의 meta description이 서로 완전히 겹치는지 검사합니다.
 *
 * `check-seo`가 빌드 산출물에서 잡는 duplicate-description과 **같은 조건**을 원문에서
 * 먼저 봅니다. 여기 규칙이 없으면 로컬 검사와 빌드는 통과하고 CI만 실패합니다 —
 * strict 모드를 넣은 이유가 바로 그 간극을 없애는 것이었습니다.
 *
 * 비교 대상은 `excerpt`가 아니라 **실제로 나갈 description**입니다. excerpt를 비워 둔
 * 글들은 본문 앞부분 자동 발췌로 폴백하는데, 도입부가 비슷한 시리즈 글끼리는 그 발췌가
 * 글자 단위로 겹칩니다(실제로 본편/DI편 두 쌍이 그랬습니다). 폴백 계산은 도메인의
 * resolveExcerpt 하나를 씁니다.
 *
 * 비교 대상은 **지금 빌드에 실리는 글**뿐입니다(SEO_PUBLISH 승격과 같은 기준 —
 * scope가 `corpusVisible`인 이유). 아직 공개 전인 예약 글을 섞으면, 산출물에는
 * 존재하지도 않는 충돌 때문에 이미 발행된 글이 빌드를 막습니다.
 */
export function detectDuplicateDescriptions(
  records: PostRecord[],
  options: ValidateOptions = {},
): Issue[] {
  const byDescription = new Map<string, PostRecord[]>();
  for (const record of records) {
    if (!isPostFile(record.data) || !isVisibleFrontmatter(record.data))
      continue;
    const description = resolveExcerpt(record.content, record.data.excerpt);
    const arr = byDescription.get(description) ?? [];
    arr.push(record);
    byDescription.set(description, arr);
  }

  const issues: Issue[] = [];
  for (const [description, group] of byDescription) {
    if (group.length < 2) continue;
    for (const record of group) {
      issues.push({
        file: record.relPath,
        line: null,
        severity: resolveSeverity(
          'duplicate-description',
          record.data,
          options,
        ),
        rule: 'duplicate-description',
        message: `meta description이 다른 글과 완전히 같습니다 — 중복 콘텐츠 신호가 되어 한쪽이 색인에서 밀립니다. 고유한 \`excerpt\`를 적어주세요 (겹치는 글: ${group
          .filter(other => other !== record)
          .map(other => other.relPath)
          .join(', ')}): "${description.slice(0, 40)}…"`,
      });
    }
  }
  return issues;
}

export function detectDuplicateSlugs(records: PostRecord[]): Issue[] {
  const slugMap = new Map<string, string[]>();
  for (const r of records) {
    const explicit = typeof r.data.slug === 'string' ? r.data.slug : null;
    const effective = explicit ?? deriveDefaultSlug(r.relPath);
    const arr = slugMap.get(effective) ?? [];
    arr.push(r.relPath);
    slugMap.set(effective, arr);
  }

  const issues: Issue[] = [];
  for (const [slug, files] of slugMap.entries()) {
    if (files.length < 2) continue;
    for (const file of files) {
      issues.push({
        file,
        line: null,
        severity: resolveSeverity('duplicate-slug', {}, {}),
        rule: 'duplicate-slug',
        message: `slug \`${slug}\`이(가) 다른 글과 충돌합니다 (명시 slug ↔ 파일명 기반 slug 포함 검사): ${files.filter(f => f !== file).join(', ')}`,
      });
    }
  }
  return issues;
}
