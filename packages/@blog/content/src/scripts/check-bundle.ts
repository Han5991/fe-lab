import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  BundleGuardsConfig,
  MarkerScope,
  PageSelector,
} from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';
import { collectPages } from './check-seo.ts';

/**
 * 빌드 산출물(`out/`)에서 **있어선 안 되는 곳에 실린 코드·값**을 검사합니다.
 * `check-seo`가 HTML의 SEO 계약을 보는 것과 같은 자리(빌드 마지막 단계)의
 * 번들 계약 게이트입니다.
 *
 * 이 파일은 **평가기다** — 무엇이 admin 코드이고 무엇이 서버 전용 값인지는
 * 모른다. 그 분류는 소비자의 어휘라 규칙 선언(`bundleGuards`)의 `label`로
 * 온다. 여기가 아는 어휘는 자기가 실제로 계산하는 것뿐이다: 페이지 HTML,
 * 페이지가 도달하는 청크, 산출물 파일(`MarkerScope`).
 *
 * 규칙마다 판정은 대칭 두 방향입니다:
 * - **음성**(`leak`): 마커가 `forbiddenIn`의 어느 스코프에든 있으면 실패.
 * - **양성**(`marker-dead`): 마커가 `requiredIn`의 모든 스코프에 있지 않으면
 *   실패 — 마커가 죽으면(코드 이름 변경, 번들러 출력 변화) 음성 검사만으로는
 *   "누수 없음"과 "검사 무력화"가 구분되지 않습니다. `isCliEntry`의 무음
 *   no-op 사고에서 배운 fail-closed와 같은 원리입니다.
 *
 * 도달 청크는 HTML의 script 참조에서 출발해 **폐포**로 구합니다 — 청크가 다른
 * 청크를 파일명 문자열로 여는 지연 로드가 실재해서(HTML만 보면 놓친다),
 * 포함된 청크 본문에 이름이 등장하는 청크를 반복해서 더합니다.
 *
 * 사용: `pnpm build`의 마지막 단계 — `blog-content check-bundle`
 */

export interface BundleViolation {
  /** 위반한 규칙의 이름 — 선언의 `label` */
  label: string;
  marker: string;
  rule: 'leak' | 'marker-dead';
  message: string;
}

/** 스코프 평가가 읽는 산출물 조각들 — main이 채우고, 평가 함수는 fs를 모른다. */
export interface ScopeInputs {
  /** URL 경로 → 페이지 HTML (check-seo의 collectPages 형태) */
  pages: ReadonlyMap<string, string>;
  /** 청크 basename → 본문 */
  sources: ReadonlyMap<string, string>;
  /** 산출물 상대 경로 → 본문 (없는 파일은 null) */
  artifacts: ReadonlyMap<string, string | null>;
}

/**
 * HTML이 직접 참조하는 청크 파일명(basename) 목록.
 *
 * script src·preload href 등 태그 종류를 가리지 않고 경로 패턴으로 뽑는다 —
 * 어떤 태그로 실렸든 브라우저가 로드하는 것은 같다.
 */
export function collectChunkRefs(html: string): string[] {
  const refs = new Set<string>();
  for (const m of html.matchAll(
    /\/_next\/static\/chunks\/([A-Za-z0-9._-]+\.js)/g,
  )) {
    // 패턴의 1번 캡처 그룹은 매치에 항상 참여한다.
    const name = m[1];
    if (name !== undefined) refs.add(name);
  }
  return [...refs];
}

/**
 * 시작 집합에서 도달 가능한 청크의 폐포.
 *
 * 간선은 "포함된 청크의 본문에 다른 청크의 stem(확장자 뺀 파일명)이 문자열로
 * 등장한다"이다. stem은 콘텐츠 해시라 우연한 부분 일치가 사실상 없고, 지연
 * 로드(dynamic import)가 정확히 이 형태로 파일명을 든다.
 */
export function chunkClosure(
  start: Iterable<string>,
  sources: ReadonlyMap<string, string>,
): Set<string> {
  const included = new Set<string>();
  const queue = [...start].filter(name => sources.has(name));
  while (queue.length > 0) {
    const name = queue.pop();
    if (name === undefined || included.has(name)) continue;
    included.add(name);
    const body = sources.get(name);
    if (body === undefined) continue;
    for (const [candidate] of sources) {
      if (included.has(candidate)) continue;
      const stem = candidate.replace(/\.js$/, '');
      if (body.includes(stem)) queue.push(candidate);
    }
  }
  return included;
}

/** 셀렉터로 페이지를 고른다 — 없으면 전부. */
export function selectPages(
  pages: ReadonlyMap<string, string>,
  selector?: PageSelector,
): Map<string, string> {
  if (!selector) return new Map(pages);
  let match: (path: string) => boolean;
  if ('under' in selector) {
    const prefix = selector.under;
    match = path => path.startsWith(prefix);
  } else {
    const prefix = selector.notUnder;
    match = path => !path.startsWith(prefix);
  }
  const selected = new Map<string, string>();
  for (const [path, html] of pages) {
    if (match(path)) selected.set(path, html);
  }
  return selected;
}

/** 위반 메시지용 스코프 서술. */
export function describeScope(scope: MarkerScope): string {
  const of = (selector?: PageSelector): string => {
    if (!selector) return '전체';
    return 'under' in selector
      ? `'${selector.under}' 아래 페이지의`
      : `'${selector.notUnder}' 밖 페이지의`;
  };
  switch (scope.kind) {
    case 'chunks':
      return `${of(scope.of)} 도달 청크`;
    case 'pages':
      return `${of(scope.of)} 페이지 HTML`;
    case 'artifact':
      return `산출물 ${scope.path}`;
  }
}

/** 스코프 안에서 마커가 발견된 위치 목록 — 비어 있으면 "없다". */
export function findMarkerIn(
  scope: MarkerScope,
  marker: string,
  inputs: ScopeInputs,
): string[] {
  switch (scope.kind) {
    case 'chunks': {
      const refs = new Set<string>();
      for (const [, html] of selectPages(inputs.pages, scope.of)) {
        for (const ref of collectChunkRefs(html)) refs.add(ref);
      }
      const locations: string[] = [];
      for (const name of chunkClosure(refs, inputs.sources)) {
        if (inputs.sources.get(name)?.includes(marker)) locations.push(name);
      }
      return locations.sort();
    }
    case 'pages': {
      const locations: string[] = [];
      for (const [path, html] of selectPages(inputs.pages, scope.of)) {
        if (html.includes(marker)) locations.push(path);
      }
      return locations.sort();
    }
    case 'artifact': {
      const body = inputs.artifacts.get(scope.path);
      return body != null && body.includes(marker) ? [scope.path] : [];
    }
  }
}

/** 규칙 전부를 평가한다 — 음성(forbiddenIn)과 양성(requiredIn)을 함께. */
export function checkRules(
  rules: BundleGuardsConfig,
  inputs: ScopeInputs,
): BundleViolation[] {
  const violations: BundleViolation[] = [];
  for (const rule of rules) {
    for (const scope of rule.forbiddenIn) {
      for (const location of findMarkerIn(scope, rule.marker, inputs)) {
        violations.push({
          label: rule.label,
          marker: rule.marker,
          rule: 'leak',
          message: `[${rule.label}] 마커 '${rule.marker}'가 ${describeScope(scope)} ${location}에 있습니다.`,
        });
      }
    }
    for (const scope of rule.requiredIn) {
      if (findMarkerIn(scope, rule.marker, inputs).length === 0) {
        violations.push({
          label: rule.label,
          marker: rule.marker,
          rule: 'marker-dead',
          message: `[${rule.label}] 마커 '${rule.marker}'가 ${describeScope(scope)}에 없습니다 — 값이 바뀌어 마커가 죽었으면 선언(bundleGuards)을 함께 갱신하세요.`,
        });
      }
    }
  }
  return violations;
}

/** `_next/static/chunks/` 아래의 모든 .js — basename → 본문. */
function readChunkSources(outDir: string): Map<string, string> {
  const chunksDir = join(outDir, '_next', 'static', 'chunks');
  const sources = new Map<string, string>();
  if (!existsSync(chunksDir)) return sources;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js'))
        sources.set(entry.name, readFileSync(full, 'utf8'));
    }
  };
  walk(chunksDir);
  return sources;
}

export function main(ctx: ContentContext, target?: string) {
  // 선언 자체가 없는 사이트는 검사 대상이 아니다. 규칙 0개짜리 선언은 타입이
  // 막으므로(BundleGuardsConfig — 비어 있을 수 없는 튜플) 여기 올 수 없다.
  const rules = ctx.content.config.bundleGuards;
  if (!rules) {
    console.log('✓ check-bundle: bundleGuards 미선언 — 검사 스킵');
    return;
  }

  const outDir = target
    ? resolve(process.cwd(), target)
    : ctx.content.paths.outDir;
  if (!existsSync(outDir)) {
    console.error(
      `✖ 빌드 산출물이 없습니다: ${outDir}\n  먼저 \`pnpm build\`를 실행하세요.`,
    );
    process.exit(1);
  }

  const pages = collectPages(outDir);
  const sources = readChunkSources(outDir);
  // 청크가 하나도 없으면 "누수 0건"이 아니라 검사를 못 한 것이다 — 양성
  // 검사(marker-dead)가 어차피 전 규칙에서 실패하지만, 원인을 바로 말해 준다.
  if (pages.size === 0 || sources.size === 0) {
    console.error(
      `✖ ${outDir} 에 페이지(${pages.size})나 청크(${sources.size})가 없습니다 — 빌드가 완전하지 않습니다.`,
    );
    process.exit(1);
  }

  // 규칙이 참조하는 산출물만 읽는다 — 없는 파일은 null로 넘겨 평가가
  // marker-dead로 보고한다(여기서 미리 실패시키면 위반 목록이 갈라진다).
  const artifacts = new Map<string, string | null>();
  for (const rule of rules) {
    for (const scope of [...rule.forbiddenIn, ...rule.requiredIn]) {
      if (scope.kind !== 'artifact' || artifacts.has(scope.path)) continue;
      const anchorPath = join(outDir, scope.path);
      artifacts.set(
        scope.path,
        existsSync(anchorPath) ? readFileSync(anchorPath, 'utf8') : null,
      );
    }
  }

  const violations = checkRules(rules, { pages, sources, artifacts });
  if (violations.length === 0) {
    console.log(`✓ 번들 규칙 ${rules.length}개 통과 (청크 ${sources.size}개)`);
    return;
  }

  console.error(`\n번들 누수 검사 실패: 위반 ${violations.length}건\n`);
  for (const v of violations) {
    console.error(`✖ [${v.rule}] ${v.message}`);
  }
  process.exit(1);
}
