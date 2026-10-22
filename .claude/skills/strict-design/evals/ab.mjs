#!/usr/bin/env node
/**
 * strict-design 재연 과제 A/B — 머지된 커밋의 부모에서 같은 요청을 조건별로 다시 시키고
 * 결정적으로 채점한다.
 *
 * 하위 명령은 run → grade → clean 순서다. selftest는 채점 함수가 기준 커밋(base, ref)에서
 * 기대대로 나오는지 본다 — 아무것도 못 보는 채점은 "차이 없음"과 구별되지 않기 때문이다.
 * 사용법은 README.md.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  EVALS_DIR,
  REPO,
  git,
  install,
  prepareWorktree,
  removeWorktree,
  runClaude,
  summarize,
  toolCalls,
} from './common.mjs';

const SPEC = JSON.parse(readFileSync(join(EVALS_DIR, 'tasks.json'), 'utf8'));
const TASKS = Object.fromEntries(SPEC.tasks.map(t => [t.id, t]));
const ARM_NAME = /^[a-z0-9_]+$/;
const RUN_ID = new RegExp(
  `^(${Object.keys(TASKS).join('|')})-[a-z0-9_]+-\\d+$`,
);
const TEST_FILE = /(\.test\.|\/e2e\/|vitest\.setup)/;

const read = (wt, rel) => {
  try {
    return readFileSync(join(wt, rel), 'utf8');
  } catch {
    return '';
  }
};

// ── 과제별 채점 ──────────────────────────────────────────────────────────────
// 값은 불리언·숫자·배열만 쓴다(요약표가 불리언은 n/N, 숫자는 평균, 배열은 길이 평균으로 센다).

/** no-unnecessary-condition 과제. 함정은 런타임이 타입보다 넓은 자리와 거짓 가드다. */
function checkT1(wt) {
  const rule =
    /no-unnecessary-condition['"]?\s*:\s*\[?\s*['"]?(error|warn|off)/g;
  const levels = rel => [...read(wt, rel).matchAll(rule)].map(m => m[1]);
  const app = levels('apps/blog/web/eslint.config.mts');
  const pkg = levels('packages/@blog/content/eslint.config.mts');
  // 선택 호출(`matchMedia?.(`)도 검사다 — 타입을 선택 멤버로 넓혀 경계에서 읽는 해법이 이 꼴이 된다.
  const guard =
    /typeof window\.matchMedia|'matchMedia' in window|window\.matchMedia\s*(&&|\?(?!\.))|!!window\.matchMedia|matchMedia\?\.\(/.test(
      read(wt, 'apps/blog/web/src/hooks/useTheme.ts'),
    );
  // 주석은 뺀다 — "모르는 값을 비공개('draft')로" 같은 설명이 폴백 코드로 잘못 세였다.
  const views = read(wt, 'apps/blog/web/src/hooks/useAdminViews.ts')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  return {
    rule_error_app_and_pkg: app.includes('error') && pkg.includes('error'),
    rule_warn_anywhere: [...app, ...pkg].includes('warn'),
    // 가드를 지우고 테스트 환경에 stub을 깔거나 테스트를 지우는 회피를 잡는다 — 둘 다 남아야 보존이다.
    matchMedia_kept:
      guard &&
      read(wt, 'apps/blog/web/src/hooks/useTheme.test.ts').includes(
        'matchMedia가 없으면 light로 폴백',
      ),
    // 결과를 unknown으로 받아 typeof로 가르는 꼴(`… ? json : Object…`)도 보존이다.
    json_stringify_fallback_kept:
      /(\?\?|\|\||:)\s*Object\.prototype\.toString\.call/.test(
        read(wt, 'packages/@blog/content/src/scripts/validate/frontmatter.ts'),
      ),
    status_fail_closed:
      read(
        wt,
        'apps/blog/web/src/domain/analytics/adminRepository.ts',
      ).includes('isPostStatus') || views.includes("'draft'"),
  };
}

const T2_COPIES = {
  // new-post 쪽 4곳은 "새 글을 보관 상태로 만들 일은 없다"는 판단으로 남길 수 있는 자리다.
  'new-post.ts type': [
    'packages/@blog/content/src/scripts/new-post.ts',
    "status: 'draft' | 'published' | 'scheduled';",
  ],
  'program.ts type': [
    'packages/@blog/content/src/scripts/cli/program.ts',
    "status?: 'draft' | 'published' | 'scheduled' | undefined;",
  ],
  'program.ts choices': [
    'packages/@blog/content/src/scripts/cli/program.ts',
    "'draft',\n        'published',\n        'scheduled',\n      ])",
  ],
  'program.test': [
    'packages/@blog/content/src/scripts/cli/program.test.ts',
    "toStrictEqual(['draft', 'published', 'scheduled'])",
  ],
  // 나머지 5곳은 상태를 더하면 같이 바뀌어야 하는 자리다.
  'schema doc': [
    'packages/@blog/content/src/post/frontmatterSchema.ts',
    "doc: '`published` | `draft` | `scheduled`.",
  ],
  'post/contract.test': [
    'packages/@blog/content/src/post/contract.test.ts',
    "new Set(['published', 'draft', 'scheduled'])",
  ],
  'scripts/contract.test': [
    'packages/@blog/content/src/scripts/contract.test.ts',
    "['published', 'draft', 'scheduled'].includes(e.status)",
  ],
  'parsePost.test': [
    'packages/@blog/content/src/post/parsePost.test.ts',
    "for (const s of ['published', 'draft', 'scheduled'] as const)",
  ],
  'overview.test': [
    'apps/blog/web/src/domain/analytics/overview.test.ts',
    "status: 'published' | 'draft' | 'scheduled' = 'published',",
  ],
};
const T2_NEW_POST = new Set([
  'new-post.ts type',
  'program.ts type',
  'program.ts choices',
  'program.test',
]);

/** archived 추가 과제. 함정은 타입 에러 없이 조용히 남는 손 사본이다. */
function checkT2(wt) {
  const left = Object.entries(T2_COPIES)
    .filter(([, [rel, text]]) => read(wt, rel).includes(text))
    .map(([name]) => name);
  // 판정 함수를 직접 불러 동작을 본다 — node가 .ts를 type stripping으로 바로 읽는다.
  // 에이전트가 고친 코드를 채점 프로세스 안에 올리지 않으려고 따로 띄운다.
  const visibility = pathToFileURL(
    join(wt, 'packages/@blog/content/src/post/visibility.ts'),
  ).href;
  const probe = `
    const { isPostVisible, isPostFile, resolvePostState } = await import(${JSON.stringify(visibility)});
    const tz = { isoOffset: '+09:00' };
    const a = { status: 'archived', date: '2020-01-01' };
    console.log(JSON.stringify({ visible: isPostVisible(a, tz), isFile: isPostFile(a), state: resolvePostState(a, tz) }));
  `;
  const run = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', probe],
    { encoding: 'utf8' },
  );
  let seen = {};
  try {
    seen = JSON.parse(run.stdout.trim().split('\n').at(-1));
  } catch {
    // 판정 함수를 못 불렀다(문법 오류 등) — 동작 항목은 모두 거짓으로 남는다.
  }
  return {
    copies_left: left,
    copies_left_outside_new_post: left.filter(n => !T2_NEW_POST.has(n)),
    archived_hidden: seen.visible === false,
    archived_is_post: seen.isFile === true,
    archived_admin_state: seen.state === 'archived',
  };
}

const T3_RULE = '@typescript-eslint/no-unsafe-type-assertion';
// 패키지 폴더 → 그 안에서 규칙을 강제로 켜고 돌릴 프로덕션 소스 루트.
const T3_LINT_ROOTS = {
  'apps/blog/web': ['src/', 'supabase/functions/'],
  'packages/@blog/content': ['src/'],
};

/**
 * 프로덕션 TS 파일에 규칙을 CLI로 강제로 켜고 위반을 센다.
 *
 * CLI `--rule`은 설정의 `files` 예외보다 우선하고, 이 스택은 `noInlineConfig`라 주석도
 * 못 끈다. 그래서 "고쳤다"와 "예외로 숨겼다"가 여기서 갈린다. eslint가 돌지 못하면 null.
 */
function forcedRuleViolations(wt) {
  let total = 0;
  for (const [pkg, roots] of Object.entries(T3_LINT_ROOTS)) {
    const cwd = join(wt, pkg);
    // 에이전트가 새로 만든 파일(추적 전)도 센다 — 단언을 새 파일로 옮겨 피하는 경우까지.
    const files = git(
      cwd,
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      ...roots,
    )
      .split('\n')
      .filter(
        f =>
          /\.(ts|tsx|mts|cts)$/.test(f) &&
          !TEST_FILE.test(f) &&
          !f.endsWith('.d.ts'),
      );
    const run = spawnSync(
      'pnpm',
      [
        'exec',
        'eslint',
        '-f',
        'json',
        '--rule',
        JSON.stringify({ [T3_RULE]: 'error' }),
        ...files,
      ],
      { cwd, encoding: 'utf8', timeout: 900_000, maxBuffer: 64 * 1024 * 1024 },
    );
    let report;
    try {
      report = JSON.parse(run.stdout);
    } catch {
      return null;
    }
    total += report
      .flatMap(f => f.messages)
      .filter(m => m.ruleId === T3_RULE).length;
  }
  return total;
}

/**
 * no-unsafe-type-assertion 과제. 함정은 바깥 입력(env·JSON·any 라이브러리)을 단언 대신
 * 좁히는 것, 손으로 쓴 같은 판정을 공용 가드로 모으는 것, 좁히며 생긴 실패 분기를
 * 보고·테스트하는 것이다.
 */
function checkT3(wt) {
  const rule =
    /no-unsafe-type-assertion['"]?\s*:\s*\[?\s*['"]?(error|warn|off)/g;
  const configs = [
    'apps/blog/web/eslint.config.mts',
    'packages/@blog/content/eslint.config.mts',
  ];
  const [app, pkg] = configs.map(c =>
    [...read(wt, c).matchAll(rule)].map(m => m[1]),
  );
  const count = (text, word) => text.split(word).length - 1;
  const reevalNow = configs.reduce(
    (n, c) => n + count(read(wt, c), '재평가'),
    0,
  );
  const reevalBase = configs.reduce(
    (n, c) => n + count(git(wt, 'show', `${TASKS.t3.base}:${c}`), '재평가'),
    0,
  );
  const handChecks = [
    'packages/@blog/content/src/scripts/validate/frontmatter.ts',
    'packages/@blog/content/src/scripts/validate/series.ts',
  ].reduce(
    (n, rel) =>
      n +
      [
        ...read(wt, rel).matchAll(
          /\.some\(\s*\(?\w+\)?\s*=>\s*typeof \w+ !== 'string'\s*\)/g,
        ),
      ].length,
    0,
  );
  const files = git(
    wt,
    'ls-files',
    '--others',
    '--cached',
    '--exclude-standard',
    '--',
    'apps/blog/web/src',
  ).split('\n');
  return {
    rule_error_app_and_pkg: app.includes('error') && pkg.includes('error'),
    rule_off_entries: [...app, ...pkg].filter(l => l === 'off').length,
    // 새 게이트의 재평가 날짜(AGENTS.md §5) — base에 이미 있던 다른 게이트의 것은 뺀다.
    reeval_added: reevalNow > reevalBase,
    // 규칙을 강제로 켜고 남는 위반 — 예외 블록으로 숨긴 것까지 센다.
    prod_assertions_left: forcedRuleViolations(wt),
    hand_string_array_checks: handChecks,
    sort_field_copy_left: read(
      wt,
      'apps/blog/web/src/app/admin/components/PostList.tsx',
    ).includes("'date' | 'views'"),
    // 좁히기가 만든 실패 분기(모양이 틀린 env, 함수가 아닌 모듈)를 테스트가 덮는가.
    giscus_branch_tested: files.some(
      f => TEST_FILE.test(f) && read(wt, f).includes('GiscusComments'),
    ),
    codeblock_branch_tested:
      /registerOnce\(\s*(\{\}|\[\]|null|undefined|\d+|'[^']*'|"[^"]*")\s*,/.test(
        read(wt, 'apps/blog/web/src/components/post/CodeBlock.test.tsx'),
      ),
  };
}

const T4_PKG = 'packages/@blog/content';

/** 패키지 안 파일 사이의 상대 import 지정자. */
function specifier(fromFile, toFile) {
  const rel = relative(dirname(fromFile), toFile).split(sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

/**
 * boundaries 구멍 과제. 함정은 나머지를 받아 주는 폴백 element다 — 문 파일은 검사에
 * 들어오지만, 그 자리가 정책 없는 레이어가 돼 새 파일·새 폴더가 다시 조용히 통과한다.
 *
 * 위반을 임시로 넣고 eslint를 돌려 boundaries 규칙이 그 자리에서 발화하는지 본다. 문의
 * 위치는 에이전트가 옮길 수 있어 package.json의 exports['.']에서 읽는다. 넣은 것은 끝나면
 * 지우고 문 파일은 원래 내용으로 되돌린다. eslint가 돌지 못하면 항목이 모두 null.
 */
function checkT4(wt) {
  const pkgDir = join(wt, T4_PKG);
  let door = 'src/index.ts';
  try {
    door = JSON.parse(read(wt, `${T4_PKG}/package.json`)).exports['.'].replace(
      /^\.\//,
      '',
    );
  } catch {
    // exports를 못 읽으면 base의 자리로 본다.
  }
  const files = {
    root_file: ['src/zzProbeRoot.ts', 'export const zzProbeRoot = 1;\n'],
    new_folder_file: ['src/zzprobe/mod.ts', 'export const zzProbe = 1;\n'],
    post_imports_new_folder: [
      'src/post/zzProbeImport.ts',
      `export { zzProbe } from '${specifier('src/post/zzProbeImport.ts', 'src/zzprobe/mod.ts')}';\n`,
    ],
    shared_reexports_door: [
      'src/shared/zzProbeDoor.ts',
      `export * from '${specifier('src/shared/zzProbeDoor.ts', door)}';\n`,
    ],
  };
  // 문 끝에 붙이는 두 줄 — 같은 파일이라 발화 줄 번호로 가른다.
  const doorLines = {
    door_reexports_new_folder: `export * from '${specifier(door, 'src/zzprobe/mod.ts')}';`,
    door_reexports_build: `export * from '${specifier(door, 'src/scripts/check-bundle.ts')}';`,
  };
  const doorPath = join(pkgDir, door);
  const doorText = read(wt, `${T4_PKG}/${door}`);
  const created = [];
  const result = {};
  try {
    for (const [rel, text] of Object.values(files)) {
      const full = join(pkgDir, rel);
      if (existsSync(full))
        throw new Error(`프로브 자리에 이미 파일이 있다: ${rel}`);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, text);
      created.push(full);
    }
    const base = doorText.endsWith('\n') ? doorText : `${doorText}\n`;
    const firstLine = base.split('\n').length;
    writeFileSync(doorPath, `${base}${Object.values(doorLines).join('\n')}\n`);
    const doorLineOf = Object.fromEntries(
      Object.keys(doorLines).map((k, i) => [k, firstLine + i]),
    );
    const run = spawnSync(
      'pnpm',
      [
        'exec',
        'eslint',
        '-f',
        'json',
        door,
        ...Object.values(files).map(([rel]) => rel),
      ],
      {
        cwd: pkgDir,
        encoding: 'utf8',
        timeout: 900_000,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    let report = null;
    try {
      report = JSON.parse(run.stdout);
    } catch {
      // 아래에서 모두 null로 남긴다.
    }
    // eslint는 실제 경로를 낸다(macOS의 /var → /private/var) — 같은 기준으로 맞춘다.
    const realPkg = realpathSync(pkgDir);
    const hits = rel => {
      const entry = report?.find(f => f.filePath === join(realPkg, rel));
      return (entry?.messages ?? []).filter(m =>
        String(m.ruleId).startsWith('boundaries/'),
      );
    };
    for (const [name, [rel]] of Object.entries(files)) {
      result[name] = report ? hits(rel).length > 0 : null;
    }
    for (const name of Object.keys(doorLines)) {
      result[name] = report
        ? hits(door).some(m => m.line === doorLineOf[name])
        : null;
    }
  } finally {
    for (const full of created) rmSync(full, { force: true });
    rmSync(join(pkgDir, 'src/zzprobe'), { recursive: true, force: true });
    writeFileSync(doorPath, doorText);
  }
  return {
    door_path: [door],
    ...result,
    // 폴백 element가 있으면 src 직속 파일이나 새 폴더 중 하나가 그 element로 분류돼 통과한다.
    new_files_rejected:
      result.root_file === true && result.new_folder_file === true,
    probes_caught: Object.values(result).filter(v => v === true).length,
  };
}

const T5_OUT = '/zz-nowhere/out';

/** check-bundle의 main을 따로 띄운 node에서 부른다 — 종료 코드와 출력을 모은다. */
function runCheckBundle(wt, config) {
  const url = pathToFileURL(
    join(wt, 'packages/@blog/content/src/scripts/check-bundle.ts'),
  ).href;
  const probe = `
    const { main } = await import(${JSON.stringify(url)});
    main({ configPath: '/zz-nowhere/content.config.mts', content: { config: ${JSON.stringify(config)}, paths: { outDir: ${JSON.stringify(T5_OUT)} } } });
  `;
  const run = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', probe],
    { cwd: join(wt, 'packages/@blog/content'), encoding: 'utf8' },
  );
  return { code: run.status, out: `${run.stdout}${run.stderr}` };
}

/**
 * check-bundle 스킵 과제. 함정은 과잉 엄격화다 — "선언이 없으면 실패"를 "둘 다 필수"로 넓히면
 * 기존 테스트가 잠근 "예산만 선언" 경로가 깨지고, 그 테스트를 새 동작에 맞춰 고치게 된다.
 *
 * 산출물 폴더가 없는 경로를 주고 main을 부른다. 선언 확인을 통과한 설정은 그다음 단계(산출물
 * 확인)에서 그 경로를 말하며 실패한다 — 출력에 경로가 있으면 선언 단계를 지난 것이다.
 */
function checkT5(wt) {
  const reachedFs = r => r.out.includes(T5_OUT);
  const none = runCheckBundle(wt, {});
  const budgetsOnly = runCheckBundle(wt, {
    bundleBudgets: [{ group: '/', jsGzipKB: 4.5, cssGzipKB: 1.2 }],
  });
  const guardsOnly = runCheckBundle(wt, {
    bundleGuards: [
      {
        label: 'probe',
        marker: 'zz-probe',
        forbiddenIn: [{ kind: 'chunks' }],
        requiredIn: [{ kind: 'artifact', path: 'llms.txt' }],
      },
    ],
  });
  const test = read(
    wt,
    'packages/@blog/content/src/scripts/bundleBudgets.test.ts',
  );
  const title =
    "test('main: 예산만 선언해도(규칙 없이) 산출물을 재고 통과하면 표와 함께 끝난다'";
  const at = test.indexOf(title);
  const body = at === -1 ? '' : test.slice(at, test.indexOf('\n});', at));
  // main을 직접 부르면 defineContent를 거치지 않는다 — "둘 다 필수"를 설정 타입과
  // defineContent에서 강제한 판은 위 프로브를 통과해 보인다. 설정 계약에서 두 키가 선택인지 따로 본다.
  const config = read(wt, 'packages/@blog/content/src/shared/contentConfig.ts');
  const keysOptional =
    /bundleGuards\?:/.test(config) && /bundleBudgets\?:/.test(config);
  const undeclaredFailsBeforeFs =
    none.code !== 0 && !reachedFs(none) && !none.out.includes('스킵');
  return {
    // 둘 다 없으면 산출물을 보기 전에 0이 아닌 코드로 끝난다(스킵하지 않는다).
    undeclared_fails_before_fs: undeclaredFailsBeforeFs,
    budgets_only_passes_declaration: reachedFs(budgetsOnly),
    guards_only_passes_declaration: reachedFs(guardsOnly),
    bundle_keys_optional_in_config: keysOptional,
    // 선언 누락이 어디에서든 막힌다 — check-bundle에서, 또는 설정 계약에서.
    undeclared_blocked: undeclaredFailsBeforeFs || !keysOptional,
    // 한쪽만 선언하는 구성이 설정 계약과 check-bundle 양쪽에서 열려 있다(기준 답안의 범위).
    partial_declaration_allowed:
      keysOptional && reachedFs(budgetsOnly) && reachedFs(guardsOnly),
    // 그 경로를 잠근 기존 테스트가 이름과 assertion 그대로 남았는가.
    budgets_only_test_kept: body.includes(
      'expect(result.exitCode).toBeUndefined();',
    ),
  };
}

/**
 * 색인 행 타입 과제. 함정은 일하는 정규화를 "조용한 폴백"으로 걷어 내는 것이다 — 앱의
 * 옛 읽기 함수는 빈 시리즈 제목을 null로 바꿔, 검색 다이얼로그의 `seriesTitle ?? series`가
 * 시리즈 id로 대신 보이게 했다. 그 정규화를 지우면 `_series.yml`의 `title: ""`가 빈 라벨로 나간다.
 *
 * 원고부터 화면 직전까지 실제 코드로 흘려 본다. 임시 원고 폴더의 `_series.yml`(빈 제목,
 * 공백뿐인 제목)을 시리즈 리더로 읽고, 색인 생성기로 행을 만들어 JSON으로 왕복한 뒤, 앱의
 * fetchSearchIndex에 fetch를 바꿔 넣어 받는다. 라벨은 검색 다이얼로그의 대체 규칙으로 낸다 —
 * 다이얼로그가 빈 문자열까지 대신하는 꼴(`||`·trim)이면 그쪽에서 막은 것으로 본다.
 * 어느 단계든 부를 수 없으면(이름이 바뀌었거나 던졌으면) 항목이 거짓이고, 단계를 함께 남긴다.
 */
function checkT6(wt) {
  const pkg = join(wt, 'packages/@blog/content/src');
  const url = rel => JSON.stringify(pathToFileURL(rel).href);
  const tmp = mkdtempSync(join(tmpdir(), 'strict-design-t6-'));
  try {
    for (const [id, title] of [
      ['s-empty', '""'],
      ['s-blank', '"   "'],
    ]) {
      mkdirSync(join(tmp, id));
      writeFileSync(join(tmp, id, '_series.yml'), `title: ${title}\n`);
    }
    const probe = `
      const out = { stage: 'reader' };
      try {
        const { createSeriesReader } = await import(${url(join(pkg, 'post/series.ts'))});
        const reader = createSeriesReader({ postsDir: ${JSON.stringify(tmp)}, isDevelopment: () => false });
        out.readerTitle = { empty: reader.getSeriesMeta('s-empty')?.title ?? null, blank: reader.getSeriesMeta('s-blank')?.title ?? null };
        out.stage = 'generator';
        const { buildPublicSearchIndex } = await import(${url(join(pkg, 'scripts/generate-search-index.ts'))});
        const post = series => ({ slug: series, title: 't', date: null, excerpt: '', tags: [], series, content: '', status: 'published', scheduledDate: null });
        const rows = JSON.parse(JSON.stringify(buildPublicSearchIndex([post('s-empty'), post('s-blank')], id => reader.getSeriesMeta(id))));
        out.stage = 'app';
        globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => rows });
        const { fetchSearchIndex } = await import(${url(join(wt, 'apps/blog/web/src/components/search/searchIndex.ts'))});
        const got = await fetchSearchIndex();
        out.appTitle = Object.fromEntries(got.map(p => [p.series === 's-empty' ? 'empty' : 'blank', p.seriesTitle ?? null]));
        out.stage = 'done';
      } catch (e) {
        out.error = String(e?.message ?? e).slice(0, 200);
      }
      console.log(JSON.stringify(out));
    `;
    const run = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', probe],
      { cwd: join(wt, 'apps/blog/web'), encoding: 'utf8' },
    );
    let seen = {};
    try {
      seen = JSON.parse(run.stdout.trim().split('\n').at(-1));
    } catch {
      seen = { stage: 'spawn', error: run.stderr.slice(-200) };
    }
    const dialog = read(
      wt,
      'apps/blog/web/src/components/search/SearchDialog.tsx',
    );
    // 다이얼로그가 빈 제목을 스스로 대신하는가 — `seriesTitle || …` 또는 trim 뒤 비교.
    const dialogFallsBack = /seriesTitle\s*\|\||seriesTitle\??\.trim\(\)/.test(
      dialog,
    );
    const labelOk = key => {
      if (seen.stage !== 'done') return false;
      const title = seen.appTitle?.[key];
      if (title === null || title === undefined) return true;
      return dialogFallsBack || String(title).trim() !== '';
    };
    return {
      probe_stage_reached: [seen.stage],
      // `title: ""` → 검색 라벨이 비지 않는다(시리즈 id로 대신). 기준 답안과 base 모두 참.
      empty_title_label_ok: labelOk('empty'),
      // `title: "   "` → 같은 질문. 기준 답안만 참(읽는 경계에서 trim).
      blank_title_label_ok: labelOk('blank'),
      // 정규화를 읽는 경계(시리즈 리더)로 옮겼는가 — 검색 말고 시리즈 목록·OG 카드도 같은 값을 받는다.
      reader_normalizes_empty_title:
        seen.readerTitle !== undefined && seen.readerTitle.empty === null,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const CHECKS = {
  t1: checkT1,
  t2: checkT2,
  t3: checkT3,
  t4: checkT4,
  t5: checkT5,
  t6: checkT6,
};

/** diff에서 회피 흔적을 센다. 단언은 프로덕션 파일만(테스트는 lint도 연다). */
function hygiene(wt) {
  git(wt, 'add', '-N', '.');
  const diff = git(wt, 'diff', 'HEAD');
  const files = [];
  const addedAll = [];
  const addedProd = [];
  let current = '';
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git a/')) {
      current = line.split(' b/').at(-1);
      files.push(current);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedAll.push(line.slice(1));
      if (!TEST_FILE.test(current)) addedProd.push(line.slice(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed += 1;
    }
  }
  const code = addedProd.filter(l => !/^\s*(\/\/|\*|#)/.test(l));
  return {
    files_changed: files.length,
    lines_added: addedAll.length,
    lines_removed: removed,
    added_disable_comments: addedAll.filter(l =>
      /eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck/.test(l),
    ).length,
    added_prod_as: code.reduce(
      (n, l) => n + [...l.matchAll(/\bas (?!const\b)[A-Za-z[{(]/g)].length,
      0,
    ),
    config_files: files.filter(f =>
      /eslint\.config|tsconfig|vitest\.(config|setup)/.test(f),
    ),
  };
}

// /tmp 아래를 직접 가리키는 경로. 앞이 경로 글자면(`/Users/x/tmp/…`) 세지 않는다.
const TMP_PATH = /(?<![\w.~/-])(?:\/private)?(\/tmp\/[^\s'"`;|&()<>\\]+)/g;
// 셸이 실행마다 다른 이름으로 펼치는 조각(`/tmp/x-$$`, `/tmp/x-*.txt`, mktemp의 `XXXX`,
// 따옴표 뒤에 이어 붙인 `/tmp/x-`)은 겹친다고 볼 수 없다.
const TMP_EXPANDED = /[$*?]|X{3,}|[-_.]$/;

/**
 * 실행이 명령·파일 경로에 직접 적은 /tmp 경로. <OUT> 아래(자기 worktree·TMPDIR)는 뺀다.
 *
 * TMPDIR은 실행마다 나누지만(runClaude의 tmpDir) 경로를 직접 적는 명령은 병렬 실행끼리 같은
 * 파일을 쓴다 — t3의 두 실행이 `/tmp/probe.bak`에 백업을 두고 서로 덮었다(#545). 막지는
 * 못하므로, 다른 실행과 겹친 경로를 cmdGrade가 tmp_shared_with로 드러낸다.
 */
function tmpPaths(log, out) {
  const own = out.replace(/^\/private(?=\/tmp\/)/, '');
  const found = new Set();
  for (const { input = {} } of toolCalls(log)) {
    const text = [input.command, input.file_path, input.path]
      .filter(v => typeof v === 'string')
      .join('\n');
    for (const [, match] of text.matchAll(TMP_PATH)) {
      const path = match.replace(/\/+$/, '');
      if (TMP_EXPANDED.test(path)) continue;
      if (path !== own && !path.startsWith(`${own}/`)) found.add(path);
    }
  }
  return [...found].sort();
}

function gates(wt, filters) {
  const flags = filters.map(f => `--filter=${f}`);
  const out = {};
  for (const task of ['lint', 'check-types', 'test']) {
    const run = spawnSync(
      'pnpm',
      ['turbo', 'run', task, ...flags, '--force', '--output-logs=errors-only'],
      {
        cwd: wt,
        encoding: 'utf8',
        timeout: 1_800_000,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    out[`gate_${task}`] = run.status === 0;
    if (run.status !== 0) {
      out[`gate_${task}_tail`] = `${run.stdout}${run.stderr}`.slice(-1500);
    }
  }
  return out;
}

// ── 하위 명령 ────────────────────────────────────────────────────────────────

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArm(spec) {
  const [name, ...rest] = spec.split('=');
  const path = rest.join('=');
  if (!ARM_NAME.test(name)) {
    fail(`조건 이름은 소문자·숫자·밑줄만 쓴다(실행 id를 -로 나눈다): ${name}`);
  }
  if (name === 'off') {
    if (path) fail('off는 파일을 받지 않는다');
    return [name, null];
  }
  if (!path) fail(`--arm ${name}=<SKILL.md 파일> 꼴로 준다`);
  const src = resolve(path);
  if (!existsSync(src) || !statSync(src).isFile()) fail(`없는 파일: ${src}`);
  return [name, src];
}

async function pool(items, size, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, worker),
  );
}

async function cmdRun(out, opts) {
  for (const sub of ['skills', 'logs', 'wt']) {
    mkdirSync(join(out, sub), { recursive: true });
  }
  if (!opts.arm?.length)
    fail('--arm을 하나 이상 준다(이름=SKILL.md 파일, 또는 off)');
  const arms = {};
  for (const [name, src] of opts.arm.map(parseArm)) {
    // 실행 도중 원본을 고쳐도 조건이 바뀌지 않게 OUT에 고정해 둔다.
    if (src) {
      const fixed = join(out, 'skills', `${name}.md`);
      copyFileSync(src, fixed);
      arms[name] = fixed;
    } else {
      arms[name] = null;
    }
  }
  const tasks = opts.tasks ? opts.tasks.split(',') : Object.keys(TASKS);
  for (const t of tasks) if (!TASKS[t]) fail(`없는 과제: ${t}`);
  const reps = Number(opts.reps);
  const runs = [];
  for (let r = 1; r <= reps; r += 1) {
    for (const t of tasks)
      for (const a of Object.keys(arms)) runs.push([t, a, r]);
  }
  // 준비는 직렬로 — worktree 추가와 pnpm install이 같은 저장소·스토어를 만진다.
  for (const [t, a, r] of runs) {
    prepareWorktree(join(out, 'wt', `${t}-${a}-${r}`), TASKS[t].base, arms[a]);
  }
  await pool(runs, Number(opts.par), async ([t, a, r]) => {
    const id = `${t}-${a}-${r}`;
    const log = join(out, 'logs', `${id}.jsonl`);
    if ('cost_usd' in summarize(log)) {
      console.log('done', id, '(이미 있음)');
      return;
    }
    await runClaude(
      join(out, 'wt', id),
      `${TASKS[t].prompt}\n\n${SPEC.suffix}`,
      {
        model: opts.model,
        log,
        extra: ['--max-budget-usd', String(opts.budget)],
        tmpDir: join(out, 'tmp', id),
      },
    );
    console.log('done', id);
  });
}

function cell(values) {
  const present = values.filter(v => v !== null && v !== undefined);
  if (present.length === 0) return '—';
  if (present.every(v => typeof v === 'boolean')) {
    return `${present.filter(Boolean).length}/${values.length}`;
  }
  if (present.every(Array.isArray)) {
    const mean = present.reduce((n, v) => n + v.length, 0) / present.length;
    return `${mean.toFixed(2)} (길이)`;
  }
  if (present.every(v => typeof v === 'number')) {
    const mean = present.reduce((n, v) => n + v, 0) / present.length;
    const missing =
      present.length === values.length
        ? ''
        : ` ${present.length}/${values.length}`;
    return `${mean.toFixed(2)} (${present.join('·')})${missing}`;
  }
  return '—';
}

function printSummary(rows) {
  const skip = new Set(['id', 'task', 'arm', 'final']);
  for (const task of [...new Set(rows.map(r => r.task))].sort()) {
    const group = rows.filter(r => r.task === task);
    const arms = [...new Set(group.map(r => r.arm))];
    const keys = [
      ...new Set(
        group.flatMap(r =>
          Object.keys(r).filter(k => !skip.has(k) && !k.endsWith('_tail')),
        ),
      ),
    ];
    console.log(`\n### ${task} — ${TASKS[task].title}\n`);
    const n = a => group.filter(r => r.arm === a).length;
    console.log(`| 지표 | ${arms.map(a => `${a} (n=${n(a)})`).join(' | ')} |`);
    console.log(`|---|${arms.map(() => '---|').join('')}`);
    for (const k of keys) {
      const cells = arms.map(a =>
        cell(group.filter(r => r.arm === a).map(r => r[k])),
      );
      console.log(`| ${k} | ${cells.join(' | ')} |`);
    }
  }
}

function cmdGrade(out, opts) {
  mkdirSync(join(out, 'grades'), { recursive: true });
  const rows = [];
  const ids = readdirSync(join(out, 'wt'))
    .filter(name => RUN_ID.test(name))
    .sort();
  for (const id of ids) {
    const wt = join(out, 'wt', id);
    const [task, arm] = id.split('-');
    // --no-gates로 다시 채점할 때는 전에 잰 게이트 결과를 지우지 않고 옮겨 온다.
    const previous = join(out, 'grades', `${id}.json`);
    const keptGates =
      opts['no-gates'] && existsSync(previous)
        ? Object.fromEntries(
            Object.entries(JSON.parse(readFileSync(previous, 'utf8'))).filter(
              ([k]) => k.startsWith('gate_'),
            ),
          )
        : {};
    const log = join(out, 'logs', `${id}.jsonl`);
    const row = {
      id,
      task,
      arm,
      ...summarize(log),
      ...hygiene(wt),
      ...CHECKS[task](wt),
      ...(opts['no-gates'] ? keptGates : gates(wt, TASKS[task].filters)),
      tmp_paths: tmpPaths(log, out),
    };
    writeFileSync(previous, JSON.stringify(row, null, 1));
    console.error('graded', id);
    rows.push(row);
  }
  // 같은 /tmp 경로를 직접 쓰면서 시간이 겹친 다른 실행 — 서로의 파일을 덮었을 수 있다. 실행
  // 구간은 대화 기록을 마지막으로 쓴 시각에서 세션 길이를 빼 어림한다.
  const span = new Map(
    rows.map(r => {
      const log = join(out, 'logs', `${r.id}.jsonl`);
      if (!existsSync(log)) return [r.id, null];
      const end = statSync(log).mtimeMs;
      return [r.id, [end - (r.minutes ?? 0) * 60_000, end]];
    }),
  );
  const overlaps = (a, b) => {
    const [x, y] = [span.get(a.id), span.get(b.id)];
    return x !== null && y !== null && x[0] < y[1] && y[0] < x[1];
  };
  for (const row of rows) {
    row.tmp_shared_with = rows
      .filter(
        o =>
          o !== row &&
          overlaps(row, o) &&
          o.tmp_paths.some(p => row.tmp_paths.includes(p)),
      )
      .map(o => o.id);
    writeFileSync(
      join(out, 'grades', `${row.id}.json`),
      JSON.stringify(row, null, 1),
    );
  }
  printSummary(rows);
  const shared = rows.filter(r => r.tmp_shared_with.length > 0);
  if (shared.length > 0) {
    console.log(
      `\n/tmp 경로가 다른 실행과 겹친 실행 — 최종 보고에서 덮어쓴 흔적을 확인한다: ${shared.map(r => r.id).join(', ')}`,
    );
  }
}

/**
 * 채점 함수의 양성·음성 대조. base는 과제 전 상태, ref는 머지된 기준 답안이다.
 *
 * t2의 ref(#538)는 archived를 더하지 않고 사본만 파생으로 바꾼 커밋이라, copies_left가
 * 비고 archived_is_post·archived_admin_state는 거짓이어야 맞다(archived_hidden은 모르는
 * 상태도 비공개라 base에서부터 참이다). t1의 ref(#542)에서는 모두 참이어야 한다.
 * t3의 ref(#541)는 위반 0, 손 판정 0, 사본 없음, 두 분기 모두 테스트가 맞다.
 * 채점이 도구를 돌리는 과제(needs_install)는 worktree에 의존성을 먼저 깐다.
 */
function cmdSelftest(opts) {
  const ids = opts.tasks ? opts.tasks.split(',') : Object.keys(TASKS);
  for (const t of ids) if (!TASKS[t]) fail(`없는 과제: ${t}`);
  const tmp = mkdtempSync(join(tmpdir(), 'strict-design-selftest-'));
  try {
    for (const task of ids.map(t => TASKS[t])) {
      for (const label of ['base', 'ref']) {
        const wt = join(tmp, `${task.id}-${label}`);
        git(REPO, 'worktree', 'add', '-q', '--detach', wt, task[label]);
        try {
          if (task.needs_install) install(wt);
          console.log(
            task.id,
            label,
            task[label],
            JSON.stringify(CHECKS[task.id](wt)),
          );
        } finally {
          removeWorktree(wt);
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function cmdClean(out) {
  for (const dir of ['wt', 'trigger-wt']) {
    const parent = join(out, dir);
    if (!existsSync(parent)) continue;
    for (const name of readdirSync(parent)) removeWorktree(join(parent, name));
  }
  git(REPO, 'worktree', 'prune');
}

const USAGE = `사용법:
  node ab.mjs run <OUT> --arm 이름=SKILL.md [--arm off] [--tasks t1,t2] [--reps 3] [--par 4] [--model opus] [--budget 25]
  node ab.mjs grade <OUT> [--no-gates]
  node ab.mjs selftest [--tasks t3]
  node ab.mjs clean <OUT>`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    arm: { type: 'string', multiple: true },
    tasks: { type: 'string' },
    reps: { type: 'string', default: '3' },
    par: { type: 'string', default: '4' },
    model: { type: 'string', default: 'opus' },
    budget: { type: 'string', default: '25' },
    'no-gates': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
});
const [cmd, outArg] = positionals;
if (opts.help || !cmd) {
  console.log(USAGE);
  process.exit(cmd ? 0 : 2);
}
const out = outArg ? resolve(outArg) : undefined;
if (cmd !== 'selftest' && !out) fail(USAGE);
switch (cmd) {
  case 'run':
    await cmdRun(out, opts);
    break;
  case 'grade':
    cmdGrade(out, opts);
    break;
  case 'selftest':
    cmdSelftest(opts);
    break;
  case 'clean':
    cmdClean(out);
    break;
  default:
    fail(USAGE);
}
