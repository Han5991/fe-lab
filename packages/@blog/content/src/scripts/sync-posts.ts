import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
// 경로는 컨텍스트(ContentContext.paths — content.config.ts에 앵커)에서 온다.
import type { ContentContext } from './context.ts';

const ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.mp4',
];

interface MediaFile {
  full: string;
  mtimeMs: number;
  size: number;
}

function listMediaFiles(dir: string, results: MediaFile[] = []): MediaFile[] {
  if (!existsSync(dir)) return results;
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      listMediaFiles(full, results);
      continue;
    }
    if (ALLOWED_EXTENSIONS.includes(extname(item).toLowerCase())) {
      results.push({ full, mtimeMs: stat.mtimeMs, size: stat.size });
    }
  }
  return results;
}

/** @param dryOrphan orphan을 지우지 않고 목록만 출력한다 */
export function syncIncremental(
  sourceDir: string,
  targetDir: string,
  dryOrphan: boolean,
): void {
  const sourceFiles = listMediaFiles(sourceDir);
  const sourceRelSet = new Set(
    sourceFiles.map(f => relative(sourceDir, f.full)),
  );

  let copied = 0;
  let skipped = 0;
  let removed = 0;

  for (const src of sourceFiles) {
    const rel = relative(sourceDir, src.full);
    const dst = join(targetDir, rel);

    let needsCopy = true;
    if (existsSync(dst)) {
      const dstStat = statSync(dst);
      if (dstStat.size === src.size && dstStat.mtimeMs >= src.mtimeMs) {
        needsCopy = false;
      }
    }

    if (needsCopy) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src.full, dst);
      copied++;
    } else {
      skipped++;
    }
  }

  if (existsSync(targetDir)) {
    const targetFiles = listMediaFiles(targetDir);
    for (const t of targetFiles) {
      const rel = relative(targetDir, t.full);
      if (!sourceRelSet.has(rel)) {
        if (dryOrphan) {
          console.log(`  [dry-orphan] would remove: ${rel}`);
        } else {
          console.log(`  [orphan] removing: ${rel}`);
          rmSync(t.full);
        }
        removed++;
      }
    }
  }

  const dryNote =
    dryOrphan && removed > 0 ? ' (dry-orphan: 실제 삭제 안 함)' : '';
  console.log(
    `Synced posts media: ${copied} copied, ${skipped} unchanged, ${removed} removed${dryNote}`,
  );
}

export function syncFull(sourceDir: string, targetDir: string): void {
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });
  const sourceFiles = listMediaFiles(sourceDir);
  for (const src of sourceFiles) {
    const rel = relative(sourceDir, src.full);
    const dst = join(targetDir, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src.full, dst);
  }
  console.log(`Full sync: ${sourceFiles.length} files copied`);
}

export function main(
  ctx: ContentContext,
  opts: { force: boolean; dryOrphan: boolean },
): void {
  const { force, dryOrphan } = opts;
  const sourceDir = ctx.paths.postsDir;
  const targetDir = ctx.paths.mediaOutDir;

  console.log(`Syncing images from ${sourceDir} to ${targetDir}...`);

  if (force || !existsSync(targetDir)) {
    syncFull(sourceDir, targetDir);
  } else {
    syncIncremental(sourceDir, targetDir, dryOrphan);
  }
}
