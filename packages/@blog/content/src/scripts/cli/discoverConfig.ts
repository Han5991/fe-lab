/**
 * `content.config.ts` 발견·로드 — CLI의 경로 앵커 진입점.
 *
 * cwd에서 위로 올라가며 설정 파일을 찾는다(vite·tailwind와 같은 관례).
 * 발견은 cwd 기준이지만 **앵커는 설정 파일의 위치**다(`root: import.meta.url`)
 * — 앱 디렉터리 어디에서 실행해도 같은 파일이 잡히고, 잡힌 뒤에는 cwd가 더
 * 이상 아무 역할도 하지 않는다. 폴백은 없다: 설정이 없으면 명확한 에러가
 * 실행을 막는다.
 *
 * 설정 파일은 node의 type stripping으로 그대로 import된다 — 이 패키지의 다른
 * 소스와 같은 계약(erasableSyntaxOnly)을 따라야 한다.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ContentConfig } from '../../shared/contentConfig.ts';

/**
 * 후보 파일명 — `.mts`가 앞이다. `"type": "module"`이 없는 패키지(Next 앱이
 * 대개 그렇다)에서 `.ts`는 node가 CommonJS로 먼저 파싱했다가 ESM으로 재파싱해
 * 경고와 오버헤드를 내므로, 확장자로 ESM을 못박는 `.mts`를 권장한다.
 */
export const CONFIG_FILENAMES = ['content.config.mts', 'content.config.ts'];
export const CONFIG_FILENAME = CONFIG_FILENAMES[0] as string;

/** startDir에서 파일시스템 루트까지 올라가며 content.config.(m)ts를 찾는다. */
export function findConfigFile(startDir: string): string | null {
  let dir = resolve(startDir);
  for (;;) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = join(dir, filename);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * defineContent 결과의 duck-validation. 모듈 identity 비교(instanceof류)를 쓰지
 * 않는 이유: 설정 파일이 import하는 `@blog/content`와 CLI가 로드된 경로가
 * (pnpm 심링크 등으로) 다른 인스턴스일 수 있어, 구조만 본다.
 */
function isContentConfig(value: unknown): value is ContentConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Partial<ContentConfig>;
  return (
    typeof config.root === 'string' &&
    typeof config.dirs === 'object' &&
    config.dirs !== null &&
    typeof config.site === 'object' &&
    config.site !== null
  );
}

export interface LoadedContentConfig {
  config: ContentConfig;
  configPath: string;
}

/**
 * 설정을 로드한다. `--config <path>`(explicitPath)가 있으면 그 파일을,
 * 없으면 cwd에서 위로 탐색한다.
 */
export async function loadContentConfig(
  explicitPath?: string,
): Promise<LoadedContentConfig> {
  let configPath: string;
  if (explicitPath) {
    configPath = resolve(process.cwd(), explicitPath);
    if (!existsSync(configPath)) {
      throw new Error(
        `--config가 가리키는 설정 파일이 없습니다: ${configPath}`,
      );
    }
  } else {
    const found = findConfigFile(process.cwd());
    if (!found) {
      throw new Error(
        `${CONFIG_FILENAMES.join(' 또는 ')}를 찾을 수 없습니다 — ` +
          `${process.cwd()}에서 파일시스템 루트까지 올라가며 찾았습니다.\n` +
          `  앱 루트에 ${CONFIG_FILENAME}를 만들고 defineContent({ root: import.meta.url })를 ` +
          `default export 하거나,\n` +
          `  앱 디렉터리에서 실행하거나, blog-content --config <경로> <명령>으로 직접 지정하세요.`,
      );
    }
    configPath = found;
  }

  const mod = (await import(pathToFileURL(configPath).href)) as {
    default?: unknown;
  };
  if (!isContentConfig(mod.default)) {
    throw new Error(
      `${configPath}: defineContent({ root: import.meta.url, ... }) 결과를 ` +
        `default export 해야 합니다.`,
    );
  }
  return { config: mod.default, configPath };
}
