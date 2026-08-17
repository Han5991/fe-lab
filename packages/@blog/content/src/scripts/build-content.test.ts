import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAbsolute } from 'node:path';
import { parseFlags, buildPhases } from './build-content';

// ── parseFlags ───────────────────────────────────────────────────────────────

test('parseFlags: 기본값은 모두 false', () => {
  assert.deepEqual(parseFlags([]), {
    skipValidate: false,
    force: false,
    strict: false,
  });
});

test('parseFlags: --skip-validate / --force / --strict 인식', () => {
  assert.deepEqual(parseFlags(['--skip-validate', '--force', '--strict']), {
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
  assert.equal(phases.length, 2);
  assert.deepEqual(
    phases[0].map(s => s.label),
    ['validate-posts'],
  );
  assert.deepEqual([...phases[1].map(s => s.label)].sort(), [
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
  assert.equal(phases.length, 1);
  assert.ok(phases[0].length >= 7);
});

test('buildPhases: force 플래그는 sync-posts에만 전달', () => {
  const phases = buildPhases({
    skipValidate: false,
    force: true,
    strict: false,
  });
  const all = phases.flat();
  const sync = all.find(s => s.label === 'sync-posts');
  assert.ok(sync?.args.includes('--force'));
  for (const step of all) {
    if (step.label !== 'sync-posts') {
      assert.ok(!step.args.includes('--force'), step.label);
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
    assert.ok(
      isAbsolute(step.args[0] ?? ''),
      `${step.label}: args[0]이 절대 경로여야 한다 (${step.args[0]})`,
    );
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
    assert.ok(step, `${label} 단계가 있어야 한다`);
    assert.match(step.args[0] ?? '', /scripts[/\\]render[/\\]/, label);
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
  assert.equal(new Set(labels).size, labels.length);
});

test('buildPhases: --strict는 validate-posts에만 전달 (predev는 비엄격)', () => {
  // predev도 이 파이프라인을 돌기 때문에, 엄격 검사를 항상 켜면 요약을 아직
  // 안 적은 글 하나로 dev 서버가 안 뜬다. prebuild에서만 켠다.
  const strict = buildPhases({
    skipValidate: false,
    force: false,
    strict: true,
  });
  assert.match(strict[0][0].args[0] ?? '', /validate-posts\.ts$/);
  assert.deepEqual(strict[0][0].args.slice(1), ['--strict']);
  assert.ok(strict[1].every(step => !step.args.includes('--strict')));

  const loose = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  });
  assert.match(loose[0][0].args[0] ?? '', /validate-posts\.ts$/);
  assert.equal(loose[0][0].args.length, 1);
});
