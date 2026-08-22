/**
 * 서술자 테이블(frontmatterSchema.ts)이 실제 소비처들과 어긋나지 않는지 잠급니다.
 *
 * 테이블은 세 방향으로 소비됩니다:
 * 1. `RawFrontmatter` 타입 파생 — 컴파일 타임(매핑 타입)이라 테스트 불필요.
 * 2. `parsePost`의 좁히기 — 테이블 루프가 아니라 손으로 쓴 코드라서(그 이유는
 *    테이블의 `narrow` 주석 참고) **왕복 프로브**로 일치를 잠급니다.
 * 3. 루트 `CLAUDE.md`의 표 — 생성하지 않는 대신 글자 단위로 대조합니다.
 */
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FRONTMATTER_FIELDS,
  FRONTMATTER_KEYS,
  REJECTED_FRONTMATTER_KEYS,
  rejectionReasonFor,
  type FrontmatterKey,
  type RawFrontmatter,
} from './frontmatterSchema.ts';
import { parsePost } from './repository.ts';
import { testConfig } from './testing.ts';

// 발췌 길이는 설정에서 온다(기본값 없음) — 픽스처의 SEO 예산을 그대로 쓴다.
const PARSE_OPTS = {
  excerptMaxLength: testConfig.seo.descriptionMaxLength,
};

// ── 1. RawFrontmatter의 "전 필드 unknown" 성질 ───────────────────────────────

test('RawFrontmatter: 전 필드가 unknown이라 좁히기 없이는 쓸 수 없다', () => {
  const data: RawFrontmatter = { title: '값' };
  // 이 대입이 "에러 없음"으로 컴파일되면(= gray-matter의 any가 파생 과정에서
  // 새어 들어오면) 아래 expect-error가 미사용이 되어 check-types가 실패합니다.
  // @ts-expect-error — title은 unknown: 좁히기 없이 string에 대입할 수 없어야 한다
  const direct: string = data.title;
  expect(direct).toBe('값');
});

// ── 2. parsePost 왕복 프로브 ─────────────────────────────────────────────────

/**
 * 키마다 "있음/없음이 parsePost 결과를 바꾸는" 프로브 값.
 *
 * `Record<FrontmatterKey, …>`라서 테이블에 키를 추가하면 여기 한 줄을 더하기
 * 전까지 컴파일이 깨집니다 — 프로브가 조용히 구멍 나는 것을 막는 장치입니다.
 */
const PROBE_LINES: Record<FrontmatterKey, string> = {
  status: 'status: published',
  title: 'title: 제목 프로브',
  seoTitle: 'seoTitle: 짧은 제목',
  date: "date: '2026-01-02'",
  slug: 'slug: custom-slug',
  excerpt: 'excerpt: 명시 요약',
  thumbnail: 'thumbnail: /thumb.png',
  hero: 'hero: deploy-pipeline',
  tags: 'tags: [a, b]',
  updatedAt: "updatedAt: '2026-01-03'",
  scheduledDate: "scheduledDate: '2026-01-02T09:00:00+09:00'",
};

function probeDoc(excluded?: FrontmatterKey): string {
  const body = FRONTMATTER_KEYS.filter(key => key !== excluded)
    .map(key => PROBE_LINES[key])
    .join('\n');
  return `---\n${body}\n---\n프로브 본문입니다.\n`;
}

test('왕복 프로브: parsePost는 테이블의 모든 키를 실제로 읽는다', () => {
  // 반대 방향(parsePost가 테이블 밖 키를 읽는 경우)은 RawFrontmatter 매핑 타입이
  // 컴파일 에러로 막으므로 여기서는 "테이블에만 있고 안 읽는 키"만 잡으면 됩니다.
  const baseline = parsePost(probeDoc(), 'probe/a.md', PARSE_OPTS);
  expect(baseline, '프로브 문서는 유효한 포스트여야 한다').toBeTruthy();

  for (const key of FRONTMATTER_KEYS) {
    expect(
      parsePost(probeDoc(key), 'probe/a.md', PARSE_OPTS),
      `\`${key}\`를 빼도 parsePost 결과가 같다 — parsePost가 이 키를 읽지 않거나, ` +
        '프로브 값이 폴백과 구분되지 않는다. 테이블에서 키를 지웠으면 여기서도 지울 것.',
    ).not.toStrictEqual(baseline);
  }
});

// ── 3. kind 라벨 ↔ narrow 동작 일치 ──────────────────────────────────────────

test('kind 라벨은 narrow의 실제 동작과 일치한다', () => {
  // kind는 문서용 요약이라 어긋나도 컴파일은 통과합니다. 라벨이 거짓말하면
  // 표만 보고 값을 적는 글쓴이가 틀린 타입을 넣게 되므로 동작으로 잠급니다.
  for (const key of FRONTMATTER_KEYS) {
    const { kind, narrow } = FRONTMATTER_FIELDS[key];
    switch (kind) {
      case 'string':
        expect(narrow('값'), key).toBe('값');
        expect(narrow(''), `${key}: 빈 문자열은 값 없음`).toBe(undefined);
        expect(narrow(123), `${key}: 비문자열은 버린다`).toBe(undefined);
        break;
      case 'date':
        expect(narrow('2026-01-02'), key).toBe('2026-01-02');
        expect(
          narrow(new Date('2026-01-02T00:00:00Z')),
          `${key}: YAML Date 객체는 'YYYY-MM-DD'로 정규화`,
        ).toBe('2026-01-02');
        expect(narrow(123), `${key}: 그 외는 null`).toBe(null);
        break;
      case 'string-array':
        expect(narrow(['a', 'a', 'b']), `${key}: 중복 제거`).toStrictEqual([
          'a',
          'b',
        ]);
        expect(narrow('a'), `${key}: 배열 아니면 버린다`).toBe(undefined);
        expect(narrow(['a', 1]), `${key}: 비문자열 원소`).toBe(undefined);
        break;
      case 'enum':
        expect(narrow('published'), key).toBe('published');
        expect(narrow('발행'), `${key}: enum 밖 값`).toBe(undefined);
        break;
    }
  }
});

// ── 4. 거부 키 목록 ──────────────────────────────────────────────────────────

test('일부러 뺀 키는 허용 키와 겹치지 않고, 사유가 비어 있지 않다', () => {
  for (const [key, reason] of Object.entries(REJECTED_FRONTMATTER_KEYS)) {
    expect(
      !(FRONTMATTER_KEYS as string[]).includes(key),
      `\`${key}\`가 허용 키와 거부 키 양쪽에 있다`,
    ).toBeTruthy();
    expect(
      reason.length > 0,
      `\`${key}\`의 거부 사유가 비어 있다`,
    ).toBeTruthy();
  }
  expect(rejectionReasonFor('완전히모르는키')).toBe(undefined);
  // 프로토타입 키로 오탐하지 않는다 (hasOwn을 쓰는 이유)
  expect(rejectionReasonFor('toString')).toBe(undefined);
});

// ── 5. 루트 CLAUDE.md 표 동기화 ──────────────────────────────────────────────

interface DocTableRow {
  key: string;
  required: boolean;
  doc: string;
}

/**
 * 루트 CLAUDE.md의 frontmatter 표를 파싱합니다.
 *
 * "Frontmatter 전체 목록" 문단과 그 다음 산문(`series` 설명) 사이의 마크다운
 * 표에서, 첫 셀이 `` `키` `` 형태인 행만 데이터로 봅니다(헤더·구분선 제외).
 * 설명 셀의 `\|`는 표 문법상의 이스케이프이므로 `|`로 되돌려 비교합니다.
 */
function readClaudeMdTable(): DocTableRow[] {
  const claudeMdPath = fileURLToPath(
    new URL('../../../../../CLAUDE.md', import.meta.url),
  );
  const content = readFileSync(claudeMdPath, 'utf8');

  const start = content.indexOf('**Frontmatter 전체 목록**');
  expect(
    start >= 0,
    'CLAUDE.md에서 frontmatter 표 섹션을 찾을 수 없다',
  ).toBeTruthy();
  const end = content.indexOf('`series`는 frontmatter가 아니라', start);
  expect(
    end > start,
    'frontmatter 표 섹션의 끝 표식을 찾을 수 없다',
  ).toBeTruthy();

  const rows: DocTableRow[] = [];
  for (const line of content.slice(start, end).split('\n')) {
    if (!line.trimStart().startsWith('|')) continue;
    // 이스케이프된 파이프(`\|`)는 셀 구분자가 아니다.
    const cells = line.split(/(?<!\\)\|/).map(cell => cell.trim());
    // cells[0]은 행 앞 공백, cells[1]부터 실제 셀.
    const keyCell = cells[1] ?? '';
    const m = keyCell.match(/^`(\w+)`$/);
    if (!m) continue; // 헤더(`키`)와 구분선(:---) 행
    rows.push({
      key: m[1],
      required: (cells[2] ?? '') === '✅',
      doc: (cells[3] ?? '').replace(/\\\|/g, '|'),
    });
  }
  return rows;
}

test('CLAUDE.md 표: 키 목록과 순서가 서술자 테이블과 같다', () => {
  const rows = readClaudeMdTable();
  expect(
    rows.map(row => row.key),
    '키 집합이나 순서가 다르다 — 테이블(frontmatterSchema.ts)과 CLAUDE.md 표를 함께 고칠 것',
  ).toStrictEqual(FRONTMATTER_KEYS);
});

test('CLAUDE.md 표: 필수 표시(✅)가 required와 같다', () => {
  for (const row of readClaudeMdTable()) {
    expect(
      row.required,
      `\`${row.key}\`의 필수 여부가 표와 테이블에서 다르다`,
    ).toBe(FRONTMATTER_FIELDS[row.key as FrontmatterKey].required);
  }
});

test('CLAUDE.md 표: 설명 셀이 테이블의 doc과 글자 단위로 같다', () => {
  for (const row of readClaudeMdTable()) {
    expect(
      row.doc,
      `\`${row.key}\`의 설명이 표와 테이블에서 다르다 — 한쪽만 고쳤다`,
    ).toBe(FRONTMATTER_FIELDS[row.key as FrontmatterKey].doc);
  }
});
