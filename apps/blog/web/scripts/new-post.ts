import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const POSTS_DIR = resolve(process.cwd(), '..', 'posts');

interface Options {
  title?: string;
  series?: string;
  status: 'draft' | 'published' | 'scheduled';
  scheduledDate?: string;
  slug?: string;
  tags: string[];
}

function parseArgs(argv: string[]): Options {
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

function todayKST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date());
}

function safeFilename(title: string): string {
  return title.replace(/[/\\\0]/g, '-').trim();
}

function buildFrontmatter(
  opts: Required<Pick<Options, 'title' | 'status' | 'tags'>> &
    Pick<Options, 'slug' | 'scheduledDate'>,
): string {
  const lines = ['---'];
  lines.push(`title: '${opts.title.replace(/'/g, "''")}'`);
  lines.push(`date: ${todayKST()}`);
  lines.push(`status: ${opts.status}`);
  if (opts.scheduledDate) {
    lines.push(`scheduledDate: '${opts.scheduledDate}'`);
  }
  if (opts.slug) {
    lines.push(`slug: ${opts.slug}`);
  }
  lines.push(`excerpt: ''`);
  lines.push(`tags: [${opts.tags.join(', ')}]`);
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
  --scheduled <iso>        예약 발행 일시. 자동으로 status: scheduled 적용
  --slug <slug>            URL용 영문 slug (선택)
  --tags <a,b,c>           쉼표 구분 태그

예시:
  pnpm new-post "번들러 만들기 3편" --series bundler --tags bundler,build
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

  const targetDir = opts.series ? join(POSTS_DIR, opts.series) : POSTS_DIR;
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const fileName = `${safeFilename(opts.title)}.md`;
  const targetPath = join(targetDir, fileName);

  if (existsSync(targetPath)) {
    console.error(`✖ 이미 존재합니다: ${targetPath}`);
    process.exit(1);
  }

  const frontmatter = buildFrontmatter({
    title: opts.title,
    status: opts.status,
    tags: opts.tags,
    slug: opts.slug,
    scheduledDate: opts.scheduledDate,
  });

  writeFileSync(targetPath, frontmatter, 'utf8');
  const rel = targetPath.replace(`${POSTS_DIR}/`, '');
  console.log(`✓ 새 포스트 생성됨: posts/${rel}`);
  console.log(`  status: ${opts.status}`);
  if (opts.series) console.log(`  series: ${opts.series}`);
  if (opts.scheduledDate) console.log(`  scheduledDate: ${opts.scheduledDate}`);
}

main();
