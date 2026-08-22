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
import { defineContent } from '@blog/content';
import { darkColor } from '@design-system/ui/blog-preset';
import {
  AUTHOR,
  DIAGRAM_NAMES,
  LLMS_DOCS,
  LLMS_FACTS,
  LLMS_INTRO,
  SITE,
  SITEMAP_PRIORITY,
  SITEMAP_STATIC_PAGES,
  TIMEZONE,
} from './content.values.mts';

export default defineContent({
  root: import.meta.url,
  site: SITE,
  author: AUTHOR,
  timezone: TIMEZONE,
  registries: { diagramNames: DIAGRAM_NAMES },
  og: {
    /**
     * OG 카드 색은 **디자인 토큰에서 뽑는다**. satori/resvg가 CSS 변수도 oklch도
     * 못 읽어 카드 렌더에는 리터럴 색이 필요한데, 예전에는 그래서 값 모듈이
     * hex를 손으로 옮겨 적었다 — 팔레트를 바꾸면 카드만 옛 색으로 남았고,
     * 렌더는 성공하므로 아무도 실패로 알려주지 않았다.
     *
     * **다크만 쓴다** — OG 카드는 지면이 `paper.50` 다크인 한 가지 디자인이다.
     */
    palette: {
      paper: darkColor('paper.50'),
      ink: darkColor('ink.950'),
      inkMeta: darkColor('ink.600'),
      // 카드의 가로 룰. 같은 자리의 `ink.border`는 rgba라 카드 지면 위에서
      // 합성이 필요한데, 불투명 짝이 `ink.200`이라 그쪽을 쓴다.
      inkRule: darkColor('ink.200'),
      accent: darkColor('accent.500'),
      // 시리즈 pill의 2px 보더 — 반투명 accent.
      pillBorder: darkColor('accent.200'),
    },
  },
  sitemap: { ...SITEMAP_PRIORITY, staticPages: SITEMAP_STATIC_PAGES },
  llms: {
    indexIntro: LLMS_INTRO.index,
    fullIntro: LLMS_INTRO.full,
    docs: LLMS_DOCS,
    facts: LLMS_FACTS,
  },
});
