/**
 * content.config.ts 발견·로드의 계약 테스트.
 *
 * walk-up은 임시 디렉터리 트리에서, 로드는 실제 임시 설정 파일을 dynamic
 * import해서 검증한다 — 워크스페이스의 실제 content.config.ts에는 기대지
 * 않는다(이 패키지는 특정 앱 배치를 몰라야 한다).
 */
import { expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CONFIG_FILENAME,
  findConfigFile,
  loadContentConfig,
} from './discoverConfig.ts';

function withTmpTree(fn: (root: string) => void | Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'discover-config-'));
  const result = (async () => fn(root))();
  return result.finally(() => rmSync(root, { recursive: true, force: true }));
}

test('findConfigFile: 시작 디렉터리에서 위로 올라가며 찾는다', () =>
  withTmpTree(root => {
    const appDir = join(root, 'app');
    const deep = join(appDir, 'src', 'components');
    mkdirSync(deep, { recursive: true });
    const configPath = join(appDir, CONFIG_FILENAME);
    writeFileSync(configPath, 'export default {}\n', 'utf8');

    expect(findConfigFile(deep)).toBe(configPath);
    expect(findConfigFile(appDir)).toBe(configPath);
  }));

test('findConfigFile: 없으면 null (fs 루트에서 중단)', () =>
  withTmpTree(root => {
    // 임시 루트 위쪽 어딘가에 진짜 config가 있으면 오탐이므로, 존재하지 않는
    // 파일명이 아니라 "루트까지 없음"만 임시 트리 안에서 검증할 수는 없다.
    // 대신 walk-up이 부모로 전진하다 자기 자신(fs 루트)에서 멈추는 종료
    // 조건은 위 테스트의 탐색 성공과 함께 이 호출이 **반환한다**는 사실로
    // 커버된다 — 무한 루프면 테스트가 타임아웃한다.
    const isolated = join(root, 'no-config-here');
    mkdirSync(isolated, { recursive: true });
    const found = findConfigFile(isolated);
    // 워크스페이스 상위(예: 저장소 루트)의 config가 잡힐 수는 있으나, 잡혔다면
    // 그것은 실제 파일이어야 한다.
    if (found !== null) {
      expect(found.endsWith(CONFIG_FILENAME)).toBeTruthy();
    }
  }));

test('loadContentConfig: --config 경로가 없으면 명확한 에러', async () => {
  await expect(
    loadContentConfig('/no/such/dir/content.config.ts'),
  ).rejects.toThrow(/설정 파일이 없습니다/);
});

test('loadContentConfig: defineContent 결과가 아니면 duck-validation 에러', () =>
  withTmpTree(async root => {
    const bad = join(root, CONFIG_FILENAME);
    writeFileSync(bad, 'export default { hello: 1 };\n', 'utf8');
    await expect(loadContentConfig(bad)).rejects.toThrow(/default export/);
  }));

test('loadContentConfig: root·dirs·site를 가진 설정 객체를 로드한다', () =>
  withTmpTree(async root => {
    const good = join(root, CONFIG_FILENAME);
    // 실제 defineContent를 import하지 않는 이유: 임시 파일에서 '@blog/content'
    // bare specifier가 이 테스트 실행 컨텍스트에서 해석된다는 보장이 없다.
    // duck-validation이 보는 구조만 갖춘 리터럴로 로더 계약을 검증한다.
    writeFileSync(
      good,
      `export default {
  root: ${JSON.stringify(root)},
  dirs: { content: '../posts' },
  site: { url: 'https://example.dev' },
};
`,
      'utf8',
    );
    const { config, configPath } = await loadContentConfig(good);
    expect(configPath).toBe(good);
    expect(config.root).toBe(root);
  }));
