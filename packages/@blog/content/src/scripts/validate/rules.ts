/**
 * 검증 규칙 **평면 테이블** — 규칙 id 전체(29개)와 각각의 심각도·범위.
 *
 * 예전에는 이 정보가 1000줄짜리 validate-posts.ts의 실행 코드 안에 흩어져 있어,
 * "규칙이 몇 개인지", "--strict가 무엇을 승격하는지", "어떤 규칙이 전체 집합을
 * 봐야 하는지"를 알려면 파일을 통독해야 했습니다. 여기서는 그 세 질문이 표의
 * 열 하나씩으로 답해집니다.
 *
 * 이 테이블은 문서가 아니라 **실행 경로**입니다 — 모든 판정 사슬이 심각도를
 * `resolveSeverity`를 통해 여기서 읽습니다. 규칙을 추가하면 여기 한 줄이 없을 때
 * 컴파일(RuleId)이 막고, `rules.test.ts`가 개수·센티널 집합을 잠급니다.
 */
import {
  isPostFile,
  isPostStatus,
  isPostVisible,
  toDateString,
} from '../../post/index.ts';
import type { Severity, ValidateContext } from './shared.ts';

/**
 * `--strict` 승격 센티널.
 *
 * 이 값을 가진 규칙은 평소에는 경고, **prebuild(--strict)에서 발행 대상이면
 * 에러**로 승격됩니다. 어떤 규칙이 승격 대상인지는 아래 표에서 severity 열이
 * 이 센티널인 행만 세면 됩니다 — 정확히 6개(missing-excerpt · excerpt-length ·
 * long-title · missing-image-alt · truncated-excerpt · duplicate-description)이고,
 * 루트 CLAUDE.md의 prebuild 설명과 `rules.test.ts`가 이 집합을 잠급니다.
 */
export const SEO_PUBLISH = 'seo-publish' as const;

export type DeclaredSeverity = Severity | typeof SEO_PUBLISH;

/**
 * 규칙이 무엇을 보고 판정하는가.
 *
 * - `always`        — frontmatter가 있는 모든 파일. 메타 노트도 봅니다
 *                     (`meta-file-skipped`는 그 조기 반환 자체를 알리는 규칙)
 * - `postLike`      — 메타 노트 조기 반환을 지난 파일(유효한 `status`가 있거나,
 *                     `status`/`published` 키라도 있는 파일). 오타 하나 고칠
 *                     때마다 새 에러가 튀어나오지 않도록, status가 깨져 있어도
 *                     나머지를 한 번에 전부 검사합니다
 * - `post`          — 빌드 대상 포스트(`isPostFile`)만. 렌더될 일 없는 메타
 *                     노트까지 잡으면 고칠 수 없는 경고만 쌓이는 규칙들
 * - `corpus`        — 파일 하나가 아니라 **전체 집합**을 봐야 판정 가능
 * - `corpusVisible` — 전체 집합 중 **지금 빌드에 실리는 글**만 비교. 공개 전
 *                     예약 글을 섞으면 산출물에 존재하지도 않는 충돌로 빌드가
 *                     막힙니다
 */
export type RuleScope =
  'always' | 'postLike' | 'post' | 'corpus' | 'corpusVisible';

export interface RuleSpec {
  severity: DeclaredSeverity;
  scope: RuleScope;
}

// prettier-ignore 없이도 표로 읽히도록 한 줄 = 한 규칙을 유지합니다.
export const RULES = {
  // ── frontmatter 판정 사슬 (frontmatter.ts) ────────────────────────────────
  'legacy-published-field': { severity: 'error', scope: 'always' },
  'invalid-status': { severity: 'error', scope: 'always' },
  'meta-file-skipped': { severity: 'warning', scope: 'always' },
  'unknown-frontmatter-key': { severity: 'warning', scope: 'postLike' },
  'non-string-field': { severity: 'error', scope: 'postLike' },
  'missing-title': { severity: 'error', scope: 'postLike' },
  'long-title': { severity: SEO_PUBLISH, scope: 'postLike' },
  'missing-excerpt': { severity: SEO_PUBLISH, scope: 'postLike' },
  'truncated-excerpt': { severity: SEO_PUBLISH, scope: 'postLike' },
  'excerpt-length': { severity: SEO_PUBLISH, scope: 'postLike' },
  'missing-date': { severity: 'error', scope: 'postLike' },
  'invalid-date': { severity: 'error', scope: 'postLike' },
  'ambiguous-date': { severity: 'error', scope: 'postLike' },
  'invalid-updated-at': { severity: 'error', scope: 'postLike' },
  'ambiguous-updated-at': { severity: 'error', scope: 'postLike' },
  'unquoted-scheduled-date': { severity: 'error', scope: 'postLike' },
  'invalid-scheduled-date': { severity: 'error', scope: 'postLike' },
  'ambiguous-scheduled-date': { severity: 'error', scope: 'postLike' },
  'invalid-tags': { severity: 'error', scope: 'postLike' },
  'duplicate-tags': { severity: 'warning', scope: 'postLike' },
  'unknown-hero-diagram': { severity: 'error', scope: 'postLike' },
  'missing-thumbnail': { severity: 'error', scope: 'postLike' },
  // ── 본문 판정 사슬 (body.ts) ──────────────────────────────────────────────
  'missing-image': { severity: 'error', scope: 'always' },
  'missing-image-alt': { severity: SEO_PUBLISH, scope: 'post' },
  'unclosed-fence': { severity: 'warning', scope: 'always' },
  'unregistered-code-language': { severity: 'warning', scope: 'always' },
  'body-h1': { severity: 'warning', scope: 'post' },
  // ── 코퍼스 판정 사슬 (corpus.ts) ──────────────────────────────────────────
  'duplicate-slug': { severity: 'error', scope: 'corpus' },
  'duplicate-description': { severity: SEO_PUBLISH, scope: 'corpusVisible' },
} as const satisfies Record<string, RuleSpec>;

export type RuleId = keyof typeof RULES;

/**
 * SEO 계약 위반(센티널 `SEO_PUBLISH`)의 심각도 승격 규칙.
 *
 * **규칙: strict 에러의 범위는 `check-seo`가 보는 범위와 정확히 같다.**
 * 즉 지금 빌드 산출물에 실리는 글(`isPostVisible`)만 에러다.
 *
 * strict 모드의 목적은 "로컬은 통과, CI만 실패"를 없애는 것이다. 그러니 로컬이
 * CI보다 **더** 엄격해도 안 된다 — 그건 다른 종류의 실패다. 아직 공개 전인 예약
 * 글까지 에러로 잡으면, 그 글과 아무 상관 없는 이미 발행된 변경까지 배포가
 * 통째로 막힌다(그 글은 `out/`에 들어가지도 않아 check-seo는 볼 수조차 없다).
 * `pnpm new-post --scheduled …`가 깔아주는 빈 excerpt 때문에 스캐폴딩 직후
 * 빌드가 실패하는 것도 같은 원인이다.
 *
 * 예약 글이 공개일에 문제를 드러내면 그때 cron 빌드가 실패한다. 그건 워크플로
 * 실패 알림으로 드러나고, 무엇보다 **문제가 실제로 들어 있는 빌드**만 막는다.
 * 그 전까지는 경고로 계속 보이므로 눈에 안 띄는 것도 아니다.
 *
 * `draft`는 영영 나갈 일이 없으므로 당연히 경고다.
 *
 * 본문 h1(`body-h1`)은 여기 해당하지 않는다 — 렌더 계층이 h2로 강등해
 * check-seo의 h1 검사를 통과하므로 원문이 그대로여도 배포가 막히지 않는다.
 */
export function resolveSeverity(
  rule: RuleId,
  data: Record<string, unknown>,
  options?: ValidateContext,
): Severity {
  const declared = RULES[rule].severity;
  // 고정 severity 규칙은 설정을 보지 않는다 — 호출부도 options를 생략한다.
  if (declared !== SEO_PUBLISH) return declared;
  if (!options?.strict || !isPostFile(data)) return 'warning';
  return isVisibleFrontmatter(data, options.timezone) ? 'error' : 'warning';
}

/**
 * frontmatter 원문으로 "지금 공개되는 글인가"를 판정합니다.
 *
 * `isPostVisible`은 날짜가 **문자열**일 때만 공개 시각으로 인정합니다(도메인은
 * 정규화된 PostData를 받는 전제). 그런데 여기서 보는 건 gray-matter 원문이라,
 * 따옴표 없이 쓴 `date: 2026-08-10`은 YAML이 **Date 객체**로 파싱합니다 —
 * `new-post`가 정확히 그렇게 씁니다. 그대로 넘기면 이미 공개된 예약 글이
 * "비공개"로 판정되어 strict 에러가 조용히 경고로 떨어집니다.
 * repository가 PostData를 만들 때 쓰는 `toDateString`을 똑같이 거칩니다.
 *
 * status도 같은 이유로 한 번 걸러 넘깁니다. 원문의 status는 무엇이든 될 수 있고
 * (`status: 3`), enum 밖 값은 `isPostVisible`이 어차피 fail-closed로 비공개
 * 판정하므로 미지정으로 넘기는 것과 결론이 같습니다. 예전에는 이 객체 전체에
 * `as Parameters<typeof isPostVisible>[0]`가 붙어 있었는데, 그 단언은 값을 하나도
 * 확인하지 않으면서 **인자 계약이 늘어나도 조용히 통과**합니다(부분 객체를
 * 상위 타입으로 단언하는 방향이라 컴파일러가 막지 않습니다).
 */
export function isVisibleFrontmatter(
  data: Record<string, unknown>,
  timezone: ValidateContext['timezone'],
): boolean {
  const status = data['status'];
  return isPostVisible(
    {
      status: isPostStatus(status) ? status : undefined,
      date: toDateString(data['date']),
      scheduledDate: toDateString(data['scheduledDate']),
    },
    timezone,
  );
}
