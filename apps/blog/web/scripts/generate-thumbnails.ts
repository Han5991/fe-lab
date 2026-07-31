import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { getAllPosts } from '../domain/post/service';
import { thumbnailWebpRelPath } from '../domain/post/thumbnail';
import type { PostData } from '../domain/post/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const POSTS_SOURCE_DIR = resolve(ROOT, '..', 'posts');

/**
 * 생성물은 public/posts/가 아니라 public/thumbs/에 둡니다.
 *
 * sync-posts.mjs는 public/posts/ 안에서 posts/에 원본이 없는 미디어를 orphan으로
 * 삭제하고(.webp도 대상), build-content의 phase 2에서 두 단계가 병렬로 돌기 때문에
 * 같은 디렉터리를 쓰면 생성물이 지워질 수 있습니다. 디렉터리를 분리해 서로의
 * 산출물에 손대지 않도록 합니다.
 */
const THUMBS_DIR = join(ROOT, 'public', 'thumbs');
const MANIFEST_PATH = join(ROOT, '.cache', 'thumbnails.json');

/** 표시 최대 폭(FeaturedPost가 컨테이너 전체 폭). 이보다 작은 원본은 확대하지 않습니다. */
export const MAX_WIDTH = 1200;
export const WEBP_QUALITY = 80;

/** 인코딩 정책을 바꾸면 올려서 전체 재생성하게 합니다. */
export const ENCODE_VERSION = 1;

export interface ThumbnailTask {
  /** posts/ 기준 원본 상대 경로 */
  sourceRel: string;
  /** public/thumbs/ 기준 출력 상대 경로 */
  outputRel: string;
}

/**
 * 발행 글 목록에서 변환 대상을 뽑습니다. thumbnail이 posts/ 안의 png/jpg를
 * 가리키는 글만 대상이고, /og/* 생성 카드와 외부 URL은 제외됩니다.
 */
export function collectTasks(
  posts: Pick<PostData, 'thumbnail' | 'relativeDir'>[],
): ThumbnailTask[] {
  const tasks = new Map<string, ThumbnailTask>();
  for (const post of posts) {
    const outputRel = thumbnailWebpRelPath(post);
    if (!outputRel) continue;
    const sourceRel = post.relativeDir
      ? `${post.relativeDir}/${post.thumbnail}`
      : String(post.thumbnail);
    // 같은 이미지를 여러 글이 쓰면 한 번만 변환합니다.
    tasks.set(outputRel, { sourceRel, outputRel });
  }
  return [...tasks.values()];
}

/** 원본 바이트 + 인코딩 정책으로 계산 — 둘 다 그대로면 재인코딩을 skip합니다. */
export function thumbnailContentHash(sourceBytes: Buffer): string {
  return createHash('sha1')
    .update(`v${ENCODE_VERSION}:${MAX_WIDTH}:${WEBP_QUALITY}:`)
    .update(sourceBytes)
    .digest('hex');
}

/** 기대 목록에 없는 webp = 삭제/이름변경/썸네일 교체된 글의 잔여물 */
export function findOrphanWebps(
  existingRelPaths: string[],
  expectedRelPaths: Set<string>,
): string[] {
  return existingRelPaths.filter(
    p => p.endsWith('.webp') && !expectedRelPaths.has(p),
  );
}

export async function encodeWebp(sourcePath: string): Promise<Buffer> {
  return sharp(sourcePath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
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

function listExistingWebps(): string[] {
  if (!existsSync(THUMBS_DIR)) return [];
  // readdirSync는 OS 구분자를 쓰지만 outputRel은 항상 '/'로 조립되므로,
  // Windows에서 모든 파일이 orphan으로 오판되지 않도록 정규화해서 비교합니다.
  return readdirSync(THUMBS_DIR, { recursive: true }).map(p =>
    String(p).split(sep).join('/'),
  );
}

async function main() {
  const tasks = collectTasks(getAllPosts());
  mkdirSync(THUMBS_DIR, { recursive: true });

  const expectedRel = new Set(tasks.map(t => t.outputRel));
  const orphans = findOrphanWebps(listExistingWebps(), expectedRel);
  for (const orphan of orphans) {
    rmSync(join(THUMBS_DIR, orphan));
  }

  const manifest = readManifest();
  const nextManifest: Record<string, string> = {};
  let encoded = 0;
  let skipped = 0;
  let savedBytes = 0;
  const missing: string[] = [];

  for (const task of tasks) {
    const sourcePath = join(POSTS_SOURCE_DIR, task.sourceRel);
    if (!existsSync(sourcePath)) {
      // 존재하지 않는 썸네일은 validate-posts가 broken-image로 잡습니다.
      // 여기서는 빌드를 막지 않고 건너뛰고, 목록만 보고합니다.
      missing.push(task.sourceRel);
      continue;
    }
    const sourceBytes = readFileSync(sourcePath);
    const hash = thumbnailContentHash(sourceBytes);
    const outPath = join(THUMBS_DIR, task.outputRel);
    nextManifest[task.outputRel] = hash;

    if (manifest[task.outputRel] === hash && existsSync(outPath)) {
      skipped++;
      continue;
    }

    const webp = await encodeWebp(sourcePath);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, webp);
    savedBytes += sourceBytes.length - webp.length;
    encoded++;
  }

  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(nextManifest, null, 2));

  const savedKb = Math.round(savedBytes / 1024);
  console.log(
    `✓ thumbnails: ${encoded} 생성, ${skipped} 스킵, ${orphans.length} 정리` +
      ` (대상 ${tasks.length}개, 이번 실행 절감 ${savedKb}KB)`,
  );
  if (missing.length > 0) {
    console.warn(
      `  ⚠ 원본이 없어 건너뛴 썸네일 ${missing.length}개: ${missing.join(', ')}`,
    );
  }
}

// 스크립트로 직접 실행될 때만 main()을 호출합니다.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
