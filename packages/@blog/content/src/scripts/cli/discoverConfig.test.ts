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

test('findConfigFile: 없으면 null (stopDir로 탐색을 경계 지어 결정적으로 검증)', () =>
  withTmpTree(root => {
    // stopDir 없이 fs 루트까지 올라가면 임시 트리 **밖**의 진짜 config가 잡힐
    // 수 있어 not-found 분기를 결정적으로 검증할 수 없다. stopDir(포함)이
    // 탐색을 임시 트리 안으로 가둔다.
    const isolated = join(root, 'a', 'b');
    mkdirSync(isolated, { recursive: true });
    expect(findConfigFile(isolated, root)).toBe(null);

    // 같은 경계 안에서, 파일이 있으면 stopDir까지 올라가서라도 찾는다.
    const configPath = join(root, 'content.config.mts');
    writeFileSync(configPath, 'export default {}\n', 'utf8');
    expect(findConfigFile(isolated, root)).toBe(configPath);
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

test('loadContentConfig: 부분 객체(dirs 일부 누락)는 스텝에 닿기 전에 거부한다', () =>
  withTmpTree(async root => {
    // 손으로 쓴 그럴듯한 부분 설정 — 예전 duck-validation(root·dirs·site만
    // 확인)은 이걸 통과시켜 스텝 안에서 알 수 없는 TypeError로 죽었다.
    const partial = join(root, CONFIG_FILENAME);
    writeFileSync(
      partial,
      `export default {
  root: ${JSON.stringify(root)},
  dirs: { content: '../posts' },
  site: { url: 'https://example.dev' },
};
`,
      'utf8',
    );
    await expect(loadContentConfig(partial)).rejects.toThrow(/default export/);
  }));

test('loadContentConfig: 스텝이 소비하는 표면을 갖춘 설정 객체를 로드한다', () =>
  withTmpTree(async root => {
    const good = join(root, CONFIG_FILENAME);
    // 실제 defineContent를 import하지 않는 이유: 임시 파일에서 '@blog/content'
    // bare specifier가 이 테스트 실행 컨텍스트에서 해석된다는 보장이 없다.
    // duck-validation이 보는 구조만 갖춘 리터럴로 로더 계약을 검증한다.
    writeFileSync(
      good,
      `export default {
  root: ${JSON.stringify(root)},
  dirs: {
    content: '../posts', public: 'public', cache: '.cache', out: 'out',
    media: 'public/posts', thumbs: 'public/thumbs', og: 'public/og',
  },
  site: { url: 'https://example.dev' },
  runtime: { isDevelopment: () => false },
  timezone: { iana: 'Asia/Seoul' },
};
`,
      'utf8',
    );
    const { config, configPath } = await loadContentConfig(good);
    expect(configPath).toBe(good);
    expect(config.root).toBe(root);
  }));
