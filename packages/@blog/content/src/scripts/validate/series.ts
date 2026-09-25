/**
 * 시리즈 선언(`_series.yml`) 판정 사슬 — 리더는 모르는 키·틀린 `order`를 조용히 버려,
 * 읽는 순서가 사라져도 빌드가 성공한다. 그 침묵을 여기서 깬다.
 */
import { join, posix } from 'node:path';
import {
  isPostFile,
  parseSeriesYaml,
  pathSlug,
  resolvePostSlug,
  SERIES_FILENAME,
  type SeriesMeta,
} from '../../post/index.ts';
import { isRecord } from '../../shared/guards.ts';
import { listFilesRecursive } from '../../shared/postFiles.ts';
import { isKeyLine, yamlErrorCause } from './shared.ts';
import type { Issue, PostRecord } from './shared.ts';
import { resolveSeverity } from './rules.ts';

/** 로더가 읽는 키 — 나머지는 조용히 버려진다. */
const SERIES_KEYS = [
  'title',
  'description',
  'order',
] as const satisfies readonly (keyof SeriesMeta)[];

/** 원고 폴더 아래의 `_series.yml` 전부(원고 폴더 기준 `/` 구분 경로, 정렬). */
export function findSeriesFiles(postsDir: string): string[] {
  return listFilesRecursive(postsDir)
    .filter(rel => posix.basename(rel) === SERIES_FILENAME)
    .sort();
}

/** `key:`로 시작하는 줄의 1-based 번호 — 없으면 null. */
function keyLine(raw: string, key: string): number | null {
  const index = raw.split('\n').findIndex(line => isKeyLine(line, key));
  return index === -1 ? null : index + 1;
}

/** 선언 하나를 검사한다 — `records`(원고 전체)로 `order` 항목을 이 폴더의 글과 맞춰 본다. */
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

  let data: unknown;
  try {
    data = parseSeriesYaml(raw, relPath);
  } catch (e) {
    const cause = yamlErrorCause(e);
    return [
      issue(
        'invalid-series-meta',
        null,
        `YAML을 읽을 수 없습니다 — 빌드의 시리즈 리더가 이 파일에서 멈춥니다: ${cause instanceof Error ? (cause.message.split('\n')[0] ?? cause.message) : String(cause)}`,
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

  // 이 폴더에 바로 든 글만 이 시리즈다. 정렬처럼 slug와 경로 slug 둘 다로 맞춘다.
  const folder = posix.dirname(relPath);
  const known = new Set<string>();
  for (const record of records) {
    if (!isPostFile(record.data)) continue;
    const recordSlug = pathSlug(record.relPath);
    if (posix.dirname(recordSlug) !== folder) continue;
    known.add(resolvePostSlug(record.data['slug'], record.relPath));
    known.add(recordSlug);
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
  return findSeriesFiles(postsDir).flatMap(relPath =>
    validateSeriesFile(relPath, readFile(join(postsDir, relPath)), records),
  );
}
