import { expect, test } from 'vitest';
import { buildPhases } from './build-content.ts';
import { buildProgram } from './cli/program.ts';

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

test('buildPhases: 모든 단계가 CLI에 등록된 서브커맨드다', () => {
  // 예전에는 단계마다 스크립트 **파일 경로**를 하드코딩해서, 파일을 옮기면
  // tsc가 못 보는 문자열이 조용히 썩었다. 이제 단계는 이름만 말하고, 그 이름을
  // 파일에 잇는 일은 CLI 정의 한 곳이 맡는다 — 둘의 어긋남을 여기서 잡는다.
  const all = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  }).flat();
  const registered = new Set(buildProgram().commands.map(c => c.name()));
  for (const step of all) {
    expect(
      registered.has(step.command),
      `${step.label}: ${step.command}가 CLI에 등록돼 있지 않다`,
    ).toBeTruthy();
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
  expect(strict[0][0].command).toBe('validate');
  expect(strict[0][0].args).toStrictEqual(['--strict']);
  expect(strict[1].every(step => !step.args.includes('--strict'))).toBeTruthy();

  const loose = buildPhases({
    skipValidate: false,
    force: false,
    strict: false,
  });
  expect(loose[0][0].command).toBe('validate');
  expect(loose[0][0].args).toStrictEqual([]);
});
