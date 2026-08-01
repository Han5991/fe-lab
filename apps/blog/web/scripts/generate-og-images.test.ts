import assert from 'node:assert/strict';
import { test } from 'node:test';
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
  OG_WIDTH,
  OG_HEIGHT,
  type OgPostInput,
} from './generate-og-images';

function post(over: Partial<OgPostInput> = {}): OgPostInput {
  return { slug: 'my-post', title: '테스트 글', date: '2026-06-09', ...over };
}

// ── ogContentHash ────────────────────────────────────────────────────────────

test('ogContentHash: 같은 입력이면 같은 해시 (결정적)', () => {
  assert.equal(ogContentHash(post()), ogContentHash(post()));
});

test('ogContentHash: 이미지에 들어가는 필드(title/date/series)가 바뀌면 해시 변경', () => {
  const base = ogContentHash(post());
  assert.notEqual(ogContentHash(post({ title: '다른 제목' })), base);
  assert.notEqual(ogContentHash(post({ date: '2025-01-01' })), base);
  assert.notEqual(ogContentHash(post({ series: 'bundler' })), base);
});

test('ogContentHash: slug는 파일 경로일 뿐 해시에 영향 없음', () => {
  assert.equal(
    ogContentHash(post({ slug: 'a' })),
    ogContentHash(post({ slug: 'b' })),
  );
});

// ── ogFileRelPath ────────────────────────────────────────────────────────────

test('ogFileRelPath: 평범한 slug → {slug}.png', () => {
  assert.equal(ogFileRelPath('my-post'), 'my-post.png');
});

test('ogFileRelPath: 중첩 slug는 폴더 구조 보존', () => {
  assert.equal(ogFileRelPath('회고/2024/올해의 글'), '회고/2024/올해의 글.png');
});

test('ogFileRelPath: og/ 밖으로 나갈 수 있는 slug는 에러', () => {
  assert.throws(() => ogFileRelPath('../etc'), /쓸 수 없는 slug/);
  assert.throws(() => ogFileRelPath('a/../b'), /쓸 수 없는 slug/);
  assert.throws(() => ogFileRelPath('a//b'), /쓸 수 없는 slug/);
});

// ── needsGeneratedOg ─────────────────────────────────────────────────────────

test('needsGeneratedOg: thumbnail 없거나 /og/*를 가리키면 생성 대상', () => {
  assert.equal(needsGeneratedOg({}), true);
  assert.equal(needsGeneratedOg({ thumbnail: '' }), true);
  assert.equal(needsGeneratedOg({ thumbnail: '/og/my-post.png' }), true);
});

test('needsGeneratedOg: 외부/직접 썸네일이 있으면 제외', () => {
  assert.equal(needsGeneratedOg({ thumbnail: 'cover.png' }), false);
  assert.equal(needsGeneratedOg({ thumbnail: 'https://cdn/x.png' }), false);
  assert.equal(needsGeneratedOg({ thumbnail: '/images/x.png' }), false);
});

// ── titleFontSize / ogTemplate ───────────────────────────────────────────────

test('titleFontSize: 길이에 따라 76/64/54px 3단계', () => {
  assert.equal(titleFontSize('짧은 제목'), 76);
  assert.equal(titleFontSize('가'.repeat(30)), 64);
  assert.equal(titleFontSize('가'.repeat(39)), 54);
});

test('displayTitle: 시리즈명과 정확히 일치하는 prefix만 제거', () => {
  assert.equal(
    displayTitle('[TS로 설계] 당신의 Type', '[TS로 설계]'),
    '당신의 Type',
  );
  assert.equal(displayTitle('그냥 제목', '[TS로 설계]'), '그냥 제목');
  assert.equal(displayTitle('그냥 제목', undefined), '그냥 제목');
});

test('displayTitle: prefix 제거 후 빈 제목이 되면 원본 유지', () => {
  assert.equal(displayTitle('bundler', 'bundler'), 'bundler');
});

test('ogTemplate: 제목/날짜/도메인이 트리에 포함', () => {
  const json = JSON.stringify(ogTemplate(post()));
  assert.ok(json.includes('테스트 글'));
  assert.ok(json.includes('2026-06-09'));
  assert.ok(json.includes('blog.sangwook.dev'));
});

test('ogTemplate: series가 있을 때만 pill 노출', () => {
  const PILL_BORDER = 'rgba(93, 202, 165, 0.4)';
  const withSeries = JSON.stringify(ogTemplate(post({ series: 'bundler' })));
  assert.ok(withSeries.includes('bundler'));
  assert.ok(withSeries.includes(PILL_BORDER));
  assert.ok(!JSON.stringify(ogTemplate(post())).includes(PILL_BORDER));
});

test('ogTemplate: 시리즈명이 제목 prefix와 중복되면 제목에서 제거', () => {
  const json = JSON.stringify(
    ogTemplate(post({ title: '[TS 설계] 당신의 Type', series: '[TS 설계]' })),
  );
  assert.ok(!json.includes('[TS 설계] 당신의 Type'));
  assert.ok(json.includes('당신의 Type'));
});

test('ogTemplate: 제목은 3줄 클램프', () => {
  assert.ok(JSON.stringify(ogTemplate(post())).includes('"lineClamp":3'));
});

test('ogTemplate: datetime이 섞인 date도 날짜 부분만 표기', () => {
  const json = JSON.stringify(
    ogTemplate(post({ date: '2026-03-16T09:00:00+09:00' })),
  );
  assert.ok(json.includes('2026-03-16'));
});

// ── findOrphanPngs ───────────────────────────────────────────────────────────

test('findOrphanPngs: 기대 목록에 없는 png만 고아로 분류', () => {
  const existing = ['a.png', 'b.png', '회고/2024/c.png', '회고', 'note.txt'];
  const expected = new Set(['a.png', '회고/2024/c.png']);
  assert.deepEqual(findOrphanPngs(existing, expected), ['b.png']);
});

test('findOrphanPngs: png 아닌 파일/디렉토리는 건드리지 않음', () => {
  assert.deepEqual(findOrphanPngs(['dir', 'x.txt'], new Set()), []);
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
  assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.ok(png.length > 10_000, `png too small: ${png.length}B`);
  // IHDR의 width/height 확인 (offset 16: width 4B, height 4B big-endian)
  assert.equal(png.readUInt32BE(16), OG_WIDTH);
  assert.equal(png.readUInt32BE(20), OG_HEIGHT);
});
