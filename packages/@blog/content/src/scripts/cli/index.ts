#!/usr/bin/env node
/**
 * `blog-content` — 이 패키지의 빌드 스크립트를 부르는 유일한 진입점.
 *
 * package.json의 `bin`에 걸려 있어 앱은 `blog-content <명령>`으로만 부른다.
 * 패키지 안의 파일 배치는 더 이상 앱의 스크립트에 새어 나오지 않는다.
 *
 * shebang이 `node`인 것도 계약의 일부다 — 이 패키지의 상대 import는 전부 `.ts`
 * 확장자를 달고 있고(tsconfig의 `allowImportingTsExtensions`), 문법은
 * `erasableSyntaxOnly`로 묶여 있어 node의 type stripping만으로 그대로 돈다.
 * 별도 로더도, 빌드 산출물도 없다.
 */
import { COMMANDS } from './commands.ts';

function printUsage(): void {
  console.error('사용법: blog-content <명령> [옵션]\n');
  console.error('명령:');
  for (const name of Object.keys(COMMANDS)) console.error(`  ${name}`);
}

async function run(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exit(1);
  }
  if (command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  const load = COMMANDS[command];
  if (!load) {
    console.error(`✖ 알 수 없는 명령: ${command}\n`);
    printUsage();
    process.exit(1);
  }

  const main = await load();
  await main(args);
}

run().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
