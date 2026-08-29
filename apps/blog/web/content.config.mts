/**
 * 이 앱의 콘텐츠 파이프라인 설정 — `blog-content` CLI와 앱 코드가 함께 읽는
 * 단일 출처.
 *
 * `root: import.meta.url`이 계약의 핵심이다: **이 파일의 위치가 경로 앵커**라서
 * `dirs.*`(기본값: `../posts`, `public`, …)가 전부 여기 기준으로 풀린다.
 * CLI는 cwd에서 위로 올라가며 이 파일을 찾고(pnpm 스크립트의 cwd가 앱
 * 디렉터리라 항상 잡힌다), 앱은 `src/content.ts`가 정적 import한다.
 * 확장자가 `.mts`인 이유: 이 앱 package.json에 `"type": "module"`이 없어
 * `.ts`면 node가 CommonJS로 파싱했다가 ESM으로 재파싱한다(경고 + 오버헤드).
 *
 * 서버/빌드 전용 — 클라이언트 컴포넌트 그래프로 import하지 말 것. 클라이언트도
 * 보는 값(타임존·다이어그램 이름)은 `content.values.mts`에서 직접 가져온다.
 *
 * **사이트 고유 값은 전부 `content.values.mts`가 소유한다.** 패키지
 * (`@blog/content`)에는 사이트 정체성 기본값이 없다 — 어떤 기본값이든 특정
 * 사이트의 하드코딩이고, 예전엔 그 기본값과 앱이 직접 읽던 리터럴이 갈라질 수
 * 있었다(설정으로 덮어도 화면·산출물은 그대로였다). 여기 남는 것은 값을 설정에
 * 잇는 **배선**뿐이다.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineContent } from '@blog/content';
import { themeColor } from '@design-system/ui/blog-preset';
import {
  AUTHOR,
  BUNDLE_GUARDS,
  DIAGRAM_NAMES,
  LLMS_DOCS,
  LLMS_FACTS,
  LLMS_INTRO,
  META_FILENAMES,
  SITE,
  SITEMAP_PRIORITY,
  SITEMAP_STATIC_PAGES,
  TIMEZONE,
} from './content.values.mts';

/**
 * OG 카드 폰트 파일의 위치 — 팔레트처럼 **파생값**이라 값 모듈이 아니라 여기서
 * 푼다(값 모듈은 값 import 금지). satori는 웹폰트 CSS(woff2)를 못 읽어 OTF
 * 정적 웨이트가 필요한데, 화면 웹폰트(`layout.tsx`)와 같은 pretendard 배포판에서
 * 가져오므로 카드와 지면의 글자가 한 버전으로 묶인다. 파일을 읽는 것은
 * 생성기의 몫이고 여기는 위치만 서술한다.
 *
 * `createRequire().resolve`가 아니라 경로 조립인 이유: 이 파일은 앱의 서버
 * 그래프에도 실리는데(`src/content.ts`), Turbopack이 resolve 호출의 동적
 * 세그먼트를 글롭해 폰트 파일 전부를 모듈로 끌려다 빌드가 깨진다(otf/ttf
 * 로더 없음). `join()`은 번들러에 불투명하고, pretendard는 이 앱의 **직접
 * 의존**이라 pnpm이 앱 바로 아래 `node_modules/pretendard` 심링크를 보장한다.
 */
const appRoot = dirname(fileURLToPath(import.meta.url));
const pretendardStatic = (file: string): string =>
  join(appRoot, 'node_modules', 'pretendard', 'dist', 'public', 'static', file);

export default defineContent({
  root: import.meta.url,
  site: SITE,
  author: AUTHOR,
  timezone: TIMEZONE,
  registries: { diagramNames: DIAGRAM_NAMES, metaFilenames: META_FILENAMES },
  og: {
    /**
     * OG 카드 색은 **디자인 토큰에서 뽑는다**. satori/sharp가 CSS 변수도 oklch도
     * 못 읽어 카드 렌더에는 리터럴 색이 필요한데, 예전에는 그래서 값 모듈이
     * hex를 손으로 옮겨 적었다 — 팔레트를 바꾸면 카드만 옛 색으로 남았고,
     * 렌더는 성공하므로 아무도 실패로 알려주지 않았다.
     *
     * **다크만 쓴다** — OG 카드는 지면이 `paper.50` 다크인 한 가지 디자인이다.
     */
    palette: {
      paper: themeColor('dark', 'paper.50'),
      ink: themeColor('dark', 'ink.950'),
      inkMeta: themeColor('dark', 'ink.600'),
      // 카드의 가로 룰. 같은 자리의 `ink.border`는 rgba라 카드 지면 위에서
      // 합성이 필요한데, 불투명 짝이 `ink.200`이라 그쪽을 쓴다.
      inkRule: themeColor('dark', 'ink.200'),
      accent: themeColor('dark', 'accent.500'),
      // 시리즈 pill의 2px 보더 — 반투명 accent.
      pillBorder: themeColor('dark', 'accent.200'),
    },
    // 카드 템플릿이 쓰는 세 웨이트(400·500·700). name은 satori 등록용이다.
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
  sitemap: { ...SITEMAP_PRIORITY, staticPages: SITEMAP_STATIC_PAGES },
  // 규칙 목록이 통째로 실린다 — 어느 코드가 어느 라우트의 것인가는 이
  // 사이트의 어휘라 패키지가 채워 줄 반쪽이 없다.
  bundleGuards: BUNDLE_GUARDS,
  llms: {
    indexIntro: LLMS_INTRO.index,
    fullIntro: LLMS_INTRO.full,
    docs: LLMS_DOCS,
    facts: LLMS_FACTS,
  },
});
