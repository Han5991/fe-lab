import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, sep } from 'node:path';
import sharp from 'sharp';
import { resolvePostSet } from '../artifacts.ts';
import { thumbnailWebpRelPath } from '../../post/thumbnail.ts';
import type { PostData } from '../../post/types.ts';
import {
  DEFAULT_THUMBNAILS,
  type ThumbnailsConfig,
} from '../../shared/contentConfig.ts';
import type { ContentContext } from '../context.ts';

/** 인코딩 정책을 바꾸면 올려서 전체 재생성하게 합니다. */
const ENCODE_VERSION = 1;

interface ThumbnailTask {
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
export function thumbnailContentHash(
  sourceBytes: Buffer,
  thumbs: ThumbnailsConfig = DEFAULT_THUMBNAILS,
): string {
  return createHash('sha1')
    .update(`v${ENCODE_VERSION}:${thumbs.maxWidth}:${thumbs.webpQuality}:`)
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

async function encodeWebp(
  sourcePath: string,
  thumbs: ThumbnailsConfig,
): Promise<Buffer> {
  return sharp(sourcePath)
    .resize({ width: thumbs.maxWidth, withoutEnlargement: true })
    .webp({ quality: thumbs.webpQuality })
    .toBuffer();
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

function listExistingWebps(thumbsDir: string): string[] {
  if (!existsSync(thumbsDir)) return [];
  // readdirSync는 OS 구분자를 쓰지만 outputRel은 항상 '/'로 조립되므로,
  // Windows에서 모든 파일이 orphan으로 오판되지 않도록 정규화해서 비교합니다.
  return readdirSync(thumbsDir, { recursive: true }).map(p =>
    String(p).split(sep).join('/'),
  );
}

export async function main(ctx: ContentContext) {
  /**
   * 생성물은 public/posts/(media)가 아니라 public/thumbs/에 둡니다.
   * sync-posts.ts는 media 디렉터리 안에서 orphan을 삭제하고(.webp도 대상),
   * build-content의 phase 2에서 두 단계가 병렬로 돌기 때문에 같은 디렉터리를
   * 쓰면 생성물이 지워질 수 있습니다. 두 디렉터리가 서로 배타인지는
   * defineContent가 검증합니다(assertOutputDirsExclusive).
   */
  const postsDir = ctx.paths.postsDir;
  const thumbsDir = ctx.paths.thumbsOutDir;
  const manifestPath = join(ctx.paths.cacheDir, 'thumbnails.json');
  const thumbsConfig = ctx.config.thumbnails;
  // thumbs는 파일명에서 글을 되돌릴 수 없어 레지스트리 대조 대상이 아니지만,
  // 글 집합 선택만은 레지스트리의 셀렉터(resolvePostSet)를 같이 쓴다.
  const tasks = collectTasks(resolvePostSet(ctx.content, 'visible'));
  mkdirSync(thumbsDir, { recursive: true });

  const expectedRel = new Set(tasks.map(t => t.outputRel));
  const orphans = findOrphanWebps(listExistingWebps(thumbsDir), expectedRel);
  for (const orphan of orphans) {
    rmSync(join(thumbsDir, orphan));
  }

  const manifest = readManifest(manifestPath);
  const nextManifest: Record<string, string> = {};
  let encoded = 0;
  let skipped = 0;
  let savedBytes = 0;
  const missing: string[] = [];

  for (const task of tasks) {
    const sourcePath = join(postsDir, task.sourceRel);
    if (!existsSync(sourcePath)) {
      // 존재하지 않는 썸네일은 validate-posts가 broken-image로 잡습니다.
      // 여기서는 빌드를 막지 않고 건너뛰고, 목록만 보고합니다.
      missing.push(task.sourceRel);
      continue;
    }
    const sourceBytes = readFileSync(sourcePath);
    const hash = thumbnailContentHash(sourceBytes, thumbsConfig);
    const outPath = join(thumbsDir, task.outputRel);
    nextManifest[task.outputRel] = hash;

    if (manifest[task.outputRel] === hash && existsSync(outPath)) {
      skipped++;
      continue;
    }

    const webp = await encodeWebp(sourcePath, thumbsConfig);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, webp);
    savedBytes += sourceBytes.length - webp.length;
    encoded++;
  }

  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(nextManifest, null, 2));

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
