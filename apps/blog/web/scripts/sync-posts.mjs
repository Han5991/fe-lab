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
// .ts import 때문에 이 파일은 tsx로 실행해야 한다(build-content.ts 참고).
import { CONTENT_PATHS } from '../lib/shared/contentPaths.ts';

const POSTS_SOURCE_DIR = CONTENT_PATHS.postsDir;
const POSTS_TARGET_DIR = CONTENT_PATHS.mediaOutDir;

const ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.mp4',
];

const FORCE = process.argv.includes('--force');
/** --dry-orphan: orphan 파일을 실제로 삭제하지 않고 목록만 출력합니다 */
const DRY_ORPHAN = process.argv.includes('--dry-orphan');

function listMediaFiles(dir, results = []) {
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

function syncIncremental() {
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
        if (DRY_ORPHAN) {
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
    DRY_ORPHAN && removed > 0 ? ' (dry-orphan: 실제 삭제 안 함)' : '';
  console.log(
    `Synced posts media: ${copied} copied, ${skipped} unchanged, ${removed} removed${dryNote}`,
  );
}

function syncFull() {
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

console.log(
  `Syncing images from ${POSTS_SOURCE_DIR} to ${POSTS_TARGET_DIR}...`,
);

try {
  if (FORCE || !existsSync(POSTS_TARGET_DIR)) {
    syncFull();
  } else {
    syncIncremental();
  }
} catch (error) {
  console.error('Failed to sync images:', error);
  process.exit(1);
}
