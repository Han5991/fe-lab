import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { ContentContext } from './context.ts';
import { collectPages } from './check-seo.ts';
import { collectAssetRefs } from './assetRefs.ts';

/**
 * 빌드 산출물(`out/`)의 **첫 로드 전송량**을 잰다 — 같은 사이트를 다른
 * 프레임워크로 지었을 때 무엇이 얼마나 달라지는지 대조하기 위한 자다.
 *
 * `check-seo`·`check-bundle`과 같은 자리(산출물 검사)에 있지만 **게이트가
 * 아니다.** 통과/실패를 내지 않고 수치만 낸다. 임계값을 아직 모르기 때문이다 —
 * 기준선을 먼저 재고 목표는 그 숫자를 본 뒤에 정한다.
 *
 * ## 참조는 어떻게 모으는가
 *
 * 경로 관례 대신 **태그에서 읽는다**(`assetRefs.ts`) — 어떤 번들러가 어떤
 * 디렉터리에 쏟든 브라우저가 첫 로드에 받는 것은 결국 문서가 가리킨 파일이다.
 * `check-bundle`도 같은 수집기를 쓴다: 둘이 각자 긁으면 "무엇이 첫 로드에
 * 오는가"의 답이 갈리는데, 하나는 게이트고 하나는 자라서 어긋남이 조용하다.
 *
 * ## 무엇을 "첫 로드"로 세는가
 *
 * 문서가 **직접 가리킨 것만** 센다(`<script src>`, `<link rel=stylesheet|
 * modulepreload|preload>`). 청크가 다른 청크를 파일명으로 여는 지연 로드는
 * 세지 않는다 — 그것이 바로 프레임워크가 줄이려는 대상이고, 첫 로드에는
 * 오지 않는다.
 *
 * **HTML 자체도 함께 잰다.** 하이드레이션 데이터를 문서에 인라인하는 것은
 * Next.js(`self.__next_f.push`)도 SvelteKit도 마찬가지라, JS 파일 크기만 보면
 * 인라인이 많은 쪽이 부당하게 작아 보인다. 첫 로드 전송량은 HTML + CSS + JS다.
 *
 * 사용: `blog-content measure-bundle [outDir] [--json <경로>]`
 */

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
  /** `out/` 전체 — 확장자별 raw 합계와 파일 수 */
  artifacts: { totalBytes: number; files: number };
}

/** gzip 바이트 — 전송량이 관심사라 raw가 아니라 압축 후를 센다. */
function gzipSize(body: Buffer): number {
  return gzipSync(body).length;
}

/**
 * 페이지 하나를 잰다. 자산 본문은 `assetCache`로 재사용한다 — 공통 청크는
 * 46개 페이지가 같은 파일을 가리키므로, 캐시가 없으면 같은 파일을 수십 번
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
    } else {
      jsGzip += size;
      jsFiles += 1;
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
    missing,
  };
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
    const segment = page.path.split('/').filter(Boolean)[0];
    const group = segment === undefined ? '/' : `/${segment}/`;
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
  let totalBytes = 0;
  let files = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        totalBytes += statSync(full).size;
        files += 1;
      }
    }
  };
  walk(outDir);
  return { totalBytes, files };
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

export function measure(outDir: string): MeasureReport {
  const pageHtml = collectPages(outDir);
  const assetCache = new Map<string, number | null>();
  const pages: PageMeasurement[] = [];
  for (const [path, html] of pageHtml) {
    pages.push(measurePage(path, html, outDir, assetCache));
  }
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
  console.log('그룹        페이지  중앙값     최대       대표 페이지');
  for (const g of report.groups) {
    console.log(
      `${g.group.padEnd(11)} ${String(g.pages).padStart(5)}  ` +
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
