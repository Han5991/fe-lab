import { expect, test } from 'vitest';
import { DEFAULT_OG } from '../../shared/contentConfig.ts';
import {
  ogContentHash,
  displayTitle,
  needsGeneratedOg,
  ogFileRelPath,
  ogTemplate,
  titleFontSize,
  findOrphanPngs,
  loadFonts,
  renderOgPng,
  OG_PILL_BORDER,
  type OgPostInput,
} from './generate-og-images.ts';

function post(over: Partial<OgPostInput> = {}): OgPostInput {
  return { slug: 'my-post', title: '테스트 글', date: '2026-06-09', ...over };
}

// ── ogContentHash ────────────────────────────────────────────────────────────

test('ogContentHash: 같은 입력이면 같은 해시 (결정적)', () => {
  expect(ogContentHash(post())).toBe(ogContentHash(post()));
});

test('ogContentHash: 이미지에 들어가는 필드(title/date/series)가 바뀌면 해시 변경', () => {
  const base = ogContentHash(post());
  expect(ogContentHash(post({ title: '다른 제목' }))).not.toBe(base);
  expect(ogContentHash(post({ date: '2025-01-01' }))).not.toBe(base);
  expect(ogContentHash(post({ series: 'bundler' }))).not.toBe(base);
});

test('ogContentHash: og 설정(팔레트·크기)이 바뀌면 해시 변경 — 설정 오버라이드가 재생성을 트리거', () => {
  const base = ogContentHash(post());
  expect(
    ogContentHash(post(), {
      ...DEFAULT_OG,
      palette: { ...DEFAULT_OG.palette, accent: '#FF0000' },
    }),
  ).not.toBe(base);
  expect(ogContentHash(post(), { ...DEFAULT_OG, width: 800 })).not.toBe(base);
});

test('ogContentHash: slug는 파일 경로일 뿐 해시에 영향 없음', () => {
  expect(ogContentHash(post({ slug: 'a' }))).toBe(
    ogContentHash(post({ slug: 'b' })),
  );
});

// ── ogFileRelPath ────────────────────────────────────────────────────────────

test('ogFileRelPath: 평범한 slug → {slug}.png', () => {
  expect(ogFileRelPath('my-post')).toBe('my-post.png');
});

test('ogFileRelPath: 중첩 slug는 폴더 구조 보존', () => {
  expect(ogFileRelPath('회고/2024/올해의 글')).toBe('회고/2024/올해의 글.png');
});

test('ogFileRelPath: og/ 밖으로 나갈 수 있는 slug는 에러', () => {
  expect(() => ogFileRelPath('../etc')).toThrow(/쓸 수 없는 slug/);
  expect(() => ogFileRelPath('a/../b')).toThrow(/쓸 수 없는 slug/);
  expect(() => ogFileRelPath('a//b')).toThrow(/쓸 수 없는 slug/);
});

// ── needsGeneratedOg ─────────────────────────────────────────────────────────

test('needsGeneratedOg: thumbnail 없거나 /og/*를 가리키면 생성 대상', () => {
  expect(needsGeneratedOg({})).toBe(true);
  expect(needsGeneratedOg({ thumbnail: '' })).toBe(true);
  expect(needsGeneratedOg({ thumbnail: '/og/my-post.png' })).toBe(true);
});

test('needsGeneratedOg: 외부/직접 썸네일이 있으면 제외', () => {
  expect(needsGeneratedOg({ thumbnail: 'cover.png' })).toBe(false);
  expect(needsGeneratedOg({ thumbnail: 'https://cdn/x.png' })).toBe(false);
  expect(needsGeneratedOg({ thumbnail: '/images/x.png' })).toBe(false);
});

// ── titleFontSize / ogTemplate ───────────────────────────────────────────────

test('titleFontSize: 길이에 따라 76/64/54px 3단계', () => {
  expect(titleFontSize('짧은 제목')).toBe(76);
  expect(titleFontSize('가'.repeat(30))).toBe(64);
  expect(titleFontSize('가'.repeat(39))).toBe(54);
});

test('displayTitle: 시리즈명과 정확히 일치하는 prefix만 제거', () => {
  expect(displayTitle('[TS로 설계] 당신의 Type', '[TS로 설계]')).toBe(
    '당신의 Type',
  );
  expect(displayTitle('그냥 제목', '[TS로 설계]')).toBe('그냥 제목');
  expect(displayTitle('그냥 제목', undefined)).toBe('그냥 제목');
});

test('displayTitle: prefix 제거 후 빈 제목이 되면 원본 유지', () => {
  expect(displayTitle('bundler', 'bundler')).toBe('bundler');
});

test('ogTemplate: 제목/날짜/도메인이 트리에 포함', () => {
  const json = JSON.stringify(ogTemplate(post()));
  expect(json.includes('테스트 글')).toBeTruthy();
  expect(json.includes('2026-06-09')).toBeTruthy();
  expect(json.includes('blog.sangwook.dev')).toBeTruthy();
});

test('ogTemplate: series가 있을 때만 pill 노출', () => {
  const withSeries = JSON.stringify(ogTemplate(post({ series: 'bundler' })));
  expect(withSeries.includes('bundler')).toBeTruthy();
  expect(withSeries.includes(OG_PILL_BORDER)).toBeTruthy();
  expect(
    !JSON.stringify(ogTemplate(post())).includes(OG_PILL_BORDER),
  ).toBeTruthy();
});

test('ogTemplate: 시리즈명이 제목 prefix와 중복되면 제목에서 제거', () => {
  const json = JSON.stringify(
    ogTemplate(post({ title: '[TS 설계] 당신의 Type', series: '[TS 설계]' })),
  );
  expect(!json.includes('[TS 설계] 당신의 Type')).toBeTruthy();
  expect(json.includes('당신의 Type')).toBeTruthy();
});

test('ogTemplate: 제목은 3줄 클램프', () => {
  expect(
    JSON.stringify(ogTemplate(post())).includes('"lineClamp":3'),
  ).toBeTruthy();
});

test('ogTemplate: datetime이 섞인 date도 날짜 부분만 표기', () => {
  const json = JSON.stringify(
    ogTemplate(post({ date: '2026-03-16T09:00:00+09:00' })),
  );
  expect(json.includes('2026-03-16')).toBeTruthy();
});

// ── findOrphanPngs ───────────────────────────────────────────────────────────

test('findOrphanPngs: 기대 목록에 없는 png만 고아로 분류', () => {
  const existing = ['a.png', 'b.png', '회고/2024/c.png', '회고', 'note.txt'];
  const expected = new Set(['a.png', '회고/2024/c.png']);
  expect(findOrphanPngs(existing, expected)).toStrictEqual(['b.png']);
});

test('findOrphanPngs: png 아닌 파일/디렉토리는 건드리지 않음', () => {
  expect(findOrphanPngs(['dir', 'x.txt'], new Set())).toStrictEqual([]);
});

// ── 렌더링 e2e (satori + resvg + Pretendard 실로딩) ─────────────────────────

test('renderOgPng: 실제 폰트로 유효한 PNG 생성', async () => {
  const png = await renderOgPng(
    post({
      title: '번들러 만들기: 아주 긴 한글 제목도 안전하게 렌더링',
      series: 'bundler',
    }),
    loadFonts(),
  );
  // PNG 시그니처(\x89PNG) + 1200×630 치고 비정상적으로 작지 않은지
  expect([...png.subarray(0, 4)]).toStrictEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(png.length > 10_000, `png too small: ${png.length}B`).toBeTruthy();
  // IHDR의 width/height 확인 (offset 16: width 4B, height 4B big-endian)
  expect(png.readUInt32BE(16)).toBe(DEFAULT_OG.width);
  expect(png.readUInt32BE(20)).toBe(DEFAULT_OG.height);
});
