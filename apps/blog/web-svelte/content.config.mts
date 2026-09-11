/**
 * 경로 앵커 + 배선 — `apps/blog/web/content.config.mts`와 같은 계약이다.
 * **이 파일의 위치가 `dirs.*`의 기준**이라(`root: import.meta.url`), 패키지는
 * 모노레포 구조를 모른 채 `../posts`를 푼다. CLI는 cwd에서 위로 올라가며 이
 * 파일을 찾는다.
 *
 * React 판과 다른 것은 `dirs` 셋뿐이다 — SvelteKit의 관례가 `static/`(공개
 * 자산)과 `build/`(산출물)라, Next.js의 `public/`·`out/`을 그대로 쓸 수 없다.
 * 나머지 경로는 그 둘에서 파생되므로 함께 옮긴다.
 *
 * 서버/빌드 전용 — 클라이언트 그래프로 import하지 말 것.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineContent } from '@blog/content';
import { themeColor } from '@design-system/ui/blog-preset';
import {
  AUTHOR,
  DIAGRAM_NAMES,
  META_FILENAMES,
  SITE,
  TIMEZONE,
} from './content.values.mts';

// pretendard 배포판의 정적 OTF — satori가 웹폰트 CSS(woff2)를 못 읽는다.
// `createRequire().resolve`가 아니라 경로 조립인 이유는 React 판 주석과 같다:
// 번들러가 resolve 호출을 정적 분석해 폰트 파일을 전부 모듈로 끌면 빌드가 깨진다.
const appRoot = dirname(fileURLToPath(import.meta.url));
const pretendardStatic = (file: string): string =>
  join(appRoot, 'node_modules', 'pretendard', 'dist', 'public', 'static', file);

export default defineContent({
  root: import.meta.url,
  site: SITE,
  author: AUTHOR,
  timezone: TIMEZONE,
  registries: { diagramNames: DIAGRAM_NAMES, metaFilenames: META_FILENAMES },
  dirs: {
    public: 'static',
    out: 'build',
    media: 'static/posts',
    thumbs: 'static/thumbs',
    og: 'static/og',
  },
  og: {
    // 팔레트는 값이 아니라 디자인 토큰에서 파생된다 — hex를 옮겨 적지 않는다.
    palette: {
      paper: themeColor('dark', 'paper.50'),
      ink: themeColor('dark', 'ink.950'),
      inkMeta: themeColor('dark', 'ink.600'),
      inkRule: themeColor('dark', 'ink.200'),
      accent: themeColor('dark', 'accent.500'),
      pillBorder: themeColor('dark', 'accent.200'),
    },
    fonts: [
      {
        name: 'Pretendard',
        weight: 400,
        path: pretendardStatic('Pretendard-Regular.otf'),
      },
      {
        name: 'Pretendard',
        weight: 500,
        path: pretendardStatic('Pretendard-Medium.otf'),
      },
      {
        name: 'Pretendard',
        weight: 700,
        path: pretendardStatic('Pretendard-Bold.otf'),
      },
    ],
  },
});
