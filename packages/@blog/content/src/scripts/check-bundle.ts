import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BundleGuardsConfig } from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';
import { collectPages } from './check-seo.ts';

/**
 * 빌드 산출물(`out/`)의 JS 청크에서 **admin 전용 코드의 공개 페이지 누수**를
 * 검사합니다.
 *
 * `check-seo`가 HTML의 SEO 계약을 보는 것과 같은 자리(빌드 마지막 단계)에서,
 * 이 게이트는 번들 계약을 봅니다: 페이지를 `adminPathPrefix`로 공개/admin 두
 * 무리로 나누고, 각 무리가 도달하는 청크를 모아 설정의 마커와 대조합니다.
 *
 * 도달 청크는 HTML의 script 참조에서 출발해 **폐포**로 구합니다 — 청크가 다른
 * 청크를 파일명 문자열로 여는 지연 로드가 실재해서(HTML만 보면 놓친다),
 * 포함된 청크 본문에 이름이 등장하는 청크를 반복해서 더합니다.
 *
 * 검사는 대칭 두 방향입니다:
 * - **음성**: 마커가 공개 도달 청크에 있으면 누수(`bundle-leak`).
 * - **양성**: 마커가 admin 도달 청크 어디에도 없으면 실패(`marker-dead`) —
 *   번들러가 export 이름을 문자열로 남기는 방식이 바뀌어 마커가 죽으면,
 *   음성 검사만으로는 "누수 없음"과 "검사 무력화"가 구분되지 않습니다.
 *   `isCliEntry`의 무음 no-op 사고에서 배운 fail-closed와 같은 원리입니다.
 *
 * 사용: `pnpm build`의 마지막 단계 — `blog-content check-bundle`
 */

export interface BundleViolation {
  /** 무엇에 대한 위반인가 — 마커 이름 */
  marker: string;
  rule: 'bundle-leak' | 'marker-dead';
  message: string;
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

/** 페이지를 admin/공개로 나눠 각 무리가 직접 참조하는 청크를 모은다. */
export function classifyChunkRefs(
  pages: ReadonlyMap<string, string>,
  adminPathPrefix: string,
): { publicRefs: Set<string>; adminRefs: Set<string> } {
  const publicRefs = new Set<string>();
  const adminRefs = new Set<string>();
  for (const [path, html] of pages) {
    const target = path.startsWith(adminPathPrefix) ? adminRefs : publicRefs;
    for (const ref of collectChunkRefs(html)) target.add(ref);
  }
  return { publicRefs, adminRefs };
}

/** 마커 대조 — 음성(공개에 없어야)과 양성(admin에 있어야)을 함께 본다. */
export function checkMarkers(
  markers: readonly string[],
  publicChunks: ReadonlySet<string>,
  adminChunks: ReadonlySet<string>,
  sources: ReadonlyMap<string, string>,
): BundleViolation[] {
  const violations: BundleViolation[] = [];
  for (const marker of markers) {
    const inPublic = [...publicChunks].filter(name =>
      sources.get(name)?.includes(marker),
    );
    for (const name of inPublic) {
      violations.push({
        marker,
        rule: 'bundle-leak',
        message: `공개 페이지가 도달하는 청크 ${name}에 '${marker}'가 있습니다 — admin 전용 코드가 공개 번들에 실렸습니다.`,
      });
    }
    const inAdmin = [...adminChunks].some(name =>
      sources.get(name)?.includes(marker),
    );
    if (!inAdmin) {
      violations.push({
        marker,
        rule: 'marker-dead',
        message: `'${marker}'가 admin 청크 어디에도 없습니다 — 마커가 죽어 이 검사가 무력화됐습니다. 코드에서 이름이 바뀌었으면 설정(bundleGuards.markers)을, 번들러 출력 방식이 바뀌었으면 마커 전략을 갱신하세요.`,
      });
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

export function runCheckBundle(
  pages: ReadonlyMap<string, string>,
  sources: ReadonlyMap<string, string>,
  guards: BundleGuardsConfig,
): BundleViolation[] {
  const { publicRefs, adminRefs } = classifyChunkRefs(
    pages,
    guards.adminPathPrefix,
  );
  return checkMarkers(
    guards.markers,
    chunkClosure(publicRefs, sources),
    chunkClosure(adminRefs, sources),
    sources,
  );
}

export function main(ctx: ContentContext, target?: string) {
  const guards = ctx.content.config.bundleGuards;
  if (guards.markers.length === 0) {
    console.log('✓ check-bundle: 마커 미설정 — 검사 스킵');
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
  // 검사(marker-dead)가 어차피 전 마커에서 실패하지만, 원인을 바로 말해 준다.
  if (pages.size === 0 || sources.size === 0) {
    console.error(
      `✖ ${outDir} 에 페이지(${pages.size})나 청크(${sources.size})가 없습니다 — 빌드가 완전하지 않습니다.`,
    );
    process.exit(1);
  }

  const violations = runCheckBundle(pages, sources, guards);
  if (violations.length === 0) {
    console.log(
      `✓ ${guards.markers.length}개 마커 번들 누수 검사 통과 (청크 ${sources.size}개)`,
    );
    return;
  }

  console.error(`\n번들 누수 검사 실패: 위반 ${violations.length}건\n`);
  for (const v of violations) {
    console.error(`✖ [${v.rule}] ${v.message}`);
  }
  process.exit(1);
}
