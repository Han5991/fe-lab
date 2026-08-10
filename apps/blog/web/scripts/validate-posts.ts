import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve, dirname, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { collectMarkdownFiles, hasFrontmatter } from '@/lib/postFiles';
import { hasAmbiguousTimezone } from '@/lib/dates';
import {
  TITLE_SUFFIX,
  SEO_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
} from '@/lib/constants';
import { POST_STATUSES, isPostStatus, isPostFile } from '@/domain/post';
// 이름 목록만 있는 모듈에서 가져옵니다. registry.ts(=.tsx 컴포넌트 의존)를 직접
// 참조하면 이 노드 스크립트가 React·Panda까지 끌고 들어옵니다.
import { DIAGRAM_NAMES, isDiagramName } from '@/domain/post/diagramNames';
import { SUPPORTED_FENCE_LABELS } from '@/src/components/post/prismLanguages';

const POSTS_DIR = resolve(process.cwd(), '..', 'posts');

/**
 * repository.ts / types.ts / visibility.ts 에서 **실제로 읽는** 키 전체.
 * 여기에 없는 키가 frontmatter에 있으면 unknown-frontmatter-key 경고를 냅니다.
 *
 * 의도적으로 뺀 키:
 * - `published` — status로 통합됨. 아래 legacy-published-field 규칙이 에러로 잡습니다.
 * - `description` — excerpt와 역할이 겹치는데 어떤 코드도 읽지 않았습니다.
 * - `draft`, `category` — 읽는 코드가 없는 유령 키.
 * - `series` — 시리즈는 폴더 경로로 결정됩니다(repository.ts). frontmatter 값은 무시됩니다.
 * - `order` — `_series.yml` 전용인데 collectMarkdownFiles가 `.yml`을 수집하지 않아
 *             애초에 이 검사에 들어오지 않습니다.
 */
const KNOWN_FRONTMATTER_KEYS = new Set([
  'title',
  'seoTitle',
  'date',
  'updatedAt',
  'slug',
  'excerpt',
  'thumbnail',
  'tags',
  'status',
  'scheduledDate',
  'hero',
]);

type Severity = 'error' | 'warning';

export interface Issue {
  file: string;
  line: number | null;
  severity: Severity;
  rule: string;
  message: string;
}

export interface PostRecord {
  absPath: string;
  relPath: string;
  data: Record<string, unknown>;
  content: string;
}

function findFrontmatterLine(raw: string, key: string): number | null {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return null;
    const m = lines[i].match(/^(\w+)\s*:/);
    if (m && m[1] === key) return i + 1;
  }
  return null;
}

export function validatePost(record: PostRecord, raw: string): Issue[] {
  const { data, relPath, absPath } = record;
  const issues: Issue[] = [];

  // 폐기된 published 필드 — status로 통합됨. status와 공존하면 조용히 무시되므로 에러.
  if ('published' in data) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'published'),
      severity: 'error',
      rule: 'legacy-published-field',
      message: `\`published\`는 더 이상 쓰지 않습니다. \`status: ${POST_STATUSES.join(' | ')}\`로 바꾸세요. (\`status\`가 함께 있으면 \`published\`는 조용히 무시됩니다)`,
    });
  }

  if ('status' in data && !isPostStatus(data.status)) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'status'),
      severity: 'error',
      rule: 'invalid-status',
      message: `\`status\`는 ${POST_STATUSES.join(', ')} 중 하나여야 합니다.`,
    });
  }

  // 유효한 status가 없으면 빌드에서 제외됩니다 (repository.ts의 parsePost와 동일 규칙).
  // published가 남아 있는 경우는 위에서 이미 에러로 잡았으므로 여기서 조용히 넘어가지 않습니다.
  if (!isPostFile(data) && !('published' in data) && !('status' in data)) {
    issues.push({
      file: relPath,
      line: 1,
      severity: 'warning',
      rule: 'meta-file-skipped',
      message:
        '유효한 `status`가 없어 빌드에서 제외됩니다. 메타 파일이면 무시해도 됩니다.',
    });
    return issues;
  }

  // unknown frontmatter key 경고 — 오타(예: `tag` → `tags`, `scheduled` → `scheduledDate`) 조기 감지
  for (const key of Object.keys(data)) {
    if (!KNOWN_FRONTMATTER_KEYS.has(key)) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, key),
        severity: 'warning',
        rule: 'unknown-frontmatter-key',
        message: `알 수 없는 frontmatter 키: \`${key}\`. 오타가 아닌지 확인하세요. (허용 키: ${[...KNOWN_FRONTMATTER_KEYS].join(', ')})`,
      });
    }
  }

  // 문자열이어야 하는 키가 다른 타입이면 repository.ts의 toOptionalString이 값을
  // 통째로 버리고 폴백합니다(slug는 파일 경로로, excerpt는 본문 앞 160자로,
  // thumbnail은 생성 OG 카드로). 특히 `slug: 123` 같은 실수는 **URL이 조용히
  // 바뀌는** 결과가 되므로 에러로 막습니다.
  for (const key of ['slug', 'excerpt', 'thumbnail', 'seoTitle'] as const) {
    if (key in data && typeof data[key] !== 'string') {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, key),
        severity: 'error',
        rule: 'non-string-field',
        message: `\`${key}\`는 문자열이어야 합니다. 다른 타입이면 값이 무시되고 기본값으로 폴백합니다${key === 'slug' ? ' (slug는 파일 경로 기반으로 대체되어 URL이 바뀝니다)' : ''}: ${JSON.stringify(data[key])}`,
      });
    }
  }

  if (!data.title || typeof data.title !== 'string') {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'title'),
      severity: 'error',
      rule: 'missing-title',
      message: '`title` 필드가 필요합니다.',
    });
  }

  // `<title>`은 `{seoTitle ?? title}{TITLE_SUFFIX}`로 조립됩니다(postSeo.ts).
  // 이 블로그는 `[Typescript로 설계하는 프로젝트]` 같은 긴 시리즈 접두사를 제목에
  // 넣기 때문에 접미사까지 더하면 쉽게 60자를 넘고, 검색 결과에서 뒤가 잘립니다.
  // 제목 자체를 줄이면 글의 정체성이 상하므로 `seoTitle`로 `<title>`만 줄입니다.
  const effectiveTitle =
    typeof data.seoTitle === 'string' && data.seoTitle !== ''
      ? data.seoTitle
      : typeof data.title === 'string'
        ? data.title
        : '';
  const renderedTitleLength = effectiveTitle.length + TITLE_SUFFIX.length;
  if (effectiveTitle && renderedTitleLength > SEO_TITLE_MAX_LENGTH) {
    issues.push({
      file: relPath,
      line:
        findFrontmatterLine(raw, 'seoTitle') ??
        findFrontmatterLine(raw, 'title'),
      severity: 'warning',
      rule: 'long-title',
      message: `\`<title>\`이 ${renderedTitleLength}자입니다(접미사 \`${TITLE_SUFFIX}\` 포함, 권장 ${SEO_TITLE_MAX_LENGTH}자 이하). 검색 결과에서 잘립니다 — \`seoTitle\`에 ${SEO_TITLE_MAX_LENGTH - TITLE_SUFFIX.length}자 이하의 짧은 제목을 넣으세요(화면 제목과 OG 카드는 \`title\` 그대로 나갑니다).`,
    });
  }

  // excerpt가 없으면 본문 앞 160자를 잘라 `...`를 붙인 값이 그대로 meta
  // description이 됩니다(repository.ts). 도입부가 비슷한 글끼리는 그 발췌가
  // **글자 단위로 완전히 겹쳐서** 중복 콘텐츠 신호가 되고, 실제로 시리즈의
  // 본편/DI편 같은 짝에서 description이 똑같아진 적이 있습니다.
  //
  // 빈 문자열(`excerpt: ''`)도 같은 취급입니다 — repository.ts의 toOptionalString이
  // 빈 문자열을 "값 없음"으로 떨어뜨려 똑같이 자동 발췌로 폴백하는데, 키가 있다는
  // 이유로 넘어가면 `new-post` 스캐폴딩이 깔아주는 `excerpt: ''`가 영원히 조용합니다.
  if (!('excerpt' in data) || data.excerpt === '') {
    issues.push({
      file: relPath,
      line:
        findFrontmatterLine(raw, 'excerpt') ??
        findFrontmatterLine(raw, 'title'),
      severity: 'warning',
      rule: 'missing-excerpt',
      message: `\`excerpt\`가 ${'excerpt' in data ? '비어 있어' : '없어'} 본문 앞 ${SEO_DESCRIPTION_MAX_LENGTH}자 자동 발췌가 meta description으로 나갑니다. 도입부가 비슷한 글끼리 description이 통째로 겹칠 수 있으니 ${SEO_DESCRIPTION_MIN_LENGTH}~${SEO_DESCRIPTION_MAX_LENGTH}자의 고유한 요약을 적어주세요.`,
    });
  } else if (typeof data.excerpt === 'string') {
    const len = data.excerpt.length;
    if (len < SEO_DESCRIPTION_MIN_LENGTH || len > SEO_DESCRIPTION_MAX_LENGTH) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'excerpt'),
        severity: 'warning',
        rule: 'excerpt-length',
        message: `\`excerpt\`가 ${len}자입니다(권장 ${SEO_DESCRIPTION_MIN_LENGTH}~${SEO_DESCRIPTION_MAX_LENGTH}자). 짧으면 검색 스니펫이 비고, 길면 뒤가 잘립니다.`,
      });
    }
  }

  // `date`는 선택 필드가 아닙니다. 목록 정렬(filtering.ts), 아카이브 연도 필터,
  // sitemap lastmod, RSS pubDate가 모두 이 값을 읽고, `status: scheduled`는 이 값을
  // 공개 시각으로 씁니다(visibility.ts). 없으면 목록에서 날짜가 비고 예약 글은
  // 영원히 비공개가 되는데, 지금까지는 아무 경고 없이 통과했습니다.
  if (data.date == null) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'date'),
      severity: 'error',
      rule: 'missing-date',
      message:
        data.status === 'scheduled'
          ? '`date` 필드가 필요합니다. `status: scheduled`는 `date`를 공개 시각으로 쓰므로, 없으면 영원히 비공개 처리됩니다.'
          : '`date` 필드가 필요합니다. 목록 정렬·아카이브·sitemap·RSS가 모두 이 값을 사용합니다.',
    });
  } else {
    const dateValid =
      data.date instanceof Date ||
      (typeof data.date === 'string' && !Number.isNaN(Date.parse(data.date)));
    if (!dateValid) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'date'),
        severity: 'error',
        rule: 'invalid-date',
        message: `\`date\`가 유효한 날짜가 아닙니다: ${String(data.date)}`,
      });
    } else if (
      typeof data.date === 'string' &&
      hasAmbiguousTimezone(data.date)
    ) {
      // date도 sitemap lastmod / rss pubDate에서 parseScheduledDateKST를 거치므로
      // offset 없는 datetime이면 scheduledDate와 동일하게 환경 의존 회귀가 생긴다.
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'date'),
        severity: 'error',
        rule: 'ambiguous-date',
        message: `\`date\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. \`+09:00\`/\`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.date}`,
      });
    }
  }

  if (data.updatedAt != null) {
    const updatedAtValid =
      data.updatedAt instanceof Date ||
      (typeof data.updatedAt === 'string' &&
        !Number.isNaN(Date.parse(data.updatedAt)));
    if (!updatedAtValid) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'updatedAt'),
        severity: 'error',
        rule: 'invalid-updated-at',
        message: `\`updatedAt\`이 유효한 날짜가 아닙니다: ${String(data.updatedAt)}`,
      });
    } else if (
      typeof data.updatedAt === 'string' &&
      hasAmbiguousTimezone(data.updatedAt)
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'updatedAt'),
        severity: 'error',
        rule: 'ambiguous-updated-at',
        message: `\`updatedAt\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 날짜가 어긋날 수 있습니다. \`+09:00\`/\`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.updatedAt}`,
      });
    }
  }

  // scheduledDate는 반드시 따옴표로 감싼 문자열이어야 합니다.
  // 무따옴표 datetime(`scheduledDate: 2026-06-01T09:00:00+09:00`)은 YAML이 Date
  // 객체로 파싱하고, repository.ts가 문자열이 아닌 값을 버립니다. 그러면 공개 시각이
  // date로 폴백되는데 date는 KST 자정 기준이라 **의도보다 9시간 일찍 공개**됩니다.
  if ('scheduledDate' in data && typeof data.scheduledDate !== 'string') {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'scheduledDate'),
      severity: 'error',
      rule: 'unquoted-scheduled-date',
      message: `\`scheduledDate\`는 따옴표로 감싼 문자열이어야 합니다. 무따옴표로 쓰면 YAML이 Date 객체로 파싱해 값이 버려지고, 공개 시각이 \`date\`(KST 자정)로 폴백되어 의도보다 9시간 일찍 공개됩니다. 예: \`scheduledDate: '2026-06-01T09:00:00+09:00'\``,
    });
  }

  if (data.status === 'scheduled') {
    // 공개 시각이 아예 없는 경우는 위의 missing-date가 잡습니다. 예전에는 여기서
    // scheduled-without-date로 따로 검사했지만, date가 필수가 되면서 그 조건
    // (`scheduledDate도 date도 없음`)은 missing-date에 완전히 포섭돼 같은 파일에
    // 에러 두 개가 뜰 뿐이었습니다.
    if (
      typeof data.scheduledDate === 'string' &&
      Number.isNaN(Date.parse(data.scheduledDate))
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'scheduledDate'),
        severity: 'error',
        rule: 'invalid-scheduled-date',
        message: `\`scheduledDate\`가 유효한 날짜가 아닙니다: ${data.scheduledDate}`,
      });
    } else if (
      typeof data.scheduledDate === 'string' &&
      hasAmbiguousTimezone(data.scheduledDate)
    ) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'scheduledDate'),
        severity: 'error',
        rule: 'ambiguous-scheduled-date',
        message: `\`scheduledDate\`에 timezone offset이 없어 빌드 환경(UTC)과 로컬(KST)에서 발행 시각이 ~9시간 어긋날 수 있습니다. \`+09:00\` 또는 \`Z\`를 명시하거나 'YYYY-MM-DD' 형식을 쓰세요: ${data.scheduledDate}`,
      });
    }
  }

  if ('tags' in data) {
    // 배열이 아니거나 문자열 아닌 원소가 섞이면 repository.ts가 tags를 통째로
    // undefined로 떨어뜨립니다(조용한 유실). 그래서 원소 타입까지 검사합니다.
    if (!Array.isArray(data.tags)) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'tags'),
        severity: 'error',
        rule: 'invalid-tags',
        message: '`tags`는 배열이어야 합니다. 예: `tags: [bundler, build]`',
      });
    } else if (data.tags.some(tag => typeof tag !== 'string')) {
      issues.push({
        file: relPath,
        line: findFrontmatterLine(raw, 'tags'),
        severity: 'error',
        rule: 'invalid-tags',
        message: `\`tags\`의 모든 원소는 문자열이어야 합니다. 문자열이 아닌 값이 하나라도 있으면 태그 전체가 무시됩니다: ${JSON.stringify(data.tags)}`,
      });
    } else {
      // 렌더 계층(repository.toStringArray)이 중복을 걷어내므로 화면은 멀쩡하다.
      // 다만 frontmatter에 남아 있으면 저자가 눈치채지 못하므로 경고로 알린다.
      const seen = new Set<string>();
      const dupes = new Set<string>();
      for (const tag of data.tags as string[]) {
        if (seen.has(tag)) dupes.add(tag);
        seen.add(tag);
      }
      if (dupes.size > 0) {
        issues.push({
          file: relPath,
          line: findFrontmatterLine(raw, 'tags'),
          severity: 'warning',
          rule: 'duplicate-tags',
          message: `\`tags\`에 중복이 있습니다(렌더 시 하나로 합쳐집니다): ${[...dupes].join(', ')}`,
        });
      }
    }
  }

  // `hero`는 코드에 등록된 다이어그램 이름만 받습니다. 미등록 이름은 렌더 계층이
  // 조용히 썸네일로 폴백하기 때문에(글이 죽지 않도록 일부러 그렇게 만들었습니다)
  // 글쓴이는 "왜 다이어그램이 안 나오지" 상태로 방치됩니다. 그 침묵을 여기서 깹니다.
  if ('hero' in data && !isDiagramName(data.hero)) {
    issues.push({
      file: relPath,
      line: findFrontmatterLine(raw, 'hero'),
      severity: 'error',
      rule: 'unknown-hero-diagram',
      message: `\`hero\`는 등록된 다이어그램 이름이어야 합니다 (${DIAGRAM_NAMES.join(', ')}). 새 다이어그램이라면 domain/post/diagramNames.ts와 src/components/diagram/registry.ts에 먼저 등록하세요: ${JSON.stringify(data.hero)}`,
    });
  }

  if ('thumbnail' in data && typeof data.thumbnail === 'string') {
    const thumb = data.thumbnail;
    if (!/^https?:\/\//.test(thumb) && !thumb.startsWith('/')) {
      const resolved = resolve(dirname(absPath), thumb);
      if (!existsSync(resolved)) {
        issues.push({
          file: relPath,
          line: findFrontmatterLine(raw, 'thumbnail'),
          severity: 'error',
          rule: 'missing-thumbnail',
          message: `썸네일 파일을 찾을 수 없습니다: ${thumb}`,
        });
      }
    }
  }

  return issues;
}

function frontmatterOffset(raw: string): number {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return i + 1;
  }
  return 0;
}

function validateImageReferences(record: PostRecord, raw: string): Issue[] {
  const { content, absPath, relPath } = record;
  const issues: Issue[] = [];
  const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const offset = frontmatterOffset(raw);

  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(content)) !== null) {
    const [, alt, ref] = match;
    const lineInContent = content.slice(0, match.index).split('\n').length;

    // alt가 비면 스크린리더는 파일 URL을 읽거나 그냥 건너뛴다. 이미지가 다이어그램인
    // 이 블로그에서는 그림이 설명의 본체인 경우가 많아서 내용이 통째로 사라진다.
    // (장식용 이미지라면 alt를 비우는 게 맞지만, 지금까지 빈 alt는 전부 실수였다.)
    if (alt.trim() === '') {
      issues.push({
        file: relPath,
        line: offset + lineInContent,
        severity: 'warning',
        rule: 'missing-image-alt',
        message: `이미지에 alt 텍스트가 없습니다 — 스크린리더가 읽을 설명을 적어주세요: ${ref}`,
      });
    }

    if (
      /^https?:\/\//.test(ref) ||
      ref.startsWith('/') ||
      ref.startsWith('data:')
    ) {
      continue;
    }

    const cleanRef = decodeURIComponent(ref.split('#')[0].split('?')[0]);
    const resolved = resolve(dirname(absPath), cleanRef);
    if (!existsSync(resolved)) {
      issues.push({
        file: relPath,
        line: offset + lineInContent,
        severity: 'error',
        rule: 'missing-image',
        message: `이미지 파일을 찾을 수 없습니다: ${cleanRef}`,
      });
    }
  }
  return issues;
}

/**
 * 코드 펜스의 언어 라벨이 CodeBlock에 등록된 언어인지 검사합니다.
 *
 * CodeBlock은 refractor 전 언어를 번들하는 대신 `prismLanguages.ts`에 적힌
 * 언어만 등록합니다(번들 gzip 350KB 절감). 등록되지 않은 라벨은 에러 없이
 * 그냥 강조 없는 평문으로 렌더되기 때문에, 글쓴이가 알아채기 어렵습니다.
 * 그 조용한 품질 저하를 빌드 시점 경고로 끌어올립니다.
 *
 * 중첩 펜스(마크다운 글이 코드 예시로 ```를 품는 경우)를 오탐하지 않도록,
 * 여는 펜스의 백틱 개수를 기억했다가 같은 개수 이상으로 닫힐 때까지는
 * 내부를 검사하지 않습니다.
 */
function validateCodeFenceLanguages(record: PostRecord, raw: string): Issue[] {
  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);
  const lines = record.content.split('\n');
  let openFenceLength = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s{0,3})(`{3,})(.*)$/);
    if (!m) continue;
    const fenceLength = m[2].length;
    const info = m[3].trim();

    if (openFenceLength > 0) {
      // 열려 있는 펜스는 라벨 없는 같은 길이 이상의 펜스로만 닫힌다.
      if (fenceLength >= openFenceLength && info === '') openFenceLength = 0;
      continue;
    }

    openFenceLength = fenceLength;
    if (info === '') continue;

    // ```ts title="a.ts" 처럼 뒤에 메타가 붙는 경우 첫 토큰만 언어다.
    const label = info.split(/[\s,{]/)[0].toLowerCase();
    if (!label || SUPPORTED_FENCE_LABELS.has(label)) continue;

    issues.push({
      file: record.relPath,
      line: offset + i + 1,
      severity: 'warning',
      rule: 'unregistered-code-language',
      message: `구문 강조에 등록되지 않은 언어입니다: \`${label}\` — 강조 없이 평문으로 렌더됩니다. src/components/post/prismLanguages.ts에 추가하거나 평문 라벨(text)을 쓰세요.`,
    });
  }

  return issues;
}

/**
 * 본문에 `# ` 헤딩(h1)이 있는지 검사합니다.
 *
 * 페이지의 h1은 글 제목 하나뿐이어야 하는데, 예전 글들은 본문 첫 줄에 제목을
 * 한 번 더 적거나 절 제목을 `#`으로 시작해서 렌더된 HTML에 h1이 2~4개 있었습니다.
 * 렌더 계층이 h1을 h2로 강등해 페이지 자체는 이제 항상 h1 하나지만
 * (src/components/post/markdownHeadings.tsx), 그 조용한 교정 때문에 글쓴이는
 * 원문이 틀렸다는 걸 영영 모릅니다. `hero`와 같은 방식으로 그 침묵을 깹니다.
 *
 * 코드 펜스 안의 `# 주석`은 헤딩이 아니므로 제외합니다 —
 * validateCodeFenceLanguages와 같은 펜스 추적 규칙을 씁니다.
 *
 * 빌드에서 제외되는 메타 노트(유효한 `status` 없음)는 렌더될 일이 없으므로
 * 검사하지 않습니다 — 기획 문서의 `# 제목`까지 잡으면 경고만 늘고 고칠 것이 없습니다.
 */
export function validateBodyHeadings(record: PostRecord, raw: string): Issue[] {
  if (!isPostFile(record.data)) return [];

  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);
  const lines = record.content.split('\n');
  let openFenceLength = 0;

  for (let i = 0; i < lines.length; i++) {
    const fence = lines[i].match(/^(\s{0,3})(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const fenceLength = fence[2].length;
      if (openFenceLength > 0) {
        if (fenceLength >= openFenceLength && fence[3].trim() === '') {
          openFenceLength = 0;
        }
      } else {
        openFenceLength = fenceLength;
      }
      continue;
    }
    if (openFenceLength > 0) continue;
    if (!/^# /.test(lines[i])) continue;

    issues.push({
      file: record.relPath,
      line: offset + i + 1,
      severity: 'warning',
      rule: 'body-h1',
      message: `본문에 h1(\`# \`)이 있습니다 — 페이지의 h1은 글 제목 하나뿐이어야 합니다. 제목의 중복이면 줄을 지우고, 절 제목이면 \`## \`로 내리세요. (렌더 시에는 h2로 강등되지만 원문은 그대로입니다): ${lines[i].trim()}`,
    });
  }

  return issues;
}

// 명시 slug가 없으면 파일경로(확장자 제거)를 기본 slug로 사용 — repository.ts의 rawSlug 규칙과 동일
function deriveDefaultSlug(relPath: string): string {
  return relPath.replace(/\.(md|mdx)$/, '');
}

export function detectDuplicateSlugs(records: PostRecord[]): Issue[] {
  const slugMap = new Map<string, string[]>();
  for (const r of records) {
    const explicit = typeof r.data.slug === 'string' ? r.data.slug : null;
    const effective = explicit ?? deriveDefaultSlug(r.relPath);
    const arr = slugMap.get(effective) ?? [];
    arr.push(r.relPath);
    slugMap.set(effective, arr);
  }

  const issues: Issue[] = [];
  for (const [slug, files] of slugMap.entries()) {
    if (files.length < 2) continue;
    for (const file of files) {
      issues.push({
        file,
        line: null,
        severity: 'error',
        rule: 'duplicate-slug',
        message: `slug \`${slug}\`이(가) 다른 글과 충돌합니다 (명시 slug ↔ 파일명 기반 slug 포함 검사): ${files.filter(f => f !== file).join(', ')}`,
      });
    }
  }
  return issues;
}

function format(issue: Issue): string {
  const tag = issue.severity === 'error' ? '✖' : '⚠';
  const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `  ${tag} ${loc}\n    [${issue.rule}] ${issue.message}`;
}

function main() {
  const allFiles = collectMarkdownFiles(POSTS_DIR);
  const records: PostRecord[] = [];
  const allIssues: Issue[] = [];

  for (const absPath of allFiles) {
    const raw = readFileSync(absPath, 'utf8');
    if (!hasFrontmatter(raw)) continue;
    const { data, content } = matter(raw);
    const relPath = posix.normalize(relative(POSTS_DIR, absPath));
    const record: PostRecord = { absPath, relPath, data, content };
    records.push(record);
    allIssues.push(...validatePost(record, raw));
    allIssues.push(...validateImageReferences(record, raw));
    allIssues.push(...validateCodeFenceLanguages(record, raw));
    allIssues.push(...validateBodyHeadings(record, raw));
  }

  allIssues.push(...detectDuplicateSlugs(records));

  if (allIssues.length === 0) {
    console.log(`✓ ${records.length}개 포스트 검증 통과`);
    process.exit(0);
  }

  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');

  console.log(
    `\n포스트 검증 결과: ${records.length}개 검사, 에러 ${errors.length}건, 경고 ${warnings.length}건\n`,
  );

  const grouped = new Map<string, Issue[]>();
  for (const issue of allIssues) {
    const arr = grouped.get(issue.file) ?? [];
    arr.push(issue);
    grouped.set(issue.file, arr);
  }
  for (const [file, issues] of grouped.entries()) {
    console.log(file);
    for (const issue of issues) {
      console.log(format(issue));
    }
    console.log('');
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

// 스크립트로 직접 실행될 때만 main()을 호출합니다.
// (테스트 등에서 import할 때 main()이 자동 실행되어 process.exit 하는 것을 방지)
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
