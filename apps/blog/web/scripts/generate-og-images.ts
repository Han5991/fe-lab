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
export const TEMPLATE_VERSION = 1;

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

/** 긴 한글 제목이 3줄을 넘지 않도록 글자수 기준으로 폰트 크기를 줄입니다. */
export function titleFontSize(title: string): number {
  return title.length > 40 ? 56 : 64;
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

/**
 * 1200×630 OG 카드 satori 엘리먼트 트리.
 * 디자인: 다크 네이비 그라데이션 + 좌측 액센트 바(블로그의 accentLeft 모티프),
 * 시리즈 pill / 제목 / 날짜·도메인 푸터.
 */
export function ogTemplate(post: OgPostInput): OgNode {
  const accentBar = el('div', {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 12,
    backgroundImage: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
  });

  const brand = el('div', { display: 'flex', alignItems: 'center', gap: 14 }, [
    el('div', {
      width: 18,
      height: 18,
      borderRadius: 5,
      backgroundColor: '#3B82F6',
    }),
    el('div', { fontSize: 30, fontWeight: 500, color: '#CBD5E1' }, SITE_NAME),
  ]);

  const headline: OgNode[] = [];
  if (post.series) {
    headline.push(
      el(
        'div',
        {
          display: 'flex',
          alignSelf: 'flex-start',
          border: '2px solid rgba(59, 130, 246, 0.55)',
          borderRadius: 9999,
          padding: '8px 24px',
          fontSize: 26,
          fontWeight: 500,
          color: '#93C5FD',
        },
        post.series,
      ),
    );
  }
  headline.push(
    el(
      'div',
      {
        fontSize: titleFontSize(post.title),
        fontWeight: 700,
        color: '#F8FAFC',
        lineHeight: 1.3,
        letterSpacing: -1,
        lineClamp: 3,
      },
      post.title,
    ),
  );

  const footer = el(
    'div',
    {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    [
      el(
        'div',
        { fontSize: 26, fontWeight: 500, color: '#94A3B8' },
        fmtDate(post.date?.slice(0, 10)),
      ),
      el(
        'div',
        { fontSize: 26, fontWeight: 500, color: '#64748B' },
        SITE_URL.replace('https://', ''),
      ),
    ],
  );

  return el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      position: 'relative',
      backgroundImage:
        'linear-gradient(135deg, #020617 0%, #0B1B36 60%, #12275B 100%)',
    },
    [
      accentBar,
      el(
        'div',
        {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px 56px 88px',
        },
        [
          brand,
          el(
            'div',
            { display: 'flex', flexDirection: 'column', gap: 28 },
            headline,
          ),
          footer,
        ],
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
  // 썸네일이 명시된 글은 그 이미지를 쓰므로 없는 글만 생성 대상
  const posts = getAllPosts().filter(post => !post.thumbnail);

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
