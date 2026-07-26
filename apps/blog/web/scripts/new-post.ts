import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const POSTS_DIR = resolve(process.cwd(), '..', 'posts');

export interface Options {
  title?: string;
  series?: string;
  status: 'draft' | 'published' | 'scheduled';
  scheduledDate?: string;
  slug?: string;
  tags: string[];
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = { status: 'draft', tags: [] };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      let key: string;
      let value: string;
      if (eq !== -1) {
        key = arg.slice(2, eq);
        value = arg.slice(eq + 1);
      } else {
        key = arg.slice(2);
        value = argv[++i] ?? '';
      }
      switch (key) {
        case 'title':
          opts.title = value;
          break;
        case 'series':
          opts.series = value;
          break;
        case 'status':
          if (
            value !== 'draft' &&
            value !== 'published' &&
            value !== 'scheduled'
          ) {
            throw new Error(
              `status는 draft|published|scheduled 중 하나여야 합니다.`,
            );
          }
          opts.status = value;
          break;
        case 'scheduled':
        case 'scheduledDate':
          opts.scheduledDate = value;
          opts.status = 'scheduled';
          break;
        case 'slug':
          opts.slug = value;
          break;
        case 'tags':
          opts.tags = value
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
          break;
        default:
          throw new Error(`알 수 없는 옵션: --${key}`);
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const value = argv[++i] ?? '';
      switch (key) {
        case 't':
          opts.title = value;
          break;
        case 's':
          opts.series = value;
          break;
        default:
          throw new Error(`알 수 없는 옵션: -${key}`);
      }
    } else {
      positional.push(arg);
    }
  }

  if (!opts.title && positional.length > 0) {
    opts.title = positional[0];
  }

  return opts;
}

export function todayKST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(now);
}

export function safeFilename(title: string): string {
  return title.replace(/[/\\\0]/g, '-').trim();
}

/**
 * 시리즈는 중첩 폴더(`회고/2024` 등)를 허용하므로 `/`는 그대로 두되,
 * 상위 경로 탈출(`..`)·빈 세그먼트·절대 경로는 거부해
 * posts/ 밖에 파일이 생기는 것을 막습니다.
 */
export function safeSeriesPath(series: string): string {
  const segments = series.split('/').map(s => s.trim());
  const valid = segments.every(
    s => s && s !== '.' && s !== '..' && !/[\\\0]/.test(s),
  );
  if (!valid) {
    throw new Error(`올바르지 않은 시리즈 이름입니다: ${series}`);
  }
  return segments.join('/');
}

/**
 * 포스트 파일의 최종 경로를 계산합니다.
 * 제목이 sanitize 후 비어 있으면(공백뿐인 제목 등) `.md` 숨김 파일이
 * 생기는 것을 막기 위해 에러를 던집니다.
 */
export function buildPostFilePath(
  postsDir: string,
  title: string,
  series?: string,
): string {
  const fileName = safeFilename(title);
  if (!fileName) {
    throw new Error('제목이 비어 있어 파일명을 만들 수 없습니다.');
  }
  const targetDir = series ? join(postsDir, safeSeriesPath(series)) : postsDir;
  return join(targetDir, `${fileName}.md`);
}

// YAML 단일 인용 스칼라: 특수문자(`:`, `[`, `'` 등)가 든 값도 안전하게 직렬화
function yamlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * 예약 글의 `date`는 오늘이 아니라 **공개 예정일**이어야 합니다.
 * 오늘 날짜를 넣으면 목록에 뜨는 날짜와 실제 공개일이 어긋납니다.
 */
function resolveDate(
  status: Options['status'],
  scheduledDate: string | undefined,
  now: Date,
): string {
  if (status === 'scheduled' && scheduledDate)
    return scheduledDate.slice(0, 10);
  return todayKST(now);
}

/**
 * `scheduledDate`는 **시각까지 지정할 때만** 필요한 선택 필드입니다.
 * 날짜만 주면 `date`가 KST 자정 기준 공개 시각으로 쓰이므로(visibility.ts) 중복입니다.
 */
function needsScheduledDate(scheduledDate: string | undefined): boolean {
  return Boolean(scheduledDate) && !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate!);
}

export function buildFrontmatter(
  opts: Required<Pick<Options, 'title' | 'status' | 'tags'>> &
    Pick<Options, 'slug' | 'scheduledDate'>,
  now: Date = new Date(),
): string {
  const lines = ['---'];
  lines.push(`title: ${yamlQuote(opts.title)}`);
  lines.push(`date: ${resolveDate(opts.status, opts.scheduledDate, now)}`);
  lines.push(`status: ${opts.status}`);
  if (needsScheduledDate(opts.scheduledDate)) {
    lines.push(`scheduledDate: ${yamlQuote(opts.scheduledDate!)}`);
  }
  if (opts.slug) {
    lines.push(`slug: ${yamlQuote(opts.slug)}`);
  }
  lines.push(`excerpt: ''`);
  lines.push(`tags: [${opts.tags.map(yamlQuote).join(', ')}]`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${opts.title}`);
  lines.push('');
  return lines.join('\n');
}

function printUsage() {
  console.log(`사용법:
  pnpm new-post "글 제목" [옵션]

옵션:
  --series <name>          시리즈 폴더 (예: bundler)
  --status <s>             draft | published | scheduled (기본 draft)
  --scheduled <날짜>       예약 발행일. 자동으로 status: scheduled 적용.
                           'YYYY-MM-DD'면 date로만 기록되고(KST 자정 공개),
                           시각까지 주면 scheduledDate가 추가됩니다.
  --slug <slug>            URL용 영문 slug (선택)
  --tags <a,b,c>           쉼표 구분 태그

예시:
  pnpm new-post "번들러 만들기 3편" --series bundler --tags bundler,build
  pnpm new-post "릴리스 노트" --scheduled 2026-05-01
  pnpm new-post "릴리스 노트" --scheduled "2026-05-01T09:00:00+09:00"
`);
}

function main() {
  let opts: Options;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`✖ ${(e as Error).message}\n`);
    printUsage();
    process.exit(1);
  }

  if (!opts.title) {
    printUsage();
    process.exit(1);
  }

  if (opts.status === 'scheduled' && !opts.scheduledDate) {
    console.error(
      '✖ status: scheduled에는 --scheduled <ISO 날짜>가 필요합니다.',
    );
    process.exit(1);
  }

  let targetPath: string;
  try {
    targetPath = buildPostFilePath(POSTS_DIR, opts.title, opts.series);
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    process.exit(1);
  }

  if (existsSync(targetPath)) {
    console.error(`✖ 이미 존재합니다: ${targetPath}`);
    process.exit(1);
  }

  mkdirSync(dirname(targetPath), { recursive: true });

  const frontmatter = buildFrontmatter({
    title: opts.title,
    status: opts.status,
    tags: opts.tags,
    slug: opts.slug,
    scheduledDate: opts.scheduledDate,
  });

  writeFileSync(targetPath, frontmatter, 'utf8');
  const rel = relative(POSTS_DIR, targetPath);
  console.log(`✓ 새 포스트 생성됨: posts/${rel}`);
  console.log(`  status: ${opts.status}`);
  if (opts.series) console.log(`  series: ${opts.series}`);
  if (opts.scheduledDate) console.log(`  scheduledDate: ${opts.scheduledDate}`);
}

// 스크립트로 직접 실행될 때만 main()을 호출합니다.
// (테스트 등에서 import할 때 main()이 자동 실행되어 process.exit 하는 것을 방지)
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
