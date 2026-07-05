import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import satori, { type SatoriOptions } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getAllPosts } from '../domain/post/service';
import { fmtDate } from '../lib/format';
import { SITE_NAME, SITE_URL } from '../lib/constants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OG_DIR = join(ROOT, 'public', 'og');
const MANIFEST_PATH = join(ROOT, '.cache', 'og-images.json');
const FONT_DIR = join(
  ROOT,
  'node_modules',
  'pretendard',
  'dist',
  'public',
  'static',
);

/** 템플릿 디자인을 바꾸면 올려서 모든 이미지를 재생성하게 합니다. */
export const TEMPLATE_VERSION = 3;

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgPostInput {
  slug: string;
  title: string;
  date: string | null;
  series?: string;
}

/** 이미지에 들어가는 입력만으로 계산 — 입력이 같으면 재렌더링을 skip합니다. */
export function ogContentHash(post: OgPostInput): string {
  return createHash('sha1')
    .update(
      JSON.stringify({
        v: TEMPLATE_VERSION,
        title: post.title,
        date: post.date,
        series: post.series ?? null,
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
export function needsGeneratedOg(post: { thumbnail?: string }): boolean {
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
  props: { style?: Record<string, unknown>; children?: OgNode[] | string };
}

function el(
  type: string,
  style: Record<string, unknown>,
  children?: OgNode[] | string,
): OgNode {
  return { type, props: { style, children } };
}

// GitHub 다크 토큰의 hex 값 (resvg는 oklch 미지원)
const PAPER = '#0D1117'; // paper.50 (root bg)
const INK = '#F0F6FC'; // ink.950 (heading/brand)
const INK_META = '#8B949E'; // ink.600 (meta)
const INK_RULE = '#30363D'; // ink.border (rule/dot)
const ACCENT = '#58A6FF'; // accent.600 (github blue)

/**
 * 1200×630 OG 카드 satori 엘리먼트 트리.
 * 디자인: 블로그 지면과 같은 paper 톤 + 중앙 정렬 구성(카드 썸네일로
 * 축소돼도 좌우 균형 유지) + 상하 룰. 시리즈 pill / 날짜·도메인 푸터.
 */
export function ogTemplate(post: OgPostInput): OgNode {
  const title = displayTitle(post.title, post.series);

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
      SITE_NAME,
    ),
  ]);

  const headline: OgNode[] = [];
  if (post.series) {
    headline.push(
      el(
        'div',
        {
          display: 'flex',
          border: '2px solid rgba(88, 166, 255, 0.4)',
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
      fmtDate(post.date?.slice(0, 10)),
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
      SITE_URL.replace('https://', ''),
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

export function loadFonts(fontDir = FONT_DIR): SatoriOptions['fonts'] {
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
): Promise<Buffer> {
  const svg = await satori(
    ogTemplate(post) as unknown as Parameters<typeof satori>[0],
    { width: OG_WIDTH, height: OG_HEIGHT, fonts },
  );
  return Buffer.from(new Resvg(svg).render().asPng());
}

function readManifest(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // 없거나 깨진 manifest는 전체 재생성으로 처리
  }
  return {};
}

async function main() {
  // 외부/직접 썸네일이 명시된 글은 제외, 없거나 /og/*를 가리키는 글만 생성
  const posts = getAllPosts().filter(needsGeneratedOg);

  mkdirSync(OG_DIR, { recursive: true });

  const expectedRel = new Set(posts.map(p => ogFileRelPath(p.slug)));
  const existing = readdirSync(OG_DIR, { recursive: true }).map(p => String(p));
  const orphans = findOrphanPngs(existing, expectedRel);
  for (const orphan of orphans) {
    rmSync(join(OG_DIR, orphan));
  }

  const manifest = readManifest();
  const nextManifest: Record<string, string> = {};
  let rendered = 0;
  let skipped = 0;
  let fonts: SatoriOptions['fonts'] | null = null;

  for (const post of posts) {
    const hash = ogContentHash(post);
    const file = join(OG_DIR, ogFileRelPath(post.slug));
    nextManifest[post.slug] = hash;
    if (manifest[post.slug] === hash && existsSync(file)) {
      skipped++;
      continue;
    }
    fonts ??= loadFonts();
    const png = await renderOgPng(post, fonts);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, png);
    rendered++;
  }

  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(nextManifest, null, 2));

  console.log(
    `✓ og-images: ${rendered} 생성, ${skipped} 스킵, ${orphans.length} 정리 (대상 ${posts.length}개)`,
  );
}

// 스크립트로 직접 실행될 때만 main()을 호출합니다.
// (테스트 등에서 import할 때 main()이 자동 실행되는 것을 방지)
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
