import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit 설정 — `apps/blog/web`의 `next.config.ts`에 대응하는 자리.
 *
 * **정적 export가 전제다.** React 판이 `output: 'export'`로 서버 없는 산출물을
 * 내는 것과 같은 계약을 `adapter-static`이 맡는다. `strict: true`라 프리렌더로
 * 도달하지 못한 라우트가 있으면 빌드가 실패한다 — 조용히 SPA 폴백으로
 * 떨어지면 SSG 비교가 성립하지 않기 때문이다(React 판도 CSR bail-out을
 * 배포 워크플로에서 따로 막고 있다).
 *
 * 후행 슬래시는 라우트 옵션이라 `src/routes/+layout.ts`가 선언한다 — 여기가
 * 아니다. `next.config.ts`의 `trailingSlash: true`와 같은 계약이고, 호스팅
 * 쪽 짝(`html_handling: force-trailing-slash`)도 그대로다.
 */
export default {
  preprocess: vitePreprocess(),
  kit: {
    /**
     * 자산 참조를 **절대 경로**로 낸다. 기본값(`relative: true`)은
     * `./_app/…`를 내는데, 그러면 페이지 깊이마다 같은 청크가 다른 문자열로
     * 나가 산출물 검사·측정이 참조를 풀지 못한다(실제로 첫 측정이 0 KB로
     * 나왔다). React 판도 `/_next/…` 절대 경로이고 호스팅도 루트 기준이라,
     * 절대 경로가 두 사이트를 같은 조건에 둔다.
     */
    paths: { relative: false },
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      precompress: false,
      strict: true,
    }),
    prerender: {
      // 끊긴 내부 링크를 경고로 넘기지 않는다. check-seo가 산출물에서
      // 다시 잡지만, 빌드가 먼저 말해 주는 편이 고치기 싸다.
      handleHttpError: 'fail',
    },
  },
};
