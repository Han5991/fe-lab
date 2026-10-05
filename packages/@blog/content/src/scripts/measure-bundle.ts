import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { listFilesRecursive } from '../shared/postFiles.ts';
import type { ContentContext } from './context.ts';
import { collectPages } from './check-seo.ts';
import { collectAssetRefs } from './assetRefs.ts';

/**
 * 빌드 산출물(`out/`)의 **첫 로드 전송량**을 잰다 — 블로그의 기준선을 숫자로
 * 남기고, 의존성·설정 변경이 그 숫자를 얼마나 움직였는지 보기 위한 자다.
 *
 * 이 명령은 **게이트가 아니다** — 수치만 낸다. 게이트는 `check-bundle`의 예산
 * (`bundleBudgets`)이고, 같은 측정(`measurePages`)을 그룹별 상한에 대 본다.
 * 여기는 그 상한을 정하거나 올릴 때 근거를 보는 자다.
 *
 * ## 무엇을 "첫 로드"로 세는가
 *
 * 문서가 **직접 가리켜 브라우저가 첫 로드에 내려받는 것만** 센다
 * (`assetRefs.ts` — `<script src>`, `<link rel=stylesheet|modulepreload>`,
 * `<link rel=preload as=script|style>`; `nomodule`·`prefetch`·폰트는 빼고). 경로
 * 관례(`_next/static/chunks/`)가 아니라 태그에서 읽는다. 청크가 다른 청크를
 * 파일명으로 여는 지연 로드는 세지 않는다 — 첫 로드에 오지 않고, 도달 가능한
 * 청크 전부를 보는 것은 `check-bundle`의 일이다.
 *
 * **HTML 자체도 함께 잰다.** Next는 하이드레이션용 RSC 페이로드를 문서에
 * 인라인한다(`self.__next_f.push`). JS 파일 크기만 보면 페이로드를 인라인으로
 * 옮기는 변경이 작아 보이므로, 첫 로드 전송량은 HTML + CSS + JS다.
 *
 * 참조했는데 `out/`에 없는 파일은 0으로 세지 않고 `missing`으로 따로 보고한다 —
 * 수집기가 경로를 잘못 풀면 "번들이 작아졌다"로 보이는 것이 가장 위험하다.
 *
 * 사용: `blog-content measure-bundle [outDir] [--json <경로>]`
 */

/** 첫 로드 자산 하나 — 예산 초과를 보고할 때 "무엇이 무거운가"를 대는 단위. */
export interface AssetMeasurement {
  /** 사이트 루트 기준 경로 (`collectAssetRefs`의 형태) */
  path: string;
  kind: 'js' | 'css';
  gzip: number;
}

/** 페이지 하나의 첫 로드 전송량 — 전부 gzip 바이트. */
export interface PageMeasurement {
  /** URL 경로 (`collectPages`의 키) */
  path: string;
  htmlGzip: number;
  cssGzip: number;
  jsGzip: number;
  /** html + css + js */
  totalGzip: number;
  /** 문서가 직접 가리킨 JS 파일 수 */
  jsFiles: number;
  /** 잰 자산 전부 — 합이 `cssGzip`·`jsGzip`이다 */
  assets: AssetMeasurement[];
  /** 참조했지만 `out/`에 없던 경로 — 비어 있어야 정상이다 */
  missing: string[];
}

/** 첫 세그먼트로 묶은 그룹 통계. */
export interface GroupMeasurement {
  /** `/` 또는 첫 경로 세그먼트 */
  group: string;
  pages: number;
  medianTotalGzip: number;
  maxTotalGzip: number;
  /** 중앙값을 낸 페이지 — 그룹의 대표로 표에 찍는다 */
  medianPath: string;
}

export interface MeasureReport {
  outDir: string;
  pages: PageMeasurement[];
  groups: GroupMeasurement[];
  /** `out/` 전체 — raw 바이트 합계와 파일 수 */
  artifacts: { totalBytes: number; files: number };
}

/** gzip 바이트 — 전송량이 관심사라 raw가 아니라 압축 후를 센다. */
function gzipSize(body: Buffer): number {
  return gzipSync(body).length;
}

/**
 * 페이지 하나를 잰다. 자산 본문은 `assetCache`로 재사용한다 — 공통 청크는
 * 모든 페이지가 같은 파일을 가리키므로, 캐시가 없으면 같은 파일을 수십 번
 * 다시 읽고 다시 압축한다.
 */
export function measurePage(
  path: string,
  html: string,
  outDir: string,
  assetCache: Map<string, number | null>,
): PageMeasurement {
  let cssGzip = 0;
  let jsGzip = 0;
  let jsFiles = 0;
  const assets: AssetMeasurement[] = [];
  const missing: string[] = [];

  for (const ref of collectAssetRefs(html, path)) {
    let size = assetCache.get(ref);
    if (size === undefined) {
      const full = join(outDir, ref.slice(1).split('/').join(sep));
      size = existsSync(full) ? gzipSize(readFileSync(full)) : null;
      assetCache.set(ref, size);
    }
    if (size === null) {
      missing.push(ref);
      continue;
    }
    if (ref.endsWith('.css')) {
      cssGzip += size;
      assets.push({ path: ref, kind: 'css', gzip: size });
    } else {
      jsGzip += size;
      jsFiles += 1;
      assets.push({ path: ref, kind: 'js', gzip: size });
    }
  }

  const htmlGzip = gzipSize(Buffer.from(html, 'utf8'));
  return {
    path,
    htmlGzip,
    cssGzip,
    jsGzip,
    totalGzip: htmlGzip + cssGzip + jsGzip,
    jsFiles,
    assets,
    missing,
  };
}

/** 페이지 전부를 잰다 — 자산 캐시를 한 벌로 공유한다(공통 청크를 한 번만 압축). */
export function measurePages(
  pages: ReadonlyMap<string, string>,
  outDir: string,
): PageMeasurement[] {
  const assetCache = new Map<string, number | null>();
  return [...pages].map(([path, html]) =>
    measurePage(path, html, outDir, assetCache),
  );
}

/** 페이지의 그룹 — `/` 또는 첫 경로 세그먼트(`/posts/foo/` → `/posts/`). */
export function pageGroup(path: string): string {
  const segment = path.split('/').filter(Boolean)[0];
  return segment === undefined ? '/' : `/${segment}/`;
}

/**
 * 첫 경로 세그먼트로 묶는다 — `/posts/foo/`도 `/posts/`도 `posts` 그룹이다.
 *
 * 그룹 이름을 사이트 어휘로 붙이지 않는 것이 요점이다("글 상세"·"admin" 같은
 * 분류는 소비자의 말이고, 이 파일은 경로만 안다). 어느 그룹이 무엇인지는
 * 표를 읽는 사람이 안다.
 */
export function groupPages(pages: PageMeasurement[]): GroupMeasurement[] {
  const byGroup = new Map<string, PageMeasurement[]>();
  for (const page of pages) {
    const group = pageGroup(page.path);
    const bucket = byGroup.get(group);
    if (bucket === undefined) byGroup.set(group, [page]);
    else bucket.push(page);
  }

  const groups: GroupMeasurement[] = [];
  for (const [group, bucket] of byGroup) {
    const sorted = [...bucket].sort((a, b) => a.totalGzip - b.totalGzip);
    // 짝수 개면 아래쪽 중앙값 — 실재하는 페이지 하나를 대표로 찍기 위해
    // 두 값을 평균 내지 않는다.
    const median = sorted[Math.floor((sorted.length - 1) / 2)];
    const max = sorted[sorted.length - 1];
    // 그룹은 페이지가 하나 이상일 때만 만들어지므로 둘 다 존재한다.
    if (median === undefined || max === undefined) continue;
    groups.push({
      group,
      pages: bucket.length,
      medianTotalGzip: median.totalGzip,
      maxTotalGzip: max.totalGzip,
      medianPath: median.path,
    });
  }
  return groups.sort((a, b) => b.medianTotalGzip - a.medianTotalGzip);
}

/** `out/` 전체의 raw 바이트와 파일 수 — 배포 산출물 규모의 대조군. */
function measureArtifacts(outDir: string): {
  totalBytes: number;
  files: number;
} {
  const rels = listFilesRecursive(outDir);
  let totalBytes = 0;
  for (const rel of rels) totalBytes += statSync(join(outDir, rel)).size;
  return { totalBytes, files: rels.length };
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

export function measure(outDir: string): MeasureReport {
  const pages = measurePages(collectPages(outDir), outDir);
  pages.sort((a, b) => b.totalGzip - a.totalGzip);
  return {
    outDir,
    pages,
    groups: groupPages(pages),
    artifacts: measureArtifacts(outDir),
  };
}

export function main(ctx: ContentContext, target?: string, jsonPath?: string) {
  const outDir = target
    ? resolve(process.cwd(), target)
    : ctx.content.paths.outDir;
  if (!existsSync(outDir)) {
    console.error(
      `✖ 빌드 산출물이 없습니다: ${outDir}\n  먼저 \`pnpm build\`를 실행하세요.`,
    );
    process.exit(1);
  }

  const report = measure(outDir);
  if (report.pages.length === 0) {
    console.error(
      `✖ ${outDir} 에 index.html이 하나도 없습니다 — 빌드가 완전하지 않습니다.`,
    );
    process.exit(1);
  }

  console.log(`\n첫 로드 전송량 (gzip) — ${outDir}\n`);
  // 그룹 열 폭은 가장 긴 그룹 이름에 맞춘다(`/_not-found/`가 고정 폭을 넘는다).
  // 머리글의 한글은 터미널에서 두 칸이라 공백을 손으로 맞춘다.
  const groupWidth = Math.max(4, ...report.groups.map(g => g.group.length));
  console.log(
    `그룹${' '.repeat(groupWidth - 4)} 페이지    중앙값       최대  대표 페이지`,
  );
  for (const g of report.groups) {
    console.log(
      `${g.group.padEnd(groupWidth)} ${String(g.pages).padStart(6)} ` +
        `${kb(g.medianTotalGzip).padStart(9)}  ${kb(g.maxTotalGzip).padStart(9)}  ${g.medianPath}`,
    );
  }

  console.log('\n대표 페이지 분해 (html / css / js)\n');
  for (const g of report.groups) {
    const page = report.pages.find(p => p.path === g.medianPath);
    if (page === undefined) continue;
    console.log(
      `${page.path.padEnd(40)} ${kb(page.htmlGzip).padStart(9)} ` +
        `${kb(page.cssGzip).padStart(9)} ${kb(page.jsGzip).padStart(9)}  (js 파일 ${page.jsFiles}개)`,
    );
  }

  const missing = report.pages.filter(p => p.missing.length > 0);
  if (missing.length > 0) {
    // 참조는 있는데 파일이 없다 = 수집기가 경로를 잘못 풀었거나 빌드가
    // 불완전하다. 어느 쪽이든 수치를 믿으면 안 되므로 조용히 넘기지 않는다.
    console.error(
      `\n⚠ 참조된 자산 ${missing.length}개 페이지에서 파일을 찾지 못했습니다:`,
    );
    for (const page of missing.slice(0, 5)) {
      console.error(`  ${page.path}: ${page.missing.join(', ')}`);
    }
  }

  console.log(
    `\n산출물 전체: 파일 ${report.artifacts.files}개, ` +
      `${(report.artifacts.totalBytes / 1024 / 1024).toFixed(1)} MB (raw)`,
  );

  if (jsonPath !== undefined) {
    const full = resolve(process.cwd(), jsonPath);
    writeFileSync(full, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\n→ ${full}`);
  }
}
