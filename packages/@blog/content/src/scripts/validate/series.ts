/**
 * 시리즈 선언(`_series.yml`) **판정 사슬** — 파일 하나가 아니라 선언과 그 폴더의
 * 글들을 함께 봐야 하는 규칙들(rules.ts에서 scope가 `series`인 행).
 *
 * 로더(`src/post/series.ts`)는 이 파일을 **관대하게** 읽는다: 모르는 키(`orders:`
 * 오타)·배열이 아닌 `order`·문자열 아닌 항목은 조용히 버리고, 어떤 글과도 맞지
 * 않는 `order` 항목도 그냥 지나친다. 그러면 저자가 정한 읽는 순서가 사라지거나
 * (그 글은 시리즈 끝으로 밀린다) 이전/다음 내비게이션이 어긋나는데, 빌드는
 * 성공한다. 그 침묵을 여기서 깬다.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import matter from 'gray-matter';
import { isPostFile } from '../../post/index.ts';
import { isRecord } from '../../shared/guards.ts';
import { effectiveSlug } from './shared.ts';
import type { Issue, PostRecord } from './shared.ts';
import { resolveSeverity } from './rules.ts';

/** 시리즈 선언 파일 이름 — 로더(`series.ts`)가 읽는 것과 같은 하나뿐이다. */
export const SERIES_FILENAME = '_series.yml';

/** 로더가 읽는 키 — 나머지는 조용히 버려진다. */
const SERIES_KEYS = ['title', 'description', 'order'] as const;

/** 원고 폴더 아래의 `_series.yml` 전부(절대 경로). */
export function findSeriesFiles(postsDir: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === SERIES_FILENAME) found.push(full);
    }
  };
  walk(postsDir);
  return found.sort();
}

/** `key:`로 시작하는 줄의 1-based 번호 — 없으면 null. */
function keyLine(raw: string, key: string): number | null {
  const index = raw
    .split('\n')
    .findIndex(line => new RegExp(`^${key}\\s*:`).test(line));
  return index === -1 ? null : index + 1;
}

/**
 * 선언 하나를 검사한다.
 *
 * @param relPath 원고 폴더 기준 경로(`bundler/_series.yml`, `/` 구분)
 * @param raw     파일 내용
 * @param records 원고 전체의 레코드 — `order` 항목을 이 폴더의 글과 맞춰 본다
 */
export function validateSeriesFile(
  relPath: string,
  raw: string,
  records: readonly PostRecord[],
): Issue[] {
  const issue = (
    rule:
      'invalid-series-meta' | 'unknown-series-key' | 'unmatched-series-order',
    line: number | null,
    message: string,
  ): Issue => ({
    file: relPath,
    line,
    severity: resolveSeverity(rule, {}),
    rule,
    message,
  });

  // 로더와 같은 방식으로 읽는다(frontmatter로 감싸 gray-matter에 넘긴다).
  let data: unknown;
  try {
    data = matter(`---\n${raw}\n---\n`).data;
  } catch (e) {
    return [
      issue(
        'invalid-series-meta',
        null,
        `YAML을 읽을 수 없습니다 — 빌드의 시리즈 리더가 이 파일에서 멈춥니다: ${e instanceof Error ? (e.message.split('\n')[0] ?? e.message) : String(e)}`,
      ),
    ];
  }
  if (!isRecord(data)) {
    return [
      issue(
        'invalid-series-meta',
        null,
        '`title`·`description`·`order`를 담은 매핑이어야 합니다',
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const key of Object.keys(data)) {
    if ((SERIES_KEYS as readonly string[]).includes(key)) continue;
    issues.push(
      issue(
        'unknown-series-key',
        keyLine(raw, key),
        `알 수 없는 키 \`${key}\` — 시리즈 리더가 조용히 버립니다(허용: ${SERIES_KEYS.join(', ')}). 오타가 아닌지 확인하세요`,
      ),
    );
  }

  for (const key of ['title', 'description'] as const) {
    if (key in data && typeof data[key] !== 'string') {
      issues.push(
        issue(
          'invalid-series-meta',
          keyLine(raw, key),
          `\`${key}\`는 문자열이어야 합니다 — 아니면 조용히 버려집니다: ${JSON.stringify(data[key])}`,
        ),
      );
    }
  }

  if (!('order' in data)) return issues;
  const order = data['order'];
  if (!Array.isArray(order) || order.some(entry => typeof entry !== 'string')) {
    issues.push(
      issue(
        'invalid-series-meta',
        keyLine(raw, 'order'),
        `\`order\`는 slug 문자열의 배열이어야 합니다 — 아니면 통째로(또는 그 항목만) 버려져 날짜순으로 돌아갑니다: ${JSON.stringify(order)}`,
      ),
    );
    return issues;
  }

  // 이 폴더에 **바로** 든 글만 이 시리즈다(하위 폴더는 자기 시리즈). 정렬은
  // 글의 slug와 파일 경로 slug 둘 다로 맞추므로(sortPostsBySeriesOrder) 여기도 둘 다 본다.
  const folder = posix.dirname(relPath);
  const known = new Set<string>();
  for (const record of records) {
    if (!isPostFile(record.data)) continue;
    const recordPath = record.relPath.split(/[/\\]/).join('/');
    if (posix.dirname(recordPath) !== folder) continue;
    known.add(effectiveSlug(record));
    known.add(recordPath.replace(/\.(md|mdx)$/, ''));
  }
  const unmatched = (order as string[]).filter(entry => !known.has(entry));
  if (unmatched.length > 0) {
    issues.push(
      issue(
        'unmatched-series-order',
        keyLine(raw, 'order'),
        `\`order\`의 항목이 이 폴더의 어떤 글과도 맞지 않습니다 — 그 글은 읽는 순서에서 빠져 시리즈 끝으로 밀리고 이전/다음이 어긋납니다. slug를 확인하세요: ${unmatched.join(', ')}`,
      ),
    );
  }
  return issues;
}

/** 원고 폴더의 선언 전부를 검사한다 — validate-posts 진입점이 부른다. */
export function validateSeriesDeclarations(
  postsDir: string,
  records: readonly PostRecord[],
  readFile: (absPath: string) => string,
): Issue[] {
  return findSeriesFiles(postsDir).flatMap(absPath =>
    validateSeriesFile(
      relative(postsDir, absPath).split(sep).join('/'),
      readFile(absPath),
      records,
    ),
  );
}
