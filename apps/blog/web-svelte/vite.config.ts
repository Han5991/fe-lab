import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * `__CONTENT_ROOT__` — 콘텐츠 파이프라인의 **경로 앵커**를 빌드 타임에 박는다.
 *
 * `content.config.mts`의 계약은 `root: import.meta.url`이다. 설정 파일의 위치가
 * 곧 앵커라서 패키지가 모노레포 구조를 몰라도 되는 설계인데, **번들러가 그
 * 파일을 옮기는 순간 깨진다**: Vite가 설정을 `.svelte-kit/output/server/`로
 * 묶으면 `import.meta.url`이 그 출력 파일을 가리켜 `dirs.content`(`../posts`)가
 * `.svelte-kit/output/server/posts`로 풀린다. 실제로 그 경로를 scandir하다
 * ENOENT로 빌드가 죽었다.
 *
 * blog-content CLI는 이 설정을 plain node로 읽으므로 거기서는 계약이 그대로
 * 옳다 — 그래서 설정 파일은 손대지 않고, **앱 그래프에서만** 앵커를 실제 앱
 * 디렉터리로 덮는다(`src/lib/server/content.ts`). `defineContent`가 절대 경로
 * 앵커도 받도록 열어 둔 것이 여기서 쓰인다.
 *
 * Next.js 판에는 이 문제가 없다 — 설정이 서버 그래프에 실리되 `import.meta.url`이
 * 원래 파일을 계속 가리킨다. 번들러가 갈리면 앵커 계약도 갈린다는 뜻이라,
 * 프레임워크 중립성 점검(#392)의 항목으로 남길 것.
 */
const appRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    __CONTENT_ROOT__: JSON.stringify(appRoot),
  },
});
