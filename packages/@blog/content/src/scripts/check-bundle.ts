import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  BundleGuardsConfig,
  ServerOnlyMarker,
} from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';
import { collectPages } from './check-seo.ts';

/**
 * 빌드 산출물(`out/`)에서 **있어선 안 되는 곳에 실린 코드·값**을 검사합니다.
 * `check-seo`가 HTML의 SEO 계약을 보는 것과 같은 자리(빌드 마지막 단계)의
 * 번들 계약 게이트로, 계열 둘을 봅니다(각각 선택 — `BundleGuardsConfig`):
 *
 * - **admin 누수**: 페이지를 `admin.pathPrefix`로 공개/admin 두 무리로 나누고,
 *   각 무리가 도달하는 청크를 모아 마커와 대조합니다. 공개 쪽에 있으면
 *   `bundle-leak`, admin 쪽에 없어도 `marker-dead`.
 * - **서버 전용 값 누수**: 설정 객체·그룹 객체가 클라이언트 그래프로 새면
 *   화면이 안 쓰는 값(llms 산문 등)까지 번들에 실립니다. 마커는 어떤 페이지
 *   HTML·청크에도 없어야 하고(`server-leak`), 앵커 산출물에는 있어야
 *   합니다(`marker-dead`).
 *
 * 도달 청크는 HTML의 script 참조에서 출발해 **폐포**로 구합니다 — 청크가 다른
 * 청크를 파일명 문자열로 여는 지연 로드가 실재해서(HTML만 보면 놓친다),
 * 포함된 청크 본문에 이름이 등장하는 청크를 반복해서 더합니다.
 *
 * 두 계열 모두 양성 대조(`marker-dead`)를 가집니다 — 마커가 죽으면 음성
 * 검사만으로는 "누수 없음"과 "검사 무력화"가 구분되지 않습니다. `isCliEntry`의
 * 무음 no-op 사고에서 배운 fail-closed와 같은 원리입니다.
 *
 * 사용: `pnpm build`의 마지막 단계 — `blog-content check-bundle`
 */

export interface BundleViolation {
  /** 무엇에 대한 위반인가 — 마커 이름 */
  marker: string;
  rule: 'bundle-leak' | 'server-leak' | 'marker-dead';
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

/** admin 마커 대조 — 음성(공개에 없어야)과 양성(admin에 있어야)을 함께 본다. */
export function checkAdminMarkers(
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

/**
 * 서버 전용 마커 대조 — 어떤 페이지 HTML·청크에도 없어야 하고(`server-leak`),
 * 앵커 산출물에는 있어야 한다(`marker-dead`). 산출물 본문은 호출자가 읽어
 * 넘긴다(없는 파일은 null) — 이 함수는 fs를 모른다.
 */
export function checkServerOnlyMarkers(
  entries: readonly ServerOnlyMarker[],
  pages: ReadonlyMap<string, string>,
  sources: ReadonlyMap<string, string>,
  artifacts: ReadonlyMap<string, string | null>,
): BundleViolation[] {
  const violations: BundleViolation[] = [];
  for (const { marker, artifact } of entries) {
    for (const [name, body] of sources) {
      if (body.includes(marker)) {
        violations.push({
          marker,
          rule: 'server-leak',
          message: `청크 ${name}에 서버 전용 값 '${marker}'가 있습니다 — 설정 객체나 그룹 객체가 클라이언트 그래프로 샜습니다.`,
        });
      }
    }
    for (const [path, html] of pages) {
      if (html.includes(marker)) {
        violations.push({
          marker,
          rule: 'server-leak',
          message: `페이지 ${path}에 서버 전용 값 '${marker}'가 있습니다 — 화면에 렌더될 일이 없는 값이 페이지로 나왔습니다.`,
        });
      }
    }
    const anchor = artifacts.get(artifact);
    if (anchor == null || !anchor.includes(marker)) {
      violations.push({
        marker,
        rule: 'marker-dead',
        message: `'${marker}'가 앵커 산출물 ${artifact}에 없습니다 — 값이 바뀌어 마커가 죽었으면 설정(bundleGuards.serverOnly)을 함께 갱신하세요.`,
      });
    }
  }
  return violations;
}

export function runCheckBundle(
  pages: ReadonlyMap<string, string>,
  sources: ReadonlyMap<string, string>,
  guards: BundleGuardsConfig,
  artifacts: ReadonlyMap<string, string | null>,
): BundleViolation[] {
  const violations: BundleViolation[] = [];
  if (guards.admin) {
    const { publicRefs, adminRefs } = classifyChunkRefs(
      pages,
      guards.admin.pathPrefix,
    );
    violations.push(
      ...checkAdminMarkers(
        guards.admin.markers,
        chunkClosure(publicRefs, sources),
        chunkClosure(adminRefs, sources),
        sources,
      ),
    );
  }
  if (guards.serverOnly) {
    violations.push(
      ...checkServerOnlyMarkers(guards.serverOnly, pages, sources, artifacts),
    );
  }
  return violations;
}

export function main(ctx: ContentContext, target?: string) {
  // 선언 자체가 없는 사이트(admin 영역 없음)는 검사 대상이 아니다. 마커만 비운
  // 반쪽 선언은 타입이 막으므로(BundleGuardsConfig 참고) 여기 올 수 없다.
  const guards = ctx.content.config.bundleGuards;
  if (!guards) {
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
  // 검사(marker-dead)가 어차피 전 마커에서 실패하지만, 원인을 바로 말해 준다.
  if (pages.size === 0 || sources.size === 0) {
    console.error(
      `✖ ${outDir} 에 페이지(${pages.size})나 청크(${sources.size})가 없습니다 — 빌드가 완전하지 않습니다.`,
    );
    process.exit(1);
  }

  // serverOnly의 앵커 산출물을 읽는다 — 없는 파일은 null로 넘겨 검사 함수가
  // marker-dead로 보고한다(여기서 미리 실패시키면 위반 목록이 갈라진다).
  const artifacts = new Map<string, string | null>();
  for (const { artifact } of guards.serverOnly ?? []) {
    const anchorPath = join(outDir, artifact);
    artifacts.set(
      artifact,
      existsSync(anchorPath) ? readFileSync(anchorPath, 'utf8') : null,
    );
  }

  const violations = runCheckBundle(pages, sources, guards, artifacts);
  if (violations.length === 0) {
    const adminCount = guards.admin?.markers.length ?? 0;
    const serverCount = guards.serverOnly?.length ?? 0;
    console.log(
      `✓ 번들 누수 검사 통과 — admin 마커 ${adminCount}개 · 서버 전용 ${serverCount}개 (청크 ${sources.size}개)`,
    );
    return;
  }

  console.error(`\n번들 누수 검사 실패: 위반 ${violations.length}건\n`);
  for (const v of violations) {
    console.error(`✖ [${v.rule}] ${v.message}`);
  }
  process.exit(1);
}
