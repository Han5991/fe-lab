// Mock posts for the FE Lab blog redesign
window.POSTS = [
  { slug: 'webpack-vs-vite-internals', title: '번들러 밑바닥부터 — webpack과 vite는 왜 다른 길을 갔는가', excerpt: 'esbuild, Rollup, SWC가 만나는 지점. 두 번들러의 그래프 빌드 전략을 디스어셈블해 비교합니다.', tags: ['bundler', 'webpack', 'vite'], series: '번들러 밑바닥부터', seriesIdx: 1, date: '2026-04-28', readMin: 14, views: 8420, popular: true },
  { slug: 'esbuild-plugin-from-scratch', title: 'esbuild 플러그인을 직접 만들면서 배운 것들', excerpt: 'onResolve / onLoad의 호출 순서, 캐싱, 그리고 Go 바이너리와 JS 사이의 IPC.', tags: ['bundler', 'esbuild'], series: '번들러 밑바닥부터', seriesIdx: 2, date: '2026-04-12', readMin: 11, views: 5290, popular: true },
  { slug: 'rollup-tree-shaking-myth', title: '"Tree shaking은 Rollup이 제일 잘한다"는 말의 함정', excerpt: 'side-effect 플래그가 실제로 어떻게 동작하는지, 그리고 실패하는 케이스 7가지.', tags: ['bundler', 'rollup', 'performance'], series: '번들러 밑바닥부터', seriesIdx: 3, date: '2026-03-30', readMin: 9, views: 4180 },
  { slug: 'branded-types-design', title: 'Branded Types를 안전하게 설계하는 4가지 패턴', excerpt: 'nominal typing이 없는 언어에서 도메인을 어떻게 표현할까. 실패 사례와 함께.', tags: ['typescript', 'architecture'], series: 'TypeScript 설계 패턴', seriesIdx: 1, date: '2026-04-21', readMin: 12, views: 7610, popular: true },
  { slug: 'discriminated-unions-real-world', title: 'Discriminated Union을 실무에서 쓰면 생기는 일', excerpt: '코드 리뷰에서 "이거 왜 이렇게 짰어?"를 줄이는 패턴 모음.', tags: ['typescript'], series: 'TypeScript 설계 패턴', seriesIdx: 2, date: '2026-04-05', readMin: 8, views: 3890 },
  { slug: 'react-19-use-hook', title: 'React 19 use() 훅을 컴파일된 결과까지 따라가보기', excerpt: 'Promise를 throw해서 Suspense에 잡히는 흐름. 사실은 Babel 변환에 비밀이 있다.', tags: ['react'], date: '2026-04-18', readMin: 13, views: 9120, popular: true },
  { slug: 'gemini-cli-contribution', title: 'gemini-cli에 PR 6개 보내며 배운 OSS 협업 리듬', excerpt: '큰 레포에서 작은 변화를 합의로 통과시키는 법.', tags: ['opensource', 'dx'], series: '오픈소스 일기', seriesIdx: 5, date: '2026-04-02', readMin: 10, views: 5710 },
  { slug: 'mantine-os-diary-3', title: 'Mantine 오픈소스 일기 #3 — Combobox 리팩토링 합의 과정', excerpt: '500줄짜리 PR을 200줄로 줄이는 과정. 코어 메인테이너의 코멘트를 그대로 옮겨봤다.', tags: ['opensource', 'react'], series: '오픈소스 일기', seriesIdx: 3, date: '2026-03-12', readMin: 9, views: 3420 },
  { slug: 'pnpm-catalog-rollout', title: 'pnpm catalog로 모노레포 의존성 정리한 후기', excerpt: '60개 워크스페이스의 React 버전이 6개로 갈라져 있던 상태에서.', tags: ['dx', 'monorepo'], date: '2026-03-25', readMin: 7, views: 2980 },
  { slug: 'app-router-cache-strategy', title: 'Next.js App Router 캐시 4계층, 한 장으로 정리', excerpt: 'fetch / Router / Full Route / Data — 어디서 어떤 캐시가 도는지.', tags: ['nextjs', 'performance'], date: '2026-03-15', readMin: 11, views: 6240, popular: true },
  { slug: 'panda-css-migration', title: 'Emotion에서 Panda CSS로 6개월에 걸쳐 갈아탔습니다', excerpt: '런타임 CSS-in-JS의 빌드타임 대안. 마이그레이션 비용은 어떻게 평가했나.', tags: ['dx', 'css'], date: '2026-03-08', readMin: 14, views: 4570 },
  { slug: 'react-compiler-first-impression', title: 'React Compiler 첫인상 — "useMemo가 사라진 코드"의 가독성', excerpt: '베타에서 RC로 넘어오며 달라진 점. 실제 프로덕션 사이즈로 측정.', tags: ['react'], date: '2026-02-26', readMin: 10, views: 5310 },
  { slug: 'monorepo-structure-cleanup', title: '모노레포 폴더 구조를 다시 그리며 합의한 13가지', excerpt: 'apps / packages / tools — 무엇을 기준으로 갈라야 하나.', tags: ['monorepo', 'architecture'], date: '2026-02-14', readMin: 12, views: 3210 },
  { slug: 'astro-vs-next-decision', title: 'Astro냐 Next냐 — 사내 워크숍 사이트를 만들며 비교', excerpt: 'island 아키텍처가 실제로 뭘 절약하나, 그리고 못 절약하는 것들.', tags: ['nextjs', 'architecture'], date: '2026-02-02', readMin: 9, views: 2870 },
  { slug: 'server-components-mental-model', title: 'Server Components를 두 번째로 설명할 때 쓰는 멘탈 모델', excerpt: 'RSC를 처음 들은 동료가 "왜 이걸 하지"라고 물었을 때 쓴 그림.', tags: ['react', 'nextjs'], date: '2026-01-28', readMin: 13, views: 7980, popular: true },
  { slug: 'vite-plugin-101', title: 'Vite plugin 101 — Rollup 호환성과 Vite 전용 훅의 경계', excerpt: 'transformIndexHtml, configResolved 같은 훅은 언제 쓰나.', tags: ['bundler', 'vite'], date: '2026-01-12', readMin: 8, views: 3120 },
  { slug: 'module-federation-real-world', title: 'Module Federation을 실무 도입할 때 흔히 빠지는 함정 5가지', excerpt: '버전 충돌, shared singleton, 그리고 빌드타임 vs 런타임 경계.', tags: ['bundler', 'architecture'], date: '2025-12-28', readMin: 14, views: 4910 },
];

window.SERIES = [
  { id: 'bundler-deep-dive', title: '번들러 밑바닥부터', count: 5, color: 'accent', desc: 'webpack/vite/esbuild/rollup의 그래프 빌드와 변환 파이프라인을 한 줄씩 따라가본다.', updated: '2026-04-28' },
  { id: 'ts-patterns', title: 'TypeScript 설계 패턴', count: 4, color: 'marker', desc: '도메인을 표현하는 타입, 그리고 컴파일러가 도와주는 지점.', updated: '2026-04-21' },
  { id: 'oss-diary', title: '오픈소스 일기', count: 8, color: 'moss', desc: 'Mantine, Node.js, gemini-cli, Next.js에 PR 보내고 배운 협업의 리듬.', updated: '2026-04-02' },
];

window.TAGS = [
  { id: 'bundler', label: 'bundler', count: 6 },
  { id: 'react', label: 'react', count: 5 },
  { id: 'typescript', label: 'typescript', count: 4 },
  { id: 'nextjs', label: 'nextjs', count: 4 },
  { id: 'opensource', label: 'opensource', count: 4 },
  { id: 'architecture', label: 'architecture', count: 4 },
  { id: 'performance', label: 'performance', count: 3 },
  { id: 'dx', label: 'dx', count: 3 },
  { id: 'monorepo', label: 'monorepo', count: 2 },
  { id: 'vite', label: 'vite', count: 2 },
  { id: 'css', label: 'css', count: 1 },
];

// Mock analytics — 30 day series for top 4 posts
function makeSeries(seed, base, growth, jitter) {
  const out = [];
  let v = base;
  let s = seed;
  for (let i = 0; i < 30; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = (s / 233280 - 0.5) * 2 * jitter;
    v = Math.max(0, v + growth + r);
    out.push({ day: i, value: Math.round(v) });
  }
  return out;
}
window.ANALYTICS = {
  range: '최근 30일',
  total: 84210,
  totalDelta: 0.124,
  uniques: 42180,
  uniquesDelta: 0.087,
  postsPublished: 4,
  topPosts: [
    { slug: 'react-19-use-hook', title: 'React 19 use() 훅을 컴파일된 결과까지', views: 9120, delta: 0.34, series: makeSeries(1, 180, 4, 60) },
    { slug: 'webpack-vs-vite-internals', title: '번들러 밑바닥부터 — webpack과 vite', views: 8420, delta: 0.21, series: makeSeries(2, 220, 2, 50) },
    { slug: 'server-components-mental-model', title: 'Server Components 멘탈 모델', views: 7980, delta: 0.18, series: makeSeries(3, 250, 1, 70) },
    { slug: 'branded-types-design', title: 'Branded Types 4가지 패턴', views: 7610, delta: -0.05, series: makeSeries(4, 240, 0, 50) },
    { slug: 'app-router-cache-strategy', title: 'Next.js App Router 캐시 4계층', views: 6240, delta: 0.09, series: makeSeries(5, 200, 0.5, 45) },
  ],
  totalSeries: makeSeries(99, 2400, 30, 280),
};

window.fmtDate = (s) => {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
};
window.fmtNum = (n) => n >= 1000 ? (n/1000).toFixed(n>=10000?0:1) + 'K' : String(n);
