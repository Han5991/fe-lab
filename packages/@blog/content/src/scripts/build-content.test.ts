import { expect, test } from 'vitest';
import { isAbsolute } from 'node:path';
import { parseFlags, buildPhases } from './build-content';

// ── parseFlags ───────────────────────────────────────────────────────────────

test('parseFlags: 기본값은 모두 false', () => {
  expect(parseFlags([])).toStrictEqual({
    skipValidate: false,
    force: false,
    strict: false,
  });
});

test('parseFlags: --skip-validate / --force / --strict 인식', () => {
  expect(parseFlags(['--skip-validate', '--force', '--strict'])).toStrictEqual({
    skipValidate: true,
    force: true,
    strict: true,
  });
});

// ── buildPhases ──────────────────────────────────────────────────────────────

test('buildPhases: 기본 — validate 게이트 phase + 병렬 generate phase', () => {
  const phases = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  });
  expect(phases.length).toBe(2);
  expect(phases[0].map(s => s.label)).toStrictEqual(['validate-posts']);
  expect([...phases[1].map(s => s.label)].sort()).toStrictEqual([
    'llms',
    'llms-full',
    'og-images',
    'rss',
    'search-index',
    'sitemap',
    'sync-posts',
    'thumbnails',
  ]);
});

test('buildPhases: skip-validate면 generate phase만', () => {
  const phases = buildPhases({
    skipValidate: true,
    force: false,
    strict: false,
  });
  expect(phases.length).toBe(1);
  expect(phases[0].length >= 7).toBeTruthy();
});

test('buildPhases: force 플래그는 sync-posts에만 전달', () => {
  const phases = buildPhases({
    skipValidate: false,
    force: true,
    strict: false,
  });
  const all = phases.flat();
  const sync = all.find(s => s.label === 'sync-posts');
  expect(sync?.args.includes('--force')).toBeTruthy();
  for (const step of all) {
    if (step.label !== 'sync-posts') {
      expect(!step.args.includes('--force'), step.label).toBeTruthy();
    }
  }
});

test('buildPhases: 모든 단계의 스크립트 경로는 절대 경로다 (cwd 비의존)', () => {
  // spawn cwd를 호출자 것으로 두는 대신, 스크립트 파일은 build-content 위치
  // 기준 절대 경로로 지목한다 — 어느 cwd에서 불러도 같은 파일이 돈다.
  const all = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  }).flat();
  for (const step of all) {
    expect(
      isAbsolute(step.args[0] ?? ''),
      `${step.label}: args[0]이 절대 경로여야 한다 (${step.args[0]})`,
    ).toBeTruthy();
  }
});

test('buildPhases: 렌더 생성기 3개는 scripts/render/ 아래를 가리킨다', () => {
  // 렌더 생성기(rss·og·thumbnails)는 React 스택을 끄는 render-build 레이어로
  // 분리됐다. build-content의 경로 문자열은 tsc가 못 보는 하드코딩이라, 파일을
  // 또 옮기면 여기서 잡는다.
  const all = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  }).flat();
  for (const label of ['rss', 'og-images', 'thumbnails']) {
    const step = all.find(s => s.label === label);
    expect(step, `${label} 단계가 있어야 한다`).toBeTruthy();
    expect(step?.args[0] ?? '', label).toMatch(/scripts[/\\]render[/\\]/);
  }
});

test('buildPhases: 단계 label은 중복 없음', () => {
  const labels = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  })
    .flat()
    .map(s => s.label);
  expect(new Set(labels).size).toBe(labels.length);
});

test('buildPhases: --strict는 validate-posts에만 전달 (predev는 비엄격)', () => {
  // predev도 이 파이프라인을 돌기 때문에, 엄격 검사를 항상 켜면 요약을 아직
  // 안 적은 글 하나로 dev 서버가 안 뜬다. prebuild에서만 켠다.
  const strict = buildPhases({
    skipValidate: false,
    force: false,
    strict: true,
  });
  expect(strict[0][0].args[0] ?? '').toMatch(/validate-posts\.ts$/);
  expect(strict[0][0].args.slice(1)).toStrictEqual(['--strict']);
  expect(strict[1].every(step => !step.args.includes('--strict'))).toBeTruthy();

  const loose = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  });
  expect(loose[0][0].args[0] ?? '').toMatch(/validate-posts\.ts$/);
  expect(loose[0][0].args.length).toBe(1);
});
