import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { POSTS_PATH, type PostData } from '../post/index.ts';
import { isExternalUrl } from '../post/assetUrl.ts';
import { listFilesRecursive } from '../shared/postFiles.ts';
import { decodeUrlSafe } from '../shared/url.ts';
import { resolvePostSet } from './artifacts.ts';
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

/** `dir` 아래 미디어 파일(`/` 구분 상대 경로). 디렉터리가 없으면 빈 목록. */
function listMediaFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return listFilesRecursive(dir).filter(rel =>
    ALLOWED_EXTENSIONS.includes(posix.extname(rel).toLowerCase()),
  );
}

/** 복사할 미디어 판정(`/` 구분 상대 경로). `main`은 공개 글이 가리키는 것만 넘긴다. */
export type MediaFilter = (relPath: string) => boolean;

const includeAll: MediaFilter = () => true;

function pickMedia(media: readonly string[], include: MediaFilter) {
  const files = media.filter(include);
  return { files, excluded: media.length - files.length };
}

// ── 공개 글이 가리키는 미디어 ──────────────────────────────────────────────

/** 경로 토큰의 앞뒤 경계 — 경로·파일명을 이어 쓸 수 없는 문자면 무엇이든. 모르는 문장부호는 경계로 쳐서 덜 싣는 쪽으로 틀리지 않는다. */
const REF_BEFORE = /[^\p{L}\p{N}\p{M}_\-./~%]/u;
const REF_AFTER = /[^\p{L}\p{N}\p{M}_-]/u;

/** `needle`이 경로 토큰 하나로 등장하는가 — `includes`면 `img/start.png`가 `start.png`까지 끈다. */
function mentionsPath(text: string, needle: string): boolean {
  for (
    let at = text.indexOf(needle);
    at !== -1;
    at = text.indexOf(needle, at + 1)
  ) {
    const before = at === 0 ? '' : (text[at - 1] ?? '');
    const after = text[at + needle.length] ?? '';
    if (
      (before === '' || REF_BEFORE.test(before)) &&
      (after === '' || REF_AFTER.test(after))
    ) {
      return true;
    }
  }
  return false;
}

/** 퍼센트 인코딩을 푼다 — `img/a%20b.png`로 적은 참조가 디스크 이름과 맞도록. */
function decodePercentRuns(text: string): string {
  return text.replace(/(?:%[0-9A-Fa-f]{2})+/g, run => decodeUrlSafe(run));
}

/** frontmatter `thumbnail`이 가리키는 원고 폴더 기준 경로. 원고 밖이면 null. */
function thumbnailMediaPath(
  post: Pick<PostData, 'thumbnail' | 'relativeDir'>,
): string | null {
  const thumbnail = post.thumbnail;
  if (!thumbnail || isExternalUrl(thumbnail)) {
    return null;
  }
  if (thumbnail.startsWith('/')) {
    return thumbnail.startsWith(POSTS_PATH)
      ? decodeUrlSafe(thumbnail.slice(POSTS_PATH.length))
      : null;
  }
  return posix.normalize(posix.join(post.relativeDir, thumbnail));
}

/** 공개 글이 원고에서 가리키는 미디어만 고른다 — 문법 대신 경로 토큰으로 봐서, 틀려도 안 쓰는 파일 하나를 더 실을 뿐이다. */
export function selectPublishedMedia(
  posts: readonly Pick<PostData, 'relativeDir' | 'content' | 'thumbnail'>[],
  mediaRelPaths: readonly string[],
): Set<string> {
  const sources = posts.map(post => ({
    dir: post.relativeDir,
    text: decodePercentRuns(post.content).normalize('NFC'),
    thumbnail: thumbnailMediaPath(post)?.normalize('NFC') ?? null,
  }));
  const selected = new Set<string>();
  for (const rel of mediaRelPaths) {
    const target = rel.normalize('NFC');
    const base = posix.basename(target);
    const referenced = sources.some(({ dir, text, thumbnail }) => {
      if (thumbnail === target) return true;
      if (!text.includes(base)) return false;
      // 가짜 루트(`/`)를 붙인다 — posix.relative는 상대 인자를 cwd로 푼다.
      const fromDir = posix.relative(`/${dir}`, `/${target}`);
      const forms = [fromDir, `${POSTS_PATH}${target}`];
      if (!fromDir.startsWith('../')) forms.push(`./${fromDir}`);
      return forms.some(form => mentionsPath(text, form));
    });
    if (referenced) selected.add(rel);
  }
  return selected;
}

// ── 복사 ────────────────────────────────────────────────────────────────────

/** `include`가 거른 파일의 사본은 orphan으로 지운다. `media`는 `main`이 이미 훑은 목록. */
export function syncIncremental(
  sourceDir: string,
  targetDir: string,
  dryOrphan: boolean,
  include: MediaFilter = includeAll,
  media: readonly string[] = listMediaFiles(sourceDir),
): void {
  const { files, excluded } = pickMedia(media, include);
  const sourceRelSet = new Set(files);

  let copied = 0;
  let skipped = 0;
  let removed = 0;

  for (const rel of files) {
    const src = join(sourceDir, rel);
    const dst = join(targetDir, rel);

    let needsCopy = true;
    if (existsSync(dst)) {
      const srcStat = statSync(src);
      const dstStat = statSync(dst);
      if (dstStat.size === srcStat.size && dstStat.mtimeMs >= srcStat.mtimeMs) {
        needsCopy = false;
      }
    }

    if (needsCopy) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      copied++;
    } else {
      skipped++;
    }
  }

  for (const rel of listMediaFiles(targetDir)) {
    if (sourceRelSet.has(rel)) continue;
    if (dryOrphan) {
      console.log(`  [dry-orphan] would remove: ${rel}`);
    } else {
      console.log(`  [orphan] removing: ${rel}`);
      rmSync(join(targetDir, rel));
    }
    removed++;
  }

  const dryNote =
    dryOrphan && removed > 0 ? ' (dry-orphan: 실제 삭제 안 함)' : '';
  console.log(
    `Synced posts media: ${copied} copied, ${skipped} unchanged, ${removed} removed, ${excluded} not published${dryNote}`,
  );
}

export function syncFull(
  sourceDir: string,
  targetDir: string,
  include: MediaFilter = includeAll,
  media: readonly string[] = listMediaFiles(sourceDir),
): void {
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });
  const { files, excluded } = pickMedia(media, include);
  for (const rel of files) {
    const dst = join(targetDir, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(join(sourceDir, rel), dst);
  }
  console.log(
    `Full sync: ${files.length} files copied, ${excluded} not published`,
  );
}

export function main(
  ctx: ContentContext,
  opts: { force: boolean; dryOrphan: boolean },
): void {
  const { force, dryOrphan } = opts;
  const sourceDir = ctx.content.paths.postsDir;
  const targetDir = ctx.content.paths.mediaOutDir;

  console.log(`Syncing images from ${sourceDir} to ${targetDir}...`);

  const media = listMediaFiles(sourceDir);
  const published = selectPublishedMedia(
    resolvePostSet(ctx.content, 'visible'),
    media,
  );
  const include: MediaFilter = rel => published.has(rel);

  if (force || !existsSync(targetDir)) {
    syncFull(sourceDir, targetDir, include, media);
  } else {
    syncIncremental(sourceDir, targetDir, dryOrphan, include, media);
  }
}
