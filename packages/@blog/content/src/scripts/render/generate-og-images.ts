import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import satori, { type SatoriOptions } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { resolvePostSet } from '../artifacts.ts';
import { fmtDate } from '../../shared/format.ts';
import type { OgConfig, SiteConfig } from '../../shared/contentConfig.ts';
import type { ContentContext } from '../context.ts';
/**
 * OG 카드에 쓰는 Pretendard 폰트가 있는 디렉터리.
 *
 * 경로를 적지 않고 **resolver에게 묻는다**. 예전에는 설정(`dirs.ogFonts`)에
 * `node_modules/pretendard/dist/public/static`을 앱 루트 기준 상대 경로로 적어
 * 뒀는데, 그건 이 패키지가 **소비자의 node_modules 배치**를 안다는 뜻이었다 —
 * pretendard가 앱에만 선언돼 있어서(그리고 pnpm이 앱 아래에 심링크를 만들어
 * 줘서) 우연히 돌던 것이고, 이 패키지를 다른 앱이 쓰면 어디에도 안 적힌 의존을
 * 따로 깔아야 했다. 지금은 pretendard가 이 패키지의 dependency이고, 실제 파일
 * 위치는 pnpm이 어떻게 깔았든 resolver가 안다.
 *
 * 호출 시점에 푼다(기본 인자) — 모듈을 import하는 것만으로는 resolve가 돌지
 * 않고, 폰트 디렉터리를 넘겨 부르면 아예 타지 않는다.
 */
function resolveFontDir(): string {
  const resolveFrom = createRequire(import.meta.url);
  return dirname(
    resolveFrom.resolve('pretendard/dist/public/static/Pretendard-Regular.otf'),
  );
}

/**
 * 템플릿 **구조**를 바꾸면 올려서 모든 이미지를 재생성하게 합니다.
 * 4 — 리뉴얼 팔레트(틸 포인트 + #0B0D10 지면) 적용 + 날짜를 하이픈 표기로 통일.
 * 5 — 포인트색을 틸에서 cyan(#67E8F9)으로 교체.
 * 6 — og 설정(크기·팔레트)이 해시 입력에 들어감 — 설정 오버라이드가 재생성을
 *     트리거한다(이전엔 팔레트를 바꿔도 기존 이미지가 skip돼 섞였다).
 */
const TEMPLATE_VERSION = 6;

export interface OgPostInput {
  slug: string;
  title: string;
  date: string | null;
  series?: string | undefined;
}

/**
 * 이미지에 들어가는 입력만으로 계산 — 입력이 같으면 재렌더링을 skip합니다.
 * og 설정(크기·팔레트)과 카드에 그려지는 사이트 정체성(이름·도메인)도 렌더
 * 입력이므로 해시에 포함한다 — 설정만 바꿔도 전체가 재생성된다.
 */
export function ogContentHash(
  post: OgPostInput,
  site: Pick<SiteConfig, 'url' | 'name'>,
  og: OgConfig,
): string {
  return createHash('sha1')
    .update(
      JSON.stringify({
        v: TEMPLATE_VERSION,
        title: post.title,
        date: post.date,
        series: post.series ?? null,
        og: { width: og.width, height: og.height, palette: og.palette },
        site: { name: site.name, url: site.url },
      }),
    )
    .digest('hex');
}

/**
 * slug → public/og/ 아래 상대 경로. 중첩 slug(`회고/2024/글`)는 폴더 구조를
 * 보존하고, `..` 등 og/ 밖으로 나갈 수 있는 slug는 거부합니다.
 */
export function ogFileRelPath(slug: string): string {
  const segments = slug.split('/');
  if (segments.some(s => !s || s === '.' || s === '..')) {
    throw new Error(`og 이미지 경로로 쓸 수 없는 slug입니다: ${slug}`);
  }
  return `${segments.join('/')}.png`;
}

/**
 * 생성 대상 판정: 명시 thumbnail이 없거나, frontmatter에 기록된 생성 카드
 * 경로(/og/*)를 가리키는 글. 후자가 없으면 frontmatter가 생성기 출력물을
 * 참조하는 순간 "썸네일 있는 글"로 오인되어 이미지가 사라지는 순환이 생긴다.
 */
export function needsGeneratedOg(post: {
  thumbnail?: string | undefined;
}): boolean {
  return !post.thumbnail || post.thumbnail.startsWith('/og/');
}

/** 긴 한글 제목이 3줄을 넘지 않도록 글자수 기준으로 폰트 크기를 줄입니다. */
export function titleFontSize(title: string): number {
  if (title.length <= 18) return 76;
  if (title.length <= 38) return 64;
  return 54;
}

/**
 * 시리즈 pill과 중복되는 제목의 시리즈 prefix를 이미지에서만 제거합니다.
 * (예: '[Typescript로 설계하는 프로젝트] 당신의 Type...' — 폴더명과 정확히
 * 일치하는 prefix만, 남는 제목이 있을 때만 제거하는 보수적 규칙)
 */
export function displayTitle(title: string, series?: string): string {
  if (!series || !title.startsWith(series)) return title;
  const rest = title.slice(series.length).replace(/^[\s:·—-]+/, '');
  return rest || title;
}

interface OgNode {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: OgNode[] | string | undefined;
  };
}

function el(
  type: string,
  style: Record<string, unknown>,
  children?: OgNode[] | string,
): OgNode {
  return { type, props: { style, children } };
}

/**
 * 1200×630 OG 카드 satori 엘리먼트 트리.
 * 디자인: 블로그 지면과 같은 paper 톤 + 중앙 정렬 구성(카드 썸네일로
 * 축소돼도 좌우 균형 유지) + 상하 룰. 시리즈 pill / 날짜·도메인 푸터.
 *
 * 팔레트는 **언제나 인자로 온다**(기본값 없음). satori/resvg가 CSS 변수를 못 읽어
 * 소비자가 자기 디자인 토큰에서 해석해 넘기는 리터럴 색이라, 패키지가 기본 팔레트를
 * 들면 색을 안 넘긴 소비자의 카드가 남의 사이트 색으로 조용히 나간다 — 실패조차
 * 하지 않는 종류의 사고다. 이 저장소에서는 `content.config.mts`가 디자인 시스템의
 * `darkColor()`로 뽑는다.
 */
export function ogTemplate(
  post: OgPostInput,
  site: Pick<SiteConfig, 'url' | 'name'>,
  og: OgConfig,
): OgNode {
  const title = displayTitle(post.title, post.series);
  const {
    paper: PAPER,
    ink: INK,
    inkMeta: INK_META,
    inkRule: INK_RULE,
    accent: ACCENT,
    pillBorder,
  } = og.palette;

  const rule = el('div', {
    width: '100%',
    height: 2,
    backgroundColor: INK_RULE,
  });

  const brand = el('div', { display: 'flex', alignItems: 'center', gap: 14 }, [
    el('div', { width: 14, height: 14, backgroundColor: ACCENT }),
    el(
      'div',
      { fontSize: 27, fontWeight: 500, color: INK, letterSpacing: 3 },
      site.name,
    ),
  ]);

  const headline: OgNode[] = [];
  if (post.series) {
    headline.push(
      el(
        'div',
        {
          display: 'flex',
          border: `2px solid ${pillBorder}`,
          borderRadius: 9999,
          padding: '6px 26px',
          fontSize: 25,
          fontWeight: 500,
          color: ACCENT,
        },
        post.series,
      ),
    );
  }
  headline.push(
    el(
      'div',
      {
        fontSize: titleFontSize(title),
        fontWeight: 700,
        color: INK,
        lineHeight: 1.38,
        letterSpacing: -0.5,
        lineClamp: 3,
        textAlign: 'center',
        wordBreak: 'keep-all',
      },
      title,
    ),
  );

  const footer = el('div', { display: 'flex', alignItems: 'center', gap: 16 }, [
    el(
      'div',
      { fontSize: 24, fontWeight: 500, color: INK_META },
      fmtDate(post.date),
    ),
    el('div', {
      width: 5,
      height: 5,
      borderRadius: 9999,
      backgroundColor: INK_RULE,
    }),
    el(
      'div',
      { fontSize: 24, fontWeight: 500, color: INK_META },
      site.url.replace('https://', ''),
    ),
  ]);

  return el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: PAPER,
      padding: '52px 90px 46px',
    },
    [
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: '100%',
        },
        [brand, rule],
      ),
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
          padding: '0 20px',
        },
        headline,
      ),
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          width: '100%',
        },
        [rule, footer],
      ),
    ],
  );
}

/** 기대 목록에 없는 png = 삭제/이름변경/썸네일 추가된 글의 잔여물 */
export function findOrphanPngs(
  existingRelPaths: string[],
  expectedRelPaths: Set<string>,
): string[] {
  return existingRelPaths.filter(
    p => p.endsWith('.png') && !expectedRelPaths.has(p),
  );
}

export function loadFonts(fontDir = resolveFontDir()): SatoriOptions['fonts'] {
  const font = (file: string, weight: 400 | 500 | 700) => ({
    name: 'Pretendard',
    data: readFileSync(join(fontDir, file)),
    weight,
    style: 'normal' as const,
  });
  return [
    font('Pretendard-Regular.otf', 400),
    font('Pretendard-Medium.otf', 500),
    font('Pretendard-Bold.otf', 700),
  ];
}

export async function renderOgPng(
  post: OgPostInput,
  fonts: SatoriOptions['fonts'],
  site: Pick<SiteConfig, 'url' | 'name'>,
  og: OgConfig,
): Promise<Buffer> {
  const svg = await satori(
    ogTemplate(post, site, og) as unknown as Parameters<typeof satori>[0],
    { width: og.width, height: og.height, fonts },
  );
  return Buffer.from(new Resvg(svg).render().asPng());
}

function readManifest(manifestPath: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // 없거나 깨진 manifest는 전체 재생성으로 처리
  }
  return {};
}

export async function main(ctx: ContentContext) {
  const ogDir = ctx.content.paths.ogOutDir;
  const manifestPath = join(ctx.content.paths.cacheDir, 'og-images.json');
  // 외부/직접 썸네일이 명시된 글은 제외, 없거나 /og/*를 가리키는 글만 생성.
  // visible의 **부분집합**이 되므로 레지스트리(artifacts.ts)의 og 항목은
  // exact가 아니라 subset이다 — 베이스 셀렉터는 레지스트리와 공유한다.
  const posts = resolvePostSet(ctx.content, 'visible').filter(needsGeneratedOg);

  mkdirSync(ogDir, { recursive: true });

  const expectedRel = new Set(posts.map(p => ogFileRelPath(p.slug)));
  const existing = readdirSync(ogDir, { recursive: true }).map(p => String(p));
  const orphans = findOrphanPngs(existing, expectedRel);
  for (const orphan of orphans) {
    rmSync(join(ogDir, orphan));
  }

  const manifest = readManifest(manifestPath);
  const nextManifest: Record<string, string> = {};
  let rendered = 0;
  let skipped = 0;
  let fonts: SatoriOptions['fonts'] | null = null;

  for (const post of posts) {
    const hash = ogContentHash(
      post,
      ctx.content.config.site,
      ctx.content.config.og,
    );
    const file = join(ogDir, ogFileRelPath(post.slug));
    nextManifest[post.slug] = hash;
    if (manifest[post.slug] === hash && existsSync(file)) {
      skipped++;
      continue;
    }
    fonts ??= loadFonts();
    const png = await renderOgPng(
      post,
      fonts,
      ctx.content.config.site,
      ctx.content.config.og,
    );
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, png);
    rendered++;
  }

  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(nextManifest, null, 2));

  console.log(
    `✓ og-images: ${rendered} 생성, ${skipped} 스킵, ${orphans.length} 정리 (대상 ${posts.length}개)`,
  );
}
