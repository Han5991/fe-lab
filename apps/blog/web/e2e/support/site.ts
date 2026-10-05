/**
 * 검사 대상 — 빌드 산출물(`out/`)에서 **페이지 목록을 유도**한다.
 *
 * 손으로 고른 목록은 글이 늘 때마다 뒤처진다. 여기서는 산출물에 있는 HTML 전부를
 * 걷고, 그 결과를 sitemap과 검색 인덱스(빌드가 공개 판정을 마친 글 목록)로 교차
 * 검증한다. 어느 한쪽이 비거나 어긋나면 수집 단계에서 던진다 — 페이지를 하나도
 * 안 보고 "전부 통과"하는 게이트가 가장 위험하기 때문이다.
 *
 * 셋은 같은 빌드가 만드니 함께 줄면 서로를 못 잡는다. 그래서 바닥은 빌드 밖에서
 * 센다 — 원고 폴더에서 `status: published`인 파일 수(`sourcePublishedCount`).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export const APP_ROOT = resolve(__dirname, '..', '..');
export const OUT_DIR = join(APP_ROOT, 'out');
/** 원고 폴더 — `content.config.mts`의 `dirs.posts` 기본값(`../posts`)과 같은 자리. */
const POSTS_DIR = join(APP_ROOT, '..', 'posts');

/** 산출물이 없으면 바로 실패한다 — 이 스위트는 빌드를 하지 않는다. */
export function assertBuilt(): void {
  if (!existsSync(join(OUT_DIR, 'index.html'))) {
    throw new Error(
      `빌드 산출물이 없습니다: ${OUT_DIR}/index.html\n` +
        '`pnpm build --filter=@blog/web`로 out/을 만든 뒤 다시 실행하세요(test:e2e는 빌드하지 않습니다).',
    );
  }
}

function readOut(path: string): string {
  return readFileSync(join(OUT_DIR, path), 'utf8');
}

/** 커밋된 `.env.production`의 값 — 빌드가 번들에 인라인한 것과 같은 출처다. */
function readEnvProduction(): Map<string, string> {
  const env = new Map<string, string>();
  for (const line of readFileSync(
    join(APP_ROOT, '.env.production'),
    'utf8',
  ).split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m?.[1] && m[2] !== undefined) env.set(m[1], m[2]);
  }
  return env;
}

function requireEnv(env: Map<string, string>, key: string): string {
  const value = env.get(key);
  if (!value) throw new Error(`.env.production에 ${key}가 없습니다`);
  return value;
}

const ENV = readEnvProduction();
export const SUPABASE_URL = requireEnv(ENV, 'NEXT_PUBLIC_SUPABASE_URL').replace(
  /\/+$/,
  '',
);
export const ADMIN_EMAIL = requireEnv(ENV, 'NEXT_PUBLIC_ADMIN_EMAIL');

/** 검색 인덱스의 행 — 빌드가 공개로 판정한 글. 이 스위트가 읽는 축만 둔다. */
export interface IndexedPost {
  slug: string;
  title: string;
}

function isIndexedPost(row: unknown): row is IndexedPost {
  return (
    typeof row === 'object' &&
    row !== null &&
    'slug' in row &&
    typeof row.slug === 'string' &&
    'title' in row &&
    typeof row.title === 'string'
  );
}

/** 빌드가 공개로 판정한 글(검색 인덱스). 양성 대조의 기준이다. */
export function publishedPosts(): IndexedPost[] {
  const json: unknown = JSON.parse(readOut('search-index.json'));
  if (!Array.isArray(json) || !json.every(isIndexedPost)) {
    throw new Error('out/search-index.json의 모양이 예상과 다릅니다');
  }
  return json;
}

function walkMarkdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

/**
 * 원고 중 frontmatter가 `status: published`인 파일 수 — 공개 글 수의 **하한**.
 *
 * `@blog/content`의 로더·공개 판정을 일부러 거치지 않는다: 그쪽이 회귀하면 산출물
 * 셋(HTML·sitemap·검색 인덱스)이 함께 줄어 교차 검증이 통과해 버린다. 예약 글은
 * 세지 않는다(공개 시각이 빌드 시각에 달려 하한이 흔들린다) — 그래서 등호가 아니라 ≥다.
 */
export function sourcePublishedCount(): number {
  return walkMarkdown(POSTS_DIR).filter(file => {
    const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(
      readFileSync(file, 'utf8'),
    )?.[1];
    return (
      front !== undefined && /^status:\s*['"]?published['"]?\s*$/m.test(front)
    );
  }).length;
}

/** 산출물 파일 경로 → 서빙 경로. `posts/a/index.html` → `/posts/a/`. */
function toRoute(file: string): string {
  const rel = relative(OUT_DIR, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html'))
    return `/${rel.slice(0, -'index.html'.length)}`;
  // `404.html`은 not_found_handling이 쓰는 파일이고 같은 페이지가 `404/index.html`로도
  // 나간다. 라우트로는 후자 하나만 센다.
  return '';
}

function walkHtml(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // `_next`는 자산, `_not-found`는 Next가 404를 위해 따로 굽는 사본이다(같은 화면이
      // `/404/`로 검사된다). 둘 다 사용자가 여는 경로가 아니다.
      return entry.name === '_next' || entry.name === '_not-found'
        ? []
        : walkHtml(path);
    }
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

function sitemapRoutes(): string[] {
  return [...readOut('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    m => new URL(m[1] ?? '').pathname,
  );
}

export type PageKind = 'post' | 'page' | 'admin';

export interface SitePage {
  route: string;
  kind: PageKind;
}

function kindOf(route: string): PageKind {
  if (route.startsWith('/admin/')) return 'admin';
  if (/^\/posts\/.+/.test(route)) return 'post';
  return 'page';
}

/**
 * 산출물의 모든 HTML 페이지. 수집과 동시에 양성 대조를 건다:
 *
 * - sitemap의 모든 URL이 산출물에 HTML로 있어야 한다(sitemap ⊆ 페이지).
 * - 글 페이지 = 검색 인덱스(빌드가 공개로 판정한 글) = sitemap의 글 URL — 셋이 같은 집합.
 * - 공개 글 수가 원고의 `status: published` 파일 수(빌드 밖의 하한)보다 적으면 던진다.
 */
export function sitePages(): SitePage[] {
  assertBuilt();
  const routes = new Set(walkHtml(OUT_DIR).map(toRoute).filter(Boolean));

  const missingFromOut = sitemapRoutes().filter(r => !routes.has(r));
  if (missingFromOut.length > 0) {
    throw new Error(
      `sitemap에 있는데 산출물에 HTML이 없는 URL: ${missingFromOut.join(', ')}`,
    );
  }

  const posts = publishedPosts();
  const floor = sourcePublishedCount();
  if (floor === 0 || posts.length < floor) {
    throw new Error(
      `공개 글 ${posts.length}편 < 원고의 status: published ${floor}편 — 빌드가 글을 잃었습니다(${POSTS_DIR})`,
    );
  }
  const indexed = new Set(posts.map(p => `/posts/${p.slug}/`));
  const postRoutes = new Set(
    [...routes].filter(r => kindOf(r) === 'post').map(r => decodeURI(r)),
  );
  const sitemapPosts = new Set(
    sitemapRoutes()
      .filter(r => kindOf(r) === 'post')
      .map(r => decodeURI(r)),
  );
  const diff = (a: Set<string>, b: Set<string>) =>
    [...a].filter(r => !b.has(r)).join(', ');
  for (const [name, a, b] of [
    ['검색 인덱스에 있는데 산출물에 없는 글', indexed, postRoutes],
    ['산출물에 있는데 검색 인덱스에 없는 글', postRoutes, indexed],
    ['검색 인덱스에 있는데 sitemap에 없는 글', indexed, sitemapPosts],
  ] as const) {
    const missing = diff(a, b);
    if (missing) throw new Error(`${name}: ${missing}`);
  }

  return [...routes].sort().map(route => ({ route, kind: kindOf(route) }));
}

function postHtml(route: string): string {
  return readOut(`${decodeURI(route).slice(1)}index.html`);
}

/** 서버 HTML의 `<pre>` 수 — 코드 블록이 가장 많은 글을 고르는 데 쓴다. */
function preCount(route: string): number {
  return postHtml(route).match(/<pre\b/g)?.length ?? 0;
}

/**
 * mermaid 펜스 수. 서버 HTML의 도표 자리는 빈 placeholder라 마크업으로는 안 보이고,
 * RSC 페이로드에 `MermaidLazy`의 `chart` prop으로만 실린다.
 */
export function mermaidChartCount(route: string): number {
  return postHtml(route).match(/\\"chart\\":/g)?.length ?? 0;
}

/**
 * 원고가 raw HTML로 박은 글자색이 남은 글 — 토큰(`var(--colors-…)`)이 아닌 인라인
 * `color:`. 리터럴 색은 테마를 타지 않아 한쪽 테마에서만 대비가 무너질 수 있다
 * (PostBody의 `AUTHOR_COLOR_CLASS`가 아는 값은 이미 토큰으로 바뀌어 여기 안 걸린다).
 */
function hasInlineColor(route: string): boolean {
  return /style="[^"]*(?<![-\w])color:\s*(?!var\(--colors)/.test(
    postHtml(route),
  );
}

export interface Representatives {
  /** 코드 블록이 가장 많은 글 — 긴 본문·구문 강조·폰트 검사용. */
  codePost: string;
  /** mermaid 도표가 가장 많은 글. */
  mermaidPost: string;
  /** 리터럴 글자색이 남은 글 — 다크 axe에 더한다(보통 비어 있다). */
  inlineColorPosts: string[];
  /** 대표 집합 — 다크 테마 axe·모바일 검사가 돈다. */
  routes: string[];
}

/** 대표 페이지 — 산출물에서 고른다. 고를 글이 없으면 그 자체가 실패다. */
export function representatives(): Representatives {
  const posts = sitePages()
    .filter(p => p.kind === 'post')
    .map(p => p.route);
  const by = (score: (r: string) => number) =>
    posts.reduce<{ route: string; n: number }>(
      (best, route) => {
        const n = score(route);
        return n > best.n ? { route, n } : best;
      },
      { route: '', n: 0 },
    ).route;
  const codePost = by(preCount);
  const mermaidPost = by(mermaidChartCount);
  if (!codePost || !mermaidPost) {
    throw new Error(
      `대표 글을 고르지 못했습니다(코드 블록 글: ${codePost || '없음'}, mermaid 글: ${mermaidPost || '없음'})`,
    );
  }
  const inlineColorPosts = posts.filter(hasInlineColor);
  return {
    codePost,
    mermaidPost,
    inlineColorPosts,
    routes: [
      ...new Set([
        '/',
        '/posts/',
        '/series/',
        codePost,
        mermaidPost,
        '/404/',
        ...inlineColorPosts,
      ]),
    ],
  };
}
