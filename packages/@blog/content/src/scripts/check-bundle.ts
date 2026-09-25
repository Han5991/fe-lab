import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { decodeUrlSafe } from '../shared/url.ts';
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
  /** 청크의 `_next/static/chunks/` 기준 상대 경로(`/` 구분) → 본문 */
  sources: ReadonlyMap<string, string>;
  /** 산출물 상대 경로 → 본문 (없는 파일은 null) */
  artifacts: ReadonlyMap<string, string | null>;
}

/**
 * `_next/static/chunks/` 아래 청크 경로. 하위 폴더(webpack의 `app/…/page-*.js`)도
 * 잡는다 — 예전 패턴은 `/`를 받지 않아 중첩 청크 참조를 **조용히** 버렸고,
 * 그러면 그 청크의 누수는 음성 검사에 영영 안 걸렸다. `[…slug]` 같은 폴더는
 * HTML에 퍼센트 인코딩돼 나오므로 디코드해 디스크 이름과 맞춘다.
 */
const CHUNK_REF =
  /\/_next\/static\/chunks\/((?:[\w.~%@+\-[\]]+\/)*[\w.~%@+\-[\]]+\.js)/g;

/**
 * HTML이 직접 참조하는 청크 경로 목록(`chunks/` 기준).
 *
 * script src·preload href 등 태그 종류를 가리지 않고 경로 패턴으로 뽑는다 —
 * 어떤 태그로 실렸든 브라우저가 로드하는 것은 같다.
 */
export function collectChunkRefs(html: string): string[] {
  const refs = new Set<string>();
  for (const m of html.matchAll(CHUNK_REF)) {
    // 패턴의 1번 캡처 그룹은 매치에 항상 참여한다.
    const path = m[1];
    if (path !== undefined) refs.add(decodeUrlSafe(path));
  }
  return [...refs];
}

/** 청크 경로의 stem — 마지막 세그먼트에서 `.js`를 뗀 것(해시가 든 파일명). */
function chunkStem(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.js$/, '');
}

/** 청크 → 그 본문이 여는 청크들. 청크마다 처음 물을 때 한 번만 계산한다. */
type ChunkEdges = (name: string) => readonly string[];

/**
 * 청크 참조 그래프. 간선은 "청크 본문에 다른 청크의 stem(확장자 뺀 파일명)이
 * 문자열로 등장한다"이다. stem은 콘텐츠 해시라 우연한 부분 일치가 사실상 없고,
 * 지연 로드(dynamic import)가 정확히 이 형태로 파일명을 든다.
 */
function createChunkEdges(sources: ReadonlyMap<string, string>): ChunkEdges {
  // stem → 그 stem의 청크들(하위 폴더끼리 파일 이름이 같을 수 있다).
  const owners = new Map<string, string[]>();
  for (const name of sources.keys()) {
    const stem = chunkStem(name);
    owners.set(stem, [...(owners.get(stem) ?? []), name]);
  }
  // 길이가 같은 서로 다른 stem은 한 위치에서 둘이 맞을 수 없다 — 전방 탐색 교대
  // (`(?=(a|b|…))`) 한 번의 훑기가 stem마다 `includes`를 부른 것과 같은 답을 낸다.
  const byLength = new Map<number, string[]>();
  for (const stem of owners.keys()) {
    if (stem !== '')
      byLength.set(stem.length, [...(byLength.get(stem.length) ?? []), stem]);
  }
  const patterns = [...byLength.values()].map(
    group =>
      new RegExp(
        `(?=(${group.map(stem => stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`,
        'g',
      ),
  );
  const edges = new Map<string, string[]>();
  return name => {
    let targets = edges.get(name);
    if (targets === undefined) {
      const body = sources.get(name) ?? '';
      // 빈 stem(`.js`)은 어느 본문에나 "등장한다"(`includes('')`).
      const found = new Set(owners.get('') ?? []);
      for (const pattern of patterns) {
        for (const match of body.matchAll(pattern)) {
          for (const owner of owners.get(match[1] ?? '') ?? [])
            found.add(owner);
        }
      }
      found.delete(name);
      targets = [...found];
      edges.set(name, targets);
    }
    return targets;
  };
}

function closureOver(
  start: Iterable<string>,
  sources: ReadonlyMap<string, string>,
  edgesOf: ChunkEdges,
): Set<string> {
  const included = new Set<string>();
  const queue = [...start].filter(name => sources.has(name));
  for (let name = queue.pop(); name !== undefined; name = queue.pop()) {
    if (included.has(name)) continue;
    included.add(name);
    for (const next of edgesOf(name)) {
      if (!included.has(next)) queue.push(next);
    }
  }
  return included;
}

/** 시작 집합에서 도달 가능한 청크의 폐포. */
export function chunkClosure(
  start: Iterable<string>,
  sources: ReadonlyMap<string, string>,
): Set<string> {
  return closureOver(start, sources, createChunkEdges(sources));
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

/**
 * 한 입력(`ScopeInputs`)을 여러 스코프로 평가할 때 재사용하는 계산 — 청크 그래프,
 * 페이지별 청크 참조, 셀렉터별 폐포. 규칙 9개가 청크 스코프 16개를 쓰지만 서로
 * 다른 셀렉터는 5개뿐이고, 셀렉터끼리도 청크 대부분을 공유한다.
 */
export interface ScopeCache {
  edgesOf: ChunkEdges;
  pageRefs: Map<string, string[]>;
  closures: Map<string, Set<string>>;
}

export function createScopeCache(inputs: ScopeInputs): ScopeCache {
  return {
    edgesOf: createChunkEdges(inputs.sources),
    pageRefs: new Map(),
    closures: new Map(),
  };
}

/** 셀렉터 페이지들이 도달하는 청크 폐포. */
function reachableChunks(
  selector: PageSelector | undefined,
  inputs: ScopeInputs,
  cache: ScopeCache,
): Set<string> {
  const key = JSON.stringify(selector ?? null);
  const cached = cache.closures.get(key);
  if (cached) return cached;
  const refs = new Set<string>();
  for (const [path, html] of selectPages(inputs.pages, selector)) {
    let pageRefs = cache.pageRefs.get(path);
    if (pageRefs === undefined) {
      pageRefs = collectChunkRefs(html);
      cache.pageRefs.set(path, pageRefs);
    }
    for (const ref of pageRefs) refs.add(ref);
  }
  const closure = closureOver(refs, inputs.sources, cache.edgesOf);
  cache.closures.set(key, closure);
  return closure;
}

/** 스코프 안에서 마커가 발견된 위치 목록 — 비어 있으면 "없다". */
export function findMarkerIn(
  scope: MarkerScope,
  marker: string,
  inputs: ScopeInputs,
  cache: ScopeCache = createScopeCache(inputs),
): string[] {
  switch (scope.kind) {
    case 'chunks': {
      const locations: string[] = [];
      for (const name of reachableChunks(scope.of, inputs, cache)) {
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
  const cache = createScopeCache(inputs);
  for (const rule of rules) {
    for (const scope of rule.forbiddenIn) {
      for (const location of findMarkerIn(scope, rule.marker, inputs, cache)) {
        violations.push({
          label: rule.label,
          marker: rule.marker,
          rule: 'leak',
          message: `[${rule.label}] 마커 '${rule.marker}'가 ${describeScope(scope)} ${location}에 있습니다.`,
        });
      }
    }
    for (const scope of rule.requiredIn) {
      if (findMarkerIn(scope, rule.marker, inputs, cache).length === 0) {
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

/**
 * `_next/static/chunks/` 아래의 모든 .js — `chunks/` 기준 상대 경로 → 본문.
 * basename으로 묶던 때는 하위 폴더의 같은 이름 청크가 서로를 덮어썼다.
 */
function readChunkSources(outDir: string): Map<string, string> {
  const chunksDir = join(outDir, '_next', 'static', 'chunks');
  const sources = new Map<string, string>();
  if (!existsSync(chunksDir)) return sources;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js'))
        sources.set(
          relative(chunksDir, full).split(sep).join('/'),
          readFileSync(full, 'utf8'),
        );
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
