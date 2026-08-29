/**
 * 문서가 백틱으로 인용한 **파일 경로가 실제로 존재하는지** 검사합니다.
 *
 * 이 저장소의 문서 정확도는 성실성이 아니라 **잠금 여부**에 달려 있습니다.
 * `frontmatterSchema.test.ts`가 글자 단위로 잠그는 CLAUDE.md의 frontmatter 표는
 * 늘 정확한데, 잠기지 않은 산문은 리팩터 뒤 몇 라운드씩 뒤처집니다. 실제로
 * `eslint.config.mjs → .mts` 개명(81615ea) 사흘 뒤에도 문서 6곳이 옛 이름을
 * 붙들고 있었고, 그걸 발견한 것은 사람도 CI도 아니었습니다.
 *
 * 산문 전체를 잠글 수는 없지만 **경로만은 기계로 확인됩니다.** 경로가 틀린 문서는
 * 사람에게도 에이전트에게도 없는 파일을 열게 만들므로, 산문 중에서 가장 먼저
 * 잠글 값어치가 있는 부분입니다.
 *
 * ## 왜 이 테스트가 패키지에 있나
 * 앱(`apps/blog/web`)의 테스트 프로젝트는 `src/{shared,domain,lib}`만 node 환경으로
 * 돌리고, 문서 검사는 그 세 레이어 어디에도 속하지 않습니다. 반면 이 패키지의
 * 테스트는 이미 저장소 루트를 읽습니다 — `contract.test.ts`가 실제
 * `apps/blog/posts/`를, `frontmatterSchema.test.ts`가 루트 `CLAUDE.md`를 엽니다.
 * 패키지 **소스**는 사이트를 모르지만 패키지 **테스트**는 이 저장소 위에서 돕니다.
 *
 * ## 무엇을 검사하지 않나
 * 글롭(`**`·`{slug}`)·빌드 산출물(`out/`·`public/og/`)·패키지 이름은 건너뜁니다.
 * 파일이 아니라 패턴이거나, 빌드 전에는 존재하지 않기 때문입니다.
 */
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));

/**
 * 검사 대상 문서. 저장소의 구조를 서술하는 산문이 사는 곳 전부입니다.
 * 새 README를 만들면 여기 추가하세요.
 */
const DOCS = [
  'CLAUDE.md',
  'AGENTS.md',
  'README.md',
  'apps/blog/web/README.md',
  'apps/blog/web/src/shared/README.md',
  'apps/blog/web/design/DIAGRAM_AUTHORING.md',
  'packages/@blog/content/README.md',
] as const;

/**
 * `.github/`의 스크립트·워크플로도 경로를 인용합니다 — 문서가 아니라 코드지만,
 * **리팩터 때 열리지 않는 코드**라 산문과 같은 이유로 뒤처집니다.
 *
 * 실제로 `post-inventory-collect.py`는 판정 규칙의 출처를 두 곳에서 가리키는데
 * 둘 다 옛 경로였습니다. 이 PR이 13행을 고치고 40행을 놓쳤고, `.md`만 보던 검사는
 * 그걸 잡지 못했습니다 — 리뷰가 손으로 잡아 준 뒤에야 알았습니다.
 *
 * 앱·패키지 소스 주석은 대상이 아닙니다. 거기 있는 파일 인용 137건 중 죽은 것은
 * 0건인데, 코드와 함께 편집기에 열리기 때문입니다. 드리프트는 **같이 안 열리는
 * 파일**에 생깁니다.
 */
const CODE_PREFIXES = ['.github/scripts/', '.github/workflows/'] as const;
const CODE_EXT = /\.(py|ya?ml)$/;

/** 경로로 볼 확장자. 이 목록에 없는 것은 경로로 취급하지 않습니다. */
const PATH_EXT =
  /\.(ts|tsx|mts|cts|mjs|cjs|js|jsx|json|md|ya?ml|toml|css|sql)$/;

/**
 * 경로가 아니라 **패턴이거나 산출물**인 것들. 검사에서 뺍니다.
 *
 * - 글롭·플레이스홀더: `**`, `{slug}`, `[...slug]`, `<경로>`
 * - 빌드 산출물: 빌드 전에는 없습니다
 * - 상대 경로 표기: 문서가 자기 위치 기준으로 적은 것은 기준점이 모호합니다
 */
const isPattern = (p: string) =>
  /[*{}<>]/.test(p) ||
  p.includes('[') ||
  p.startsWith('.') ||
  p.startsWith('/') ||
  p.startsWith('@') ||
  p.startsWith('http');

/**
 * 빌드가 만드는 파일 — 검사에서 뺍니다.
 *
 * 이름 목록은 `apps/blog/web/.gitignore`의 "generated blog content artifacts" 절과
 * 같아야 합니다. 이것들은 **추적되지 않으므로 신선한 체크아웃에는 없습니다** —
 * 로컬에서만 있는 파일을 근거로 통과시키면 CI에서만 빨간불이 납니다.
 * CI 순서상 `quality-checks`는 `test`를 먼저 돌리고 `build`가 뒤에 오므로,
 * 테스트 시점에는 확실히 없습니다.
 */
const GENERATED_FILES = new Set([
  'rss.xml',
  'sitemap.xml',
  'search-index.json',
  'admin-posts-index.json',
  'llms-full.txt',
  'llms.txt',
]);

/** 경로 어디에든 이 구간이 있으면 빌드 산출물이다(`apps/blog/web/.next/cache`). */
const ARTIFACT_SEGMENT =
  /(^|\/)(out|node_modules|\.next|\.turbo|\.cache|\.temp|dist|coverage)(\/|$)/;

const isArtifact = (p: string) =>
  ARTIFACT_SEGMENT.test(p) ||
  p.startsWith('public/og/') ||
  p.startsWith('public/thumbs/') ||
  GENERATED_FILES.has(p) ||
  GENERATED_FILES.has(p.split('/').pop() ?? '');

/**
 * **일부러 검사하지 않는 인용과 그 사유.**
 *
 * 문서에 나오는 경로가 전부 "지금 존재하는 파일"인 것은 아닙니다. 이 저장소는
 * 없어진 것과 앞으로 만들 것을 산문에 적는 습관이 있고, 그건 고쳐야 할 드리프트가
 * 아니라 지켜야 할 기록입니다. 검사가 그것과 싸우지 않도록 사유를 적어 둡니다.
 * 새 예외를 더할 때는 반드시 사유를 함께 적으세요 — 사유 없는 예외가 쌓이면
 * 검사가 조용히 무력해집니다.
 */
const NOT_CHECKED: Readonly<Record<string, string>> = {
  'cliEntry.ts':
    '지워진 가드. 패키지 README가 "진입점이 하나가 되면서 사라졌다"고 과거를 기록한다',
  'src/components/diagram/MyDiagram.tsx':
    '다이어그램 저작 가이드의 예제 — "이 파일을 만든다"는 지시문이지 실재 파일이 아니다',
  'UserCard.tsx': 'AGENTS.md의 명명 규칙 예시',
  'next.js':
    '워크스페이스 이름(apps/next.js). 확장자처럼 보이지만 경로가 아니다',
};

/**
 * 확장자가 없어도 **저장소 경로가 분명한** 토큰.
 *
 * 파일뿐 아니라 폴더도 드리프트한다. `fbff1f2`가 레이어를 `src/` 안으로 옮긴 뒤
 * `AGENTS.md`가 `blog/web/domain`·`blog/web/lib`을 계속 가리키고 있었는데,
 * 확장자만 보던 첫 판은 이걸 통째로 놓쳤다. 워크스페이스 접두어로 시작하는
 * 토큰은 산문이 아니라 경로 주장이므로 검사한다.
 */
const REPO_PREFIX = /^(apps|packages|\.github|supabase|src)\//;

/**
 * 마지막 칸에 점이 있는데 아는 확장자가 아니면 경로가 아니다 —
 * `repository.incrementViewCount`처럼 모듈의 **멤버**를 가리키는 표기다.
 */
const isMemberRef = (t: string) => {
  const last = t.split('/').pop() ?? '';
  return last.includes('.') && !PATH_EXT.test(last);
};

const looksLikePath = (t: string) =>
  (PATH_EXT.test(t) || REPO_PREFIX.test(t)) && !isMemberRef(t);

/** 백틱 안의 토큰 중 파일·폴더 경로로 보이는 것. */
const pathsIn = (markdown: string): string[] => {
  const tokens = [...markdown.matchAll(/`([^`\n]+)`/g)]
    .map(m => m[1].trim())
    // 폴더를 가리키는 후행 슬래시는 벗기고 본다(`apps/blog/posts/`).
    .map(t => (t.endsWith('/') ? t.slice(0, -1) : t));
  return tokens.filter(
    t =>
      looksLikePath(t) &&
      !t.includes(' ') &&
      // `…content/src/scripts/check-seo.ts`처럼 앞을 줄인 표기는 경로가 아니라
      // 표를 좁히려고 쓴 축약이다(CLAUDE.md의 설정 파일 표).
      !t.startsWith('…') &&
      !(t in NOT_CHECKED) &&
      !isPattern(t) &&
      !isArtifact(t),
  );
};

/**
 * 저장소의 **추적되는** 파일 목록.
 *
 * 워킹 트리를 걷지 않고 `git ls-files`를 쓴다. "존재한다"의 기준을 CI가 보는 것과
 * 같게 맞추기 위해서다 — 로컬에는 빌드 산출물·무시된 파일이 널려 있어서, 트리를
 * 걸으면 신선한 체크아웃에는 없는 파일을 근거로 통과시킨다. 이 파일 자신이 검사하는
 * 문서 중 하나가 `search-index.json`을 인용하는데, 그건 `public/`에만 생기는
 * 무시된 산출물이라 정확히 그 함정에 걸렸다.
 *
 * 부수효과로 node_modules·dist·out·.next도 자동으로 빠진다.
 */
const ALL_FILES = execFileSync('git', ['ls-files'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})
  .split('\n')
  .filter(Boolean);

const TRACKED = new Set(ALL_FILES);

/**
 * 추적되는 파일 경로에서 유도한 **디렉터리** 집합.
 *
 * 문서는 파일뿐 아니라 폴더도 가리킨다(`apps/blog/posts`, `src/domain/analytics`).
 * `git ls-files`는 파일만 주므로 상위 경로를 직접 접어 만든다.
 */
const TRACKED_DIRS = new Set(
  ALL_FILES.flatMap(f => {
    const parts = f.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }),
);

const isTracked = (p: string) => TRACKED.has(p) || TRACKED_DIRS.has(p);

/**
 * 이 경로가 실제 파일을 가리키는지.
 *
 * 해석 순서가 셋입니다. 문서마다 기준점이 다르기 때문입니다.
 *   1. **문서 자신의 폴더 기준** — 패키지 README는 `src/scripts/cli/program.ts`처럼
 *      자기 위치에서 적습니다.
 *   2. **저장소 루트 기준** — 루트 CLAUDE.md는 `apps/blog/web/...`처럼 적습니다.
 *   3. **경로 끝 일치, 단 블로그 스택 안에서만** — 위 둘로 안 잡히면 저장소의 어떤
 *      파일이 이 경로로 끝나는지 봅니다. `repository.ts`·`eslint.config.mts`처럼
 *      파일명만 인용한 자리가 여기서 걸립니다.
 *
 *      범위를 좁히는 것이 핵심입니다. 저장소 전체를 뒤지면 실험 앱에 우연히 같은
 *      이름이 있다는 이유로 통과합니다 — 실제로 `apps/next.js/eslint.config.mjs`가
 *      있어서, 범위를 안 좁혔을 때는 문서가 `eslint.config.mjs`라고 잘못 적어도
 *      검사가 조용히 통과했습니다(이 테스트가 막으려던 바로 그 사고인데도).
 *      이 문서들이 파일명만으로 가리키는 대상은 언제나 블로그 스택입니다.
 *      실험 앱 파일은 항상 `apps/react/...`처럼 전체 경로로 인용되므로 2단계에서
 *      해결됩니다.
 */
const BARE_NAME_SCOPE = [
  'apps/blog',
  'packages/@blog',
  'packages/@design-system',
  '.github',
] as const;

const inScope = (file: string) =>
  !file.includes('/') || BARE_NAME_SCOPE.some(s => file.startsWith(`${s}/`));

/** 확장자를 안 적은 모듈 참조(`src/lib/platform/adminApi`)까지 후보로 넓힌다. */
const CANDIDATE_EXT = ['', '.ts', '.tsx', '.mts', '.mjs'];

const suffixHit = (p: string) =>
  CANDIDATE_EXT.some(ext => {
    const q = p + ext;
    if (TRACKED_DIRS.has(q)) return true;
    return (
      ALL_FILES.some(f => inScope(f) && f.endsWith(`/${q}`)) ||
      [...TRACKED_DIRS].some(d => inScope(d) && d.endsWith(`/${q}`))
    );
  });

const resolvesToFile = (docDir: string, p: string): boolean => {
  if (isTracked(normalize(join(docDir, p)))) return true;
  if (isTracked(p)) return true;
  return suffixHit(p);
};

/**
 * 코드 파일에서 저장소 경로로 보이는 토큰을 뽑습니다.
 *
 * 백틱이 아니라 **모양**으로 찾습니다 — YAML에는 인라인 코드 표기가 없고, 파이썬
 * 주석도 그냥 평문으로 적습니다. 대신 `apps/`·`packages/`로 시작하는 것만 봅니다.
 */
const CODE_PATH = /(apps|packages)\/[A-Za-z0-9@_.-]+(?:\/[A-Za-z0-9@_.-]+)*/g;

const pathsInCode = (source: string): string[] =>
  [...source.matchAll(CODE_PATH)]
    .map(m => m[0])
    // 문장 끝의 마침표·슬래시를 벗긴다(`… pooler-url.`, `apps/blog/`).
    .map(t => t.replace(/[./]+$/, ''))
    .filter(t => !isPattern(t) && !isArtifact(t) && !(t in NOT_CHECKED));

const CODE_FILES = ALL_FILES.filter(
  f => CODE_PREFIXES.some(prefix => f.startsWith(prefix)) && CODE_EXT.test(f),
);

describe('문서가 인용한 파일 경로', () => {
  test.each(DOCS)('%s의 경로가 전부 존재한다', async doc => {
    const markdown = await readFile(resolve(REPO_ROOT, doc), 'utf8');
    const docDir = dirname(doc);
    const missing = [...new Set(pathsIn(markdown))].filter(
      p => !resolvesToFile(docDir, p),
    );
    // 실패 메시지에 없는 경로가 그대로 나오도록 배열째 비교합니다.
    expect(missing).toEqual([]);
  });

  test('검사 대상 문서가 전부 존재한다', () => {
    const missing = DOCS.filter(d => !existsSync(resolve(REPO_ROOT, d)));
    expect(missing).toEqual([]);
  });

  test.each(CODE_FILES)('%s의 경로가 전부 존재한다', async file => {
    const source = await readFile(resolve(REPO_ROOT, file), 'utf8');
    const missing = [...new Set(pathsInCode(source))].filter(
      p => !resolvesToFile(dirname(file), p),
    );
    expect(missing).toEqual([]);
  });

  test('검사 대상 코드 파일이 비어 있지 않다 (양성 대조)', () => {
    // CODE_PREFIXES가 오타로 아무것도 안 잡으면 검사가 조용히 죽는다.
    expect(CODE_FILES.length).toBeGreaterThan(3);
  });

  test('검사가 실제로 경로를 걷어낸다 (양성 대조)', async () => {
    // 필터가 과해져 아무것도 안 보는 상태로 조용히 죽는 것을 막습니다 —
    // 이 저장소가 무음 no-op을 최악으로 보는 것과 같은 이유입니다.
    const markdown = await readFile(resolve(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(pathsIn(markdown).length).toBeGreaterThan(20);
  });
});
