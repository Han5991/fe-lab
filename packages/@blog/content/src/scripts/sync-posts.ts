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

/**
 * 복사할 미디어 판정. 인자는 `/` 구분 상대 경로다. 없으면 전부 복사한다(단위
 * 테스트·`main` 밖 호출용 — `main`은 항상 공개 글 기준으로 넘긴다).
 */
export type MediaFilter = (relPath: string) => boolean;

const includeAll: MediaFilter = () => true;

/** 복사할 미디어와 걸러진 개수 — 두 동기화 방식이 같은 규칙으로 고른다. */
function pickMedia(media: readonly string[], include: MediaFilter) {
  const files = media.filter(include);
  return { files, excluded: media.length - files.length };
}

// ── 공개 글이 가리키는 미디어 ──────────────────────────────────────────────

/** 참조 바로 **앞**에 올 수 있는 글자 — 링크·속성·목록 구분자. */
const REF_BEFORE = /[\s("'<=[,]/;
/** 참조 바로 **뒤**에 올 수 있는 글자 — 닫는 괄호·따옴표·쿼리·해시·구분자. */
const REF_AFTER = /[\s)"'>?#,]/;

/**
 * `text`에 `needle`이 **경로 토큰 하나로** 등장하는가.
 *
 * 그냥 `includes`로 보면 `img/start.png`가 같은 폴더의 `start.png`까지 끌어온다
 * (다른 파일의 꼬리). 앞뒤 글자가 링크·속성의 경계일 때만 참조로 본다.
 */
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

/**
 * 원고 속 퍼센트 인코딩을 풀어 둔다 — `img/a%20b.png`로 적은 참조가 디스크의
 * `img/a b.png`와 맞도록. 잘못된 시퀀스는 원문 그대로 둔다(`decodeUrlSafe`).
 */
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

/**
 * **공개 대상 글이 원고에서 가리키는 미디어**만 고른다 — `public/posts/`에
 * 복사해도 되는 파일 목록.
 *
 * 예전에는 원고 폴더의 미디어를 전부 복사했다. 그러면 draft·예약 글(과 기획
 * 노트)의 이미지가 추측 가능한 경로(`/posts/<폴더>/<파일>`)로 **배포 전에
 * 공개**된다. 글 집합은 다른 생성기와 같은 `visible` 셀렉터다 — dev 서버에서
 * draft를 보여 주는 판정(`isDevelopment`)도 그 셀렉터 안의 한 곳뿐이라, 여기서
 * 따로 dev를 가리지 않는다. 그래서 dev 서버가 draft의 이미지까지 보여 주려면
 * 이 단계도 `NODE_ENV=development`로 돌아야 한다(앱의 `predev:web`) — 그 값이
 * 없으면 og 카드·썸네일과 마찬가지로 발행 글 몫만 만든다.
 *
 * 참조 판정은 문법을 파싱하지 않고 **경로가 토큰으로 등장하는가**로 한다.
 * 마크다운 `![](…)`·HTML `<img src>`·`<video poster>`·참조 정의·`srcset`을
 * 전부 따로 파싱하면 하나를 빠뜨리는 순간 발행 글의 이미지가 404가 된다 —
 * 실패 방향이 나쁘다. 경로 토큰으로 보면 문법이 늘어도 그대로 잡히고, 틀리는
 * 방향은 "안 쓰는 파일을 하나 더 싣는 것"이다. 인정하는 표기는 글 폴더 기준
 * 상대 경로(`img/a.png`·`./img/a.png`·`../a.png`)와 사이트 경로
 * (`/posts/<폴더>/a.png`), 퍼센트 인코딩 여부 무관이다 — `resolvePostAssetUrl`이
 * 렌더에서 푸는 표기와 같다. `thumbnail`은 frontmatter에서 따로 본다(OG·JSON-LD가
 * 원본 경로를 절대 URL로 쓴다).
 *
 * @param mediaRelPaths 원고 폴더 기준 미디어 경로(`/` 구분)
 */
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
      // 가짜 루트(`/`)를 붙여 푼다 — posix.relative는 상대 인자를 cwd로 풀어서,
      // 그대로 넘기면 결과가 실행 위치에 따라 달라질 수 있다.
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

/**
 * @param dryOrphan orphan을 지우지 않고 목록만 출력한다
 * @param include   복사할 파일 판정 — 걸러진 파일은 사본이 있으면 orphan으로 지운다
 * @param media     원고 미디어 목록 — `main`이 이미 훑은 것을 넘긴다
 */
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

  // 다른 생성기(sitemap·og·thumbnails…)와 같은 셀렉터 — 공개 글 집합이 한 곳에서 정해진다.
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
