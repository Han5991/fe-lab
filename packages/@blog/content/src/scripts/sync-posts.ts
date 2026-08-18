import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
// 경로는 설정(defineContent → contentPaths)의 단일 출처에서 온다.
import { CONTENT_PATHS } from '../shared/contentPaths.ts';

// 테스트가 경로 배선을 검증할 수 있게 export한다 (sync-posts.test.ts).
export const POSTS_SOURCE_DIR = CONTENT_PATHS.postsDir;
export const POSTS_TARGET_DIR = CONTENT_PATHS.mediaOutDir;

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
function syncIncremental(dryOrphan: boolean): void {
  const sourceFiles = listMediaFiles(POSTS_SOURCE_DIR);
  const sourceRelSet = new Set(
    sourceFiles.map(f => relative(POSTS_SOURCE_DIR, f.full)),
  );

  let copied = 0;
  let skipped = 0;
  let removed = 0;

  for (const src of sourceFiles) {
    const rel = relative(POSTS_SOURCE_DIR, src.full);
    const dst = join(POSTS_TARGET_DIR, rel);

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

  if (existsSync(POSTS_TARGET_DIR)) {
    const targetFiles = listMediaFiles(POSTS_TARGET_DIR);
    for (const t of targetFiles) {
      const rel = relative(POSTS_TARGET_DIR, t.full);
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

function syncFull(): void {
  if (existsSync(POSTS_TARGET_DIR)) {
    rmSync(POSTS_TARGET_DIR, { recursive: true, force: true });
  }
  mkdirSync(POSTS_TARGET_DIR, { recursive: true });
  const sourceFiles = listMediaFiles(POSTS_SOURCE_DIR);
  for (const src of sourceFiles) {
    const rel = relative(POSTS_SOURCE_DIR, src.full);
    const dst = join(POSTS_TARGET_DIR, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src.full, dst);
  }
  console.log(`Full sync: ${sourceFiles.length} files copied`);
}

export function main(argv: string[]): void {
  const force = argv.includes('--force');
  const dryOrphan = argv.includes('--dry-orphan');

  console.log(
    `Syncing images from ${POSTS_SOURCE_DIR} to ${POSTS_TARGET_DIR}...`,
  );

  if (force || !existsSync(POSTS_TARGET_DIR)) {
    syncFull();
  } else {
    syncIncremental(dryOrphan);
  }
}
