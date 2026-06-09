import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFlags, buildPhases } from './build-content';

// ── parseFlags ───────────────────────────────────────────────────────────────

test('parseFlags: 기본값은 모두 false', () => {
  assert.deepEqual(parseFlags([]), { skipValidate: false, force: false });
});

test('parseFlags: --skip-validate / --force 인식', () => {
  assert.deepEqual(parseFlags(['--skip-validate', '--force']), {
    skipValidate: true,
    force: true,
  });
});

// ── buildPhases ──────────────────────────────────────────────────────────────

test('buildPhases: 기본 — validate 게이트 phase + 병렬 generate phase', () => {
  const phases = buildPhases({ skipValidate: false, force: false });
  assert.equal(phases.length, 2);
  assert.deepEqual(
    phases[0].map(s => s.label),
    ['validate-posts'],
  );
  assert.deepEqual([...phases[1].map(s => s.label)].sort(), [
    'llms-full',
    'og-images',
    'rss',
    'search-index',
    'sitemap',
    'sync-posts',
  ]);
});

test('buildPhases: skip-validate면 generate phase만', () => {
  const phases = buildPhases({ skipValidate: true, force: false });
  assert.equal(phases.length, 1);
  assert.ok(phases[0].length >= 6);
});

test('buildPhases: force 플래그는 sync-posts에만 전달', () => {
  const phases = buildPhases({ skipValidate: false, force: true });
  const all = phases.flat();
  const sync = all.find(s => s.label === 'sync-posts');
  assert.ok(sync?.args.includes('--force'));
  for (const step of all) {
    if (step.label !== 'sync-posts') {
      assert.ok(!step.args.includes('--force'), step.label);
    }
  }
});

test('buildPhases: 단계 label은 중복 없음', () => {
  const labels = buildPhases({ skipValidate: false, force: false })
    .flat()
    .map(s => s.label);
  assert.equal(new Set(labels).size, labels.length);
});
