/**
 * "이 모듈이 CLI 진입점으로 직접 실행됐는가" 판정 — 스크립트 공용 헬퍼.
 *
 * 예전에는 각 스크립트가 `import.meta.url === pathToFileURL(process.argv[1]).href`
 * (또는 fileURLToPath 변형)를 들고 있었는데, pnpm 워크스페이스에서는 이 비교가
 * **항상 false**다: 앱은 `node_modules/@blog/content/src/scripts/…` **심링크
 * 경로**로 스크립트를 부르므로 argv[1]은 심링크인데, ESM 로더는 모듈을
 * realpath(`packages/@blog/content/src/scripts/…`)로 해석해 import.meta.url은
 * 실경로가 된다. 가드가 조용히 false → main()이 한 번도 안 돌아 빌드 전
 * 생성물(sitemap·rss·og·…)이 통째로 빠지는 **무음 no-op**이었다.
 *
 * 그래서 **양쪽을 realpath로 정규화**해 비교한다. 판정이 애매한 경우(argv[1]
 * 부재, 파일 미존재, URL 변환 실패)는 전부 false다 — import 시 우발 실행보다
 * "직접 실행인데 안 돎"이 관찰 가능(스크립트가 아무 출력도 안 내면 즉시
 * 이상함)하므로 false가 안전한 쪽이다.
 *
 * @param importMetaUrl 호출 모듈의 `import.meta.url`
 */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isCliEntry(importMetaUrl: string): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(argv1);
  } catch {
    // fileURLToPath: file: 스킴이 아니면 throw / realpathSync: 경로 미존재면 throw
    return false;
  }
}
