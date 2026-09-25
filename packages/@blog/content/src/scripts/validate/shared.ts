/**
 * validate-posts 계층 공용의 **형태와 위치 계산**만 둡니다.
 *
 * - 규칙의 목록·심각도·범위는 `rules.ts`(평면 테이블)
 * - 실행 체크는 `frontmatter.ts` / `body.ts` / `corpus.ts` (판정 사슬)
 * - CLI 진입점과 재수출은 `../validate-posts.ts`
 */

import type {
  ContentConfig,
  SeoConfig,
  TimezoneConfig,
} from '../../shared/contentConfig.ts';
import { toOptionalString } from '../../post/frontmatterSchema.ts';

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

/**
 * 규칙 함수들이 받는 것 — 실행 옵션 + **설정에서 온 슬라이스**.
 *
 * 예전에는 SEO 예산·다이어그램 이름·타임존을 규칙 파일이 모듈 스코프 상수로
 * 직접 읽어서, `defineContent`로 덮어도 이 게이트만 옛 값을 보고 있었다.
 * `main`이 컨텍스트의 설정으로 채워 넘긴다.
 */
export interface ValidateContext extends ValidateOptions {
  seo: SeoConfig;
  timezone: Pick<TimezoneConfig, 'isoOffset'>;
  /** `hero`가 가리킬 수 있는 이름 — 설정의 registries.diagramNames */
  diagramNames: readonly string[];
}

/** CLI가 주는 실행 옵션. 설정 슬라이스는 `ValidateContext`가 얹는다. */
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
  /**
   * "지금 공개되는 글"을 판정할 기준 시각. 진입점이 실행의 기준 시각
   * (`ContentContext.now`)을 넘긴다 — 없으면 판정 시점의 현재 시각.
   */
  now?: Date;
}

/**
 * 해석된 설정 + 실행 옵션 → 규칙이 받는 컨텍스트.
 *
 * 진입점(validate-posts main)과 테스트가 **같은 변환**을 쓴다 — 테스트가 손으로
 * 조립하면 게이트가 실제로 보는 슬라이스와 갈라진다.
 */
export function toValidateContext(
  config: Pick<ContentConfig, 'seo' | 'timezone' | 'registries'>,
  options: ValidateOptions = {},
): ValidateContext {
  return {
    ...options,
    seo: config.seo,
    timezone: config.timezone,
    diagramNames: config.registries.diagramNames,
  };
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

/**
 * frontmatter `key:` 줄의 **원문 값**(따옴표 포함, 줄 끝 주석 제외). 없으면 null.
 *
 * YAML은 따옴표 없는 `2026-06-01`과 `2026-06-01T08:00:00+09:00`을 똑같이 Date
 * 객체로 준다 — 파싱 결과만으로는 저자가 날짜를 적었는지 시각을 적었는지 알 수
 * 없어서, 원문을 다시 본다.
 */
export function frontmatterScalar(raw: string, key: string): string | null {
  const line = findFrontmatterLine(raw, key);
  if (line === null) return null;
  const text = raw.split('\n')[line - 1] ?? '';
  return text
    .slice(text.indexOf(':') + 1)
    .replace(/\s+#.*$/, '')
    .trim();
}

/** 'YYYY-MM-DD'이고 **실제 달력에 있는** 날짜인가(`2026-02-30` 거부). */
export function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Date.UTC는 범위 밖 값을 다음 달로 넘긴다 — 되돌렸을 때 같아야 실제 날짜다.
  return date.toISOString().slice(0, 10) === value;
}

/**
 * offset(`Z`·`±HH:MM`)을 **명시한** ISO 8601 datetime인가
 * (`2026-06-01T09:00:00+09:00`). 공백 구분(`2026-06-01 09:00+09:00`)·offset 없는
 * 시각은 거부한다 — V8의 관대한 `Date.parse`는 받아 주지만 JSON-LD와 런타임
 * 파서마다 해석이 갈린다.
 */
export function isOffsetDateTime(value: string): boolean {
  const m =
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)$/i.exec(
      value,
    );
  return m !== null && isCalendarDate(m[1] ?? '');
}

/**
 * `/`로 나눈 세그먼트 중 비었거나 `.`·`..`인 것이 있는가.
 *
 * 그런 slug는 URL과 파일 경로를 조용히 바꾼다 — `/foo`는 `/posts//foo/`,
 * `foo/`는 `/posts/foo//`, `../admin`은 브라우저가 `/admin/`으로 푼다. og 카드
 * 생성기(`ogFileRelPath`)와 검증(`slugProblem`)이 같은 판정을 쓴다.
 */
export function hasUnsafeSlugSegment(slug: string): boolean {
  return slug.split('/').some(s => s === '' || s === '.' || s === '..');
}

/**
 * 명시 `slug`의 모양 문제를 사람이 읽을 문장으로. 문제가 없으면 null.
 *
 * 파일 경로에서 유도한 slug(`회고/2025/2025 KPT`)는 여기 대상이 아니다 — 공백이
 * 흔하고 URL에서 인코딩돼 동작한다. **손으로 적은** slug에 공백·제어 문자가
 * 있으면 거의 언제나 실수다.
 */
export function slugProblem(slug: string): string | null {
  // eslint no-control-regex를 피하려고 제어 문자는 코드포인트로 본다.
  const hasControl = [...slug].some(ch => {
    const code = ch.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f;
  });
  if (hasControl || /\s/.test(slug)) return '공백이나 제어 문자가 있습니다';
  if (slug.includes('\\')) return '`\\`는 경로 구분자로 해석될 수 있습니다';
  if (hasUnsafeSlugSegment(slug)) {
    return '앞뒤의 `/`·`//`·`.`·`..` 세그먼트는 URL을 바꿉니다(`/posts//foo/`, `../admin` → `/admin/`)';
  }
  return null;
}

/**
 * 상대 `thumbnail`이 글 폴더의 **파일 이름 하나**인가(`cover.png`).
 *
 * 경로가 섞이면(`./a.png`·`img/a.png`·`../a.png`) 세 곳이 서로 다른 답을 낸다:
 * 화면의 최적화본 URL은 이름을 통째로 인코딩해 `/thumbs/.%2Fa.webp`가 되고,
 * 생성기는 `join`이 정규화한 `thumbs/a.webp`에 쓰고(다음 빌드에 orphan으로 지우고
 * 다시 인코딩), `../`는 `thumbs/` **밖**에 파일을 쓴다. 파일 이름만 받으면 셋이
 * 한 경로가 된다.
 */
export function isBareThumbnailName(thumbnail: string): boolean {
  return (
    thumbnail !== '' &&
    thumbnail !== '.' &&
    thumbnail !== '..' &&
    !/[/\\]/.test(thumbnail)
  );
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

/**
 * 이 파일이 빌드에서 갖게 될 slug — **로더(`parsePost`)와 같은 규칙**이다.
 *
 * 명시 `slug`가 문자열이고 비어 있지 않으며 URL을 벗어나지 않으면 그것, 아니면
 * 파일 경로에서 확장자를 뗀 값이다. 빈 문자열(`slug: ''`)은 로더처럼 "없음"이고
 * (같은 `toOptionalString`), 앞뒤 `/`·빈 세그먼트·`..`가 든 slug도 로더가 버리고
 * 경로 slug를 쓴다(`hasUnsafeSlugSegment` — 그 slug 자체는 invalid-slug 에러다).
 * 중복 slug·og 카드 경로 검사가 로더와 다른 slug로 판정하면, 실제로 충돌하는 두
 * 글을 놓치거나 없는 충돌로 빌드를 막는다.
 */
export function effectiveSlug(
  record: Pick<PostRecord, 'data' | 'relPath'>,
): string {
  const explicit = toOptionalString(record.data['slug']);
  if (explicit !== undefined && !hasUnsafeSlugSegment(explicit)) {
    return explicit;
  }
  return record.relPath
    .split(/[/\\]/)
    .join('/')
    .replace(/\.(md|mdx)$/, '');
}
