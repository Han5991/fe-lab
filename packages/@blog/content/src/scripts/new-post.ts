import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { ContentContext } from './context.ts';

/** 실제로 파일을 만들 때 필요한 값 — 원시 입력을 resolveOptions가 여기까지 좁힌다. */
export interface NewPostOptions {
  title: string;
  series?: string | undefined;
  status: 'draft' | 'published' | 'scheduled';
  // slug/scheduledDate는 buildFrontmatter 호출부가 `opts.slug` 그대로(값이
  // undefined일 수 있는 채로) 넘기므로 명시적 undefined를 허용해야 한다.
  scheduledDate?: string | undefined;
  slug?: string | undefined;
  tags: string[];
}

/** CLI가 넘겨주는 원시 옵션 — 전부 선택이고, 값 검증은 아직 안 끝났다. */
export interface RawNewPostOptions {
  title?: string | undefined;
  series?: string | undefined;
  status?: NewPostOptions['status'] | undefined;
  /** `--scheduled` 또는 별칭 `--scheduledDate` */
  scheduledDate?: string | undefined;
  slug?: string | undefined;
  tags?: string[] | undefined;
}

/** `--tags a, b ,,c` → `['a', 'b', 'c']`. 빈 항목은 버린다. */
export function parseTagList(value: string): string[] {
  return value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * 원시 옵션을 실제 값으로 좁힌다 — 여기 있는 건 파싱이 아니라 **도메인 규칙**이다.
 *
 * - `--scheduled`를 준 것 자체가 예약 발행 의도다. `--status scheduled`를 따로
 *   적지 않아도 되게 status를 올린다(둘을 같이 적어도 결과는 같다).
 * - 제목이 없으면 파일 이름을 만들 수 없다. 위치 인자든 `--title`이든 CLI가 하나로
 *   합쳐서 넘기므로, 여기서는 비었는지만 본다.
 */
export function resolveOptions(raw: RawNewPostOptions): NewPostOptions {
  const title = raw.title?.trim();
  if (!title) {
    throw new Error('글 제목이 필요합니다.');
  }
  const status = raw.scheduledDate ? 'scheduled' : (raw.status ?? 'draft');
  if (status === 'scheduled' && !raw.scheduledDate) {
    throw new Error(
      'status: scheduled에는 --scheduled <ISO 날짜>가 필요합니다.',
    );
  }
  return {
    title,
    series: raw.series,
    status,
    scheduledDate: raw.scheduledDate,
    slug: raw.slug,
    tags: raw.tags ?? [],
  };
}

/**
 * 스캐폴딩 frontmatter의 `date` — 설정 타임존 기준 오늘.
 * `timeZone`은 인자다(기본값을 두면 그 값이 곧 특정 사이트의 하드코딩).
 */
export function todayKST(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

export function safeFilename(title: string): string {
  return title.replace(/[/\\\0]/g, '-').trim();
}

/**
 * 시리즈는 중첩 폴더(`회고/2024` 등)를 허용하므로 `/`는 그대로 두되,
 * 상위 경로 탈출(`..`)·빈 세그먼트·절대 경로는 거부해
 * posts/ 밖에 파일이 생기는 것을 막습니다.
 */
function safeSeriesPath(series: string): string {
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
  status: NewPostOptions['status'],
  scheduledDate: string | undefined,
  timeZone: string,
  now: Date,
): string {
  if (status === 'scheduled' && scheduledDate)
    return scheduledDate.slice(0, 10);
  return todayKST(timeZone, now);
}

/**
 * `scheduledDate`는 **시각까지 지정할 때만** 필요한 선택 필드입니다.
 * 날짜만 주면 `date`가 KST 자정 기준 공개 시각으로 쓰이므로(visibility.ts) 중복입니다.
 */
function needsScheduledDate(
  scheduledDate: string | undefined,
): scheduledDate is string {
  return scheduledDate ? !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) : false;
}

export function buildFrontmatter(
  opts: Required<Pick<NewPostOptions, 'title' | 'status' | 'tags'>> &
    Pick<NewPostOptions, 'slug' | 'scheduledDate'>,
  timeZone: string,
  now: Date = new Date(),
): string {
  const lines = ['---'];
  lines.push(`title: ${yamlQuote(opts.title)}`);
  lines.push(
    `date: ${resolveDate(opts.status, opts.scheduledDate, timeZone, now)}`,
  );
  lines.push(`status: ${opts.status}`);
  if (needsScheduledDate(opts.scheduledDate)) {
    lines.push(`scheduledDate: ${yamlQuote(opts.scheduledDate)}`);
  }
  if (opts.slug) {
    lines.push(`slug: ${yamlQuote(opts.slug)}`);
  }
  lines.push(`excerpt: ''`);
  lines.push(`tags: [${opts.tags.map(yamlQuote).join(', ')}]`);
  lines.push('---');
  lines.push('');
  // 본문에 `# 제목`을 넣지 않는다. 페이지의 h1은 PostHeader가 그리는 글 제목
  // 하나뿐이어야 하는데, 여기서 한 줄 깔아주는 바람에 예전 글 22편이 h1을 두 개씩
  // 갖게 됐다(렌더 계층이 h2로 강등해 지금은 화면은 멀쩡하지만, 원문에 남으면
  // `lint:posts`가 `body-h1` 경고를 낸다). 절 제목은 `## `부터 시작한다.
  //
  // 빈 `## `를 깔면 텍스트 없는 h2가 그대로 렌더돼(빈 줄이 벌어지고 id가 없어
  // 목차에서도 빠진다) 어떤 검사에도 안 걸리므로, 이 블로그에서 가장 흔한 첫 절
  // 제목을 기본값으로 넣는다. 마음에 안 들면 고쳐 쓰면 된다.
  lines.push(`## 들어가며`);
  lines.push('');
  return lines.join('\n');
}

export function main(ctx: ContentContext, opts: NewPostOptions) {
  const postsDir = ctx.content.paths.postsDir;
  let targetPath: string;
  try {
    targetPath = buildPostFilePath(postsDir, opts.title, opts.series);
  } catch (e) {
    // `e`는 unknown이다(useUnknownInCatchVariables). Error라고 단언하면 Error가
    // 아닌 것이 던져졌을 때 `✖ undefined`만 남아 원인이 사라지므로, 좁혀서 쓰고
    // 아닌 값은 그대로 찍는다(cli/program.ts의 new-post 액션과 같은 처리).
    console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  if (existsSync(targetPath)) {
    console.error(`✖ 이미 존재합니다: ${targetPath}`);
    process.exit(1);
  }

  mkdirSync(dirname(targetPath), { recursive: true });

  const frontmatter = buildFrontmatter(
    {
      title: opts.title,
      status: opts.status,
      tags: opts.tags,
      slug: opts.slug,
      scheduledDate: opts.scheduledDate,
    },
    ctx.content.config.timezone.iana,
  );

  writeFileSync(targetPath, frontmatter, 'utf8');
  const rel = relative(postsDir, targetPath);
  console.log(`✓ 새 포스트 생성됨: posts/${rel}`);
  console.log(`  status: ${opts.status}`);
  if (opts.series) console.log(`  series: ${opts.series}`);
  if (opts.scheduledDate) console.log(`  scheduledDate: ${opts.scheduledDate}`);
  // excerpt는 비워 둔 채로 시작한다(요약은 글을 쓰고 나야 나온다). 다만 글이
  // 공개되는 순간 `pnpm build`가 이걸 에러로 막으므로, 미리 알려 준다.
  // 문구는 실제 동작과 맞춘다 — 예약 글은 **공개일이 지나야** 에러가 된다.
  if (opts.status === 'published') {
    console.log(
      `\n  ⚠ excerpt가 비어 있습니다. status: published라 지금 바로 \`pnpm build\`가 막힙니다 —
` + `    120~160자 요약을 채우거나, 쓰는 동안은 status: draft로 두세요.`,
    );
  } else if (opts.status === 'scheduled') {
    console.log(
      `\n  ⚠ excerpt가 비어 있습니다. 지금은 경고지만 공개일이 지나면 \`pnpm build\`가 막습니다 —
` + `    발행 전에 120~160자 요약을 채워 주세요.`,
    );
  }
}
