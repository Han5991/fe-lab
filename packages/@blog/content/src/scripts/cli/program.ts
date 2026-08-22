/**
 * `blog-content`의 서브커맨드 정의 — 이름·옵션을 단계 모듈에 잇는 유일한 곳.
 *
 * 앱이 아는 것은 **이름**뿐이다(`blog-content sitemap`). 예전에는 앱
 * package.json이 `npx tsx node_modules/@blog/content/src/scripts/…`처럼 파일
 * 경로를 직접 지목해서, 패키지 안에서 파일을 옮기면 앱이 조용히 깨졌다.
 *
 * 단계 모듈은 전부 **동적 import**로 든다. rss·og-images·thumbnails는 React·
 * satori·sharp를 끌기 때문에, 정적 import로 묶으면 `sitemap` 한 단계를 부를
 * 때도 네이티브 모듈이 전부 로드된다. `main`이 실제로 있는지는 tsc가 본다 —
 * 동적 import여도 모듈 타입은 정적으로 해석되기 때문이다.
 *
 * 옵션 파싱이 여기 모여 있는 것도 레이어 때문이다. 단계 모듈(`build` 레이어)은
 * commander를 모른 채 **이미 파싱된 값**만 받는다. 도메인 규칙(예: `--scheduled`를
 * 주면 status가 scheduled가 된다)은 파싱이 아니므로 단계 쪽에 남는다.
 *
 * 실행(`parseAsync`)과 갈라 둔 이유는 테스트다 — 정의만 import해도 CLI가
 * 돌지 않아야 커맨드 목록과 옵션을 검사할 수 있다.
 */
import { Command, Option } from 'commander';
import type { NewPostOptions } from '../new-post.ts';
import type { ContentContext } from '../context.ts';

/**
 * 컨텍스트 로드 — 전역 `--config`(있으면)를 읽어 content.config.ts를 발견·로드하고
 * 컨텍스트를 만든다. 발견·검증은 동적 import로 든다(정의만 import한 테스트가
 * fs를 만지지 않도록).
 */
async function loadContext(command: Command): Promise<ContentContext> {
  const globals = command.optsWithGlobals<{ config?: string }>();
  const { loadContentConfig } = await import('./discoverConfig.ts');
  const { createContext } = await import('../context.ts');
  const { config, configPath } = await loadContentConfig(globals.config);
  return createContext(config, configPath);
}

/** 인자 없이 도는 생성 단계 — build가 병렬로 돌리는 것들 대부분이 여기다. */
const PLAIN_STEPS = [
  {
    name: 'sitemap',
    describe: '발행 글로 sitemap.xml 생성',
    load: async () => (await import('../generate-sitemap.ts')).main,
  },
  {
    name: 'rss',
    describe: 'RSS 피드(rss.xml) 생성 — 전문 HTML 포함',
    load: async () => (await import('../render/generate-rss.ts')).main,
  },
  {
    name: 'og-images',
    describe: 'OG 카드 이미지 생성 (satori + resvg, incremental)',
    load: async () => (await import('../render/generate-og-images.ts')).main,
  },
  {
    name: 'thumbnails',
    describe: '로컬 썸네일을 webp로 최적화 (sharp, incremental)',
    load: async () => (await import('../render/generate-thumbnails.ts')).main,
  },
  {
    name: 'search-index',
    describe: '검색 인덱스 + admin 인덱스 생성',
    load: async () => (await import('../generate-search-index.ts')).main,
  },
  {
    name: 'llms-full',
    describe: 'AI/LLM용 통합 텍스트(llms-full.txt) 생성',
    load: async () => (await import('../generate-llms-full.ts')).main,
  },
  {
    name: 'llms',
    describe: 'AI 크롤러용 색인(llms.txt) 생성',
    load: async () => (await import('../generate-llms.ts')).main,
  },
] as const;

export function buildProgram(): Command {
  const program = new Command()
    .name('blog-content')
    .description('블로그 콘텐츠 파이프라인 — 검증·생성·산출물 검사')
    // 경로 앵커는 content.config.ts에서 온다 — 전역 옵션이라 서브커맨드 이름
    // **앞**에 적는다(`blog-content --config <경로> build`). 생략하면 cwd에서
    // 위로 올라가며 찾는다. build가 자식을 띄울 때는 항상 이 옵션으로 자기
    // 설정을 명시 전달한다(stepArgv).
    .option(
      '--config <path>',
      'content.config.ts 경로 (기본: cwd에서 위로 탐색)',
    )
    // 오타 옵션을 조용히 무시하지 않는다. 예전 손파서도 알 수 없는 옵션을
    // 에러로 냈으므로 동작이 같다.
    .showHelpAfterError();

  program
    .command('build')
    .description('콘텐츠 빌드 전체 (validate 게이트 → 생성 단계 병렬)')
    .option('--strict', 'SEO 경고를 에러로 올린다 (prebuild에서만 켠다)')
    .option('--skip-validate', 'validate 게이트를 건너뛴다')
    .option('--force', 'sync-posts를 전체 복사로 돌린다')
    .action(
      async (opts: Record<string, boolean | undefined>, command: Command) => {
        const ctx = await loadContext(command);
        const { main } = await import('../build-content.ts');
        await main(ctx, {
          strict: opts['strict'] ?? false,
          skipValidate: opts['skipValidate'] ?? false,
          force: opts['force'] ?? false,
        });
      },
    );

  program
    .command('validate')
    .description('frontmatter 원문 검증')
    .option('--strict', 'SEO 경고를 에러로 올린다')
    .action(async (opts: { strict?: boolean }, command: Command) => {
      const ctx = await loadContext(command);
      const { main } = await import('../validate-posts.ts');
      main(ctx, { strict: opts.strict ?? false });
    });

  program
    .command('check-seo')
    .description('빌드 산출물(out/) HTML의 SEO 계약 검사')
    .argument('[outDir]', '검사할 디렉터리 (기본: 설정의 out)')
    .action(
      async (outDir: string | undefined, _opts: unknown, command: Command) => {
        const ctx = await loadContext(command);
        const { main } = await import('../check-seo.ts');
        main(ctx, outDir);
      },
    );

  program
    .command('new-post')
    .description('새 포스트 스캐폴딩')
    .argument('[title]', '글 제목')
    .option('-t, --title <title>', '글 제목 (위치 인자보다 우선)')
    .option('-s, --series <name>', '시리즈 폴더 (예: bundler)')
    .addOption(
      new Option('--status <status>', '발행 의도 (기본 draft)').choices([
        'draft',
        'published',
        'scheduled',
      ]),
    )
    .option(
      '--scheduled <date>',
      "예약 발행일. status를 scheduled로 올린다. 'YYYY-MM-DD'면 date로만 " +
        '기록되고(KST 자정 공개), 시각까지 주면 scheduledDate가 추가된다',
    )
    .option('--scheduledDate <date>', '--scheduled의 별칭')
    .option('--slug <slug>', 'URL용 영문 slug')
    .option('--tags <a,b,c>', '쉼표로 구분한 태그')
    .action(
      async (
        titleArg: string | undefined,
        opts: NewPostRawFlags,
        command: Command,
      ) => {
        const { main, resolveOptions, parseTagList } =
          await import('../new-post.ts');
        let resolved: NewPostOptions;
        try {
          resolved = resolveOptions({
            title: opts.title ?? titleArg,
            series: opts.series,
            status: opts.status,
            scheduledDate: opts.scheduled ?? opts.scheduledDate,
            slug: opts.slug,
            tags: opts.tags === undefined ? undefined : parseTagList(opts.tags),
          });
        } catch (e) {
          // 도메인 검증 실패는 글쓴이가 고칠 수 있는 것이다 — 스택 트레이스 대신
          // 무엇이 잘못됐는지와 사용법을 보여준다(commander가 exit 1까지 맡는다).
          // 여기서 안 잡으면 진입점의 마지막 catch까지 올라가 Error가 통째로 찍힌다.
          command.error(`✖ ${(e as Error).message}`);
        }
        const ctx = await loadContext(command);
        main(ctx, resolved);
      },
    );

  program
    .command('sync-posts')
    .description('포스트 미디어를 public/posts/로 동기화')
    .option('--force', '전체 복사 (incremental 대신)')
    .option('--dry-orphan', 'orphan을 지우지 않고 목록만 출력')
    .action(
      async (
        opts: { force?: boolean; dryOrphan?: boolean },
        command: Command,
      ) => {
        const ctx = await loadContext(command);
        const { main } = await import('../sync-posts.ts');
        main(ctx, {
          force: opts.force ?? false,
          dryOrphan: opts.dryOrphan ?? false,
        });
      },
    );

  for (const step of PLAIN_STEPS) {
    program
      .command(step.name)
      .description(step.describe)
      .action(async (_opts: unknown, command: Command) => {
        const ctx = await loadContext(command);
        const main = await step.load();
        // 단계마다 main이 sync이기도 async이기도 하다(sitemap은 동기,
        // og-images는 sharp/satori 때문에 비동기). 둘 다 기다린다.
        await Promise.resolve(main(ctx));
      });
  }

  return program;
}

/** commander가 `new-post`에 채워 넣는 원시 플래그 — 전부 문자열이거나 없다. */
interface NewPostRawFlags {
  title?: string | undefined;
  series?: string | undefined;
  status?: 'draft' | 'published' | 'scheduled' | undefined;
  scheduled?: string | undefined;
  scheduledDate?: string | undefined;
  slug?: string | undefined;
  tags?: string | undefined;
}
