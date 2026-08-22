/**
 * 테스트 전용 코퍼스 인스턴스 — 이 저장소의 실제 원고(apps/blog/posts)에
 * 앵커한 ContentApi.
 *
 * 프로덕션 폴백이 아니라 **테스트 픽스처 배선**이다: 코퍼스 계약 테스트
 * (contract·devVisibility 등)는 실제 글을 읽어야 의미가 있는데, vitest의
 * cwd는 패키지 안이라 설정 파일 walk-up이 앱 설정을 잡지 못한다. 그래서
 * 여기서 명시적으로 워크스페이스의 앱 루트를 계산해 인스턴스를 만든다.
 * 프로덕션 코드는 이 모듈을 import하면 안 된다(배럴에도 없다).
 *
 * 사이트 고유 값은 픽스처(`shared/testValues.ts`)에서 온다 — 실제 원고를
 * 읽되 정체성은 픽스처인 셈이다. 그 이유는 그쪽 주석에 있다.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineTestContent } from '../shared/testValues.ts';
import { createContent, type ContentApi } from './createContent.ts';

// …/packages/@blog/content/src/post → 5단계 위 = 워크스페이스 루트
const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
);

/** 픽스처 값으로 만든 설정. 경로 앵커만 실제 앱 루트다. */
export const testConfig = defineTestContent({
  root: resolve(WORKSPACE_ROOT, 'apps', 'blog', 'web'),
});

export const testContent: ContentApi = createContent(testConfig);
