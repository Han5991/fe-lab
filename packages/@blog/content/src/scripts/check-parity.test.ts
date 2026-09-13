import { expect, test } from 'vitest';
import { checkParity, comparePage, fingerprint } from './check-parity.ts';

/**
 * 파리티 검사의 계약.
 *
 * 이 검사가 존재하는 이유가 곧 여기서 잠글 것이다 — 게이트가 전부 초록인 채로
 * 빈 화면이 통과했기 때문에 만들어졌다. 그래서 "빈 화면을 잡는가"가 첫 테스트다.
 */

const page = (body: string) =>
  `<html><head><link rel="icon" href="/favicon.ico"></head><body>${body}</body></html>`;

const NONE = new Set<string>();

test('같은 마크업이면 위반이 없다', () => {
  const html = page(
    '<h1 class="fs_xl c_ink.950">제목</h1><a href="/posts/">글</a>',
  );
  expect(
    comparePage('/', fingerprint(html), fingerprint(html), NONE),
  ).toStrictEqual([]);
});

test('빈 화면을 잡는다 — 이 검사가 만들어진 이유', () => {
  const full = page(
    '<h1 class="fs_xl">모든 노트</h1><a href="/posts/a/">a</a><button>필터</button>',
  );
  const empty = page('<h1 class="fs_xl">모든 노트</h1>');
  const axes = new Set(
    comparePage('/posts/', fingerprint(full), fingerprint(empty), NONE).map(
      v => v.axis,
    ),
  );
  expect(axes.has('link')).toBe(true);
  expect(axes.has('element')).toBe(true);
});

test('한쪽에만 있는 클래스를 잡는다 — 같은 프리셋이라 어휘가 공통이다', () => {
  // 실제로 이 축이 sticky 헤더의 backdrop blur 누락을 잡았다. 스크롤해야 보이는
  // 차이라 문서 높이·요소 수로는 안 잡힌다.
  const withBlur = page(
    '<header class="pos_sticky bkdp-blur_[12px]">h</header>',
  );
  const plain = page('<header class="">h</header>');
  const v = comparePage('/', fingerprint(withBlur), fingerprint(plain), NONE);
  expect(v).toHaveLength(1);
  expect(v[0]?.axis).toBe('class');
  expect(v[0]?.message).toContain('bkdp-blur_[12px]');
});

test('허용 목록에 적은 클래스는 차집합에서 빠진다', () => {
  const a = page('<svg class="lucide lucide-sun"></svg>');
  const b = page('<svg class=""></svg>');
  const allow = new Set(['lucide', 'lucide-sun']);
  expect(comparePage('/', fingerprint(a), fingerprint(b), allow)).toStrictEqual(
    [],
  );
});

test('속성 이스케이프 차이는 정규화한다', () => {
  // React는 클래스 속성의 `>`를 `&gt;`로 내보내고 SvelteKit은 그대로 둔다.
  // 정규화하지 않으면 Panda의 임의 셀렉터 클래스가 전부 거짓 양성이 된다.
  const escaped = page('<ol class="[&amp;_&gt;_li]:c_ink.500">x</ol>');
  const raw = page('<ol class="[&_>_li]:c_ink.500">x</ol>');
  expect(
    comparePage('/', fingerprint(escaped), fingerprint(raw), NONE),
  ).toStrictEqual([]);
});

test('에셋 프리로드는 링크 축에서 세지 않는다', () => {
  // 산출물 경로 관례(`/_next/…` 대 `/_app/…`)가 통째로 차이로 잡히면 신호가 묻힌다.
  const next = `<html><head><link rel="preload" href="/_next/static/a.js"></head><body><a href="/posts/">글</a></body></html>`;
  const kit = `<html><head><link rel="modulepreload" href="/_app/immutable/b.js"></head><body><a href="/posts/">글</a></body></html>`;
  const v = comparePage('/', fingerprint(next), fingerprint(kit), NONE);
  expect(v.filter(x => x.axis === 'link')).toStrictEqual([]);
});

test('헤딩은 순서와 텍스트까지 본다', () => {
  const a = page('<h2>먼저</h2><h3>나중</h3>');
  const b = page('<h2>나중</h2><h3>먼저</h3>');
  const v = comparePage('/', fingerprint(a), fingerprint(b), NONE);
  expect(v[0]?.axis).toBe('heading');
  expect(v[0]?.message).toContain('0번째');
});

test('헤딩 텍스트의 공백은 정규화한다 — 줄바꿈 위치는 프레임워크마다 다르다', () => {
  const a = page('<h2>모든\n   노트</h2>');
  const b = page('<h2>모든 노트</h2>');
  expect(comparePage('/', fingerprint(a), fingerprint(b), NONE)).toStrictEqual(
    [],
  );
});

test('아이콘·매니페스트 선언 누락을 잡는다', () => {
  // 실제로 이 축이 apple-touch-icon·webmanifest 누락을 잡았다. head에 있어서
  // 화면 기하로는 보이지 않는다.
  const rich = `<html><head><link rel="apple-touch-icon" href="/a.png"><link rel="manifest" href="/m.json"></head><body></body></html>`;
  const bare = `<html><head><link rel="icon" href="/f.ico"></head><body></body></html>`;
  const v = comparePage('/', fingerprint(rich), fingerprint(bare), NONE);
  const head = v.filter(x => x.axis === 'head');
  expect(head).toHaveLength(1);
  expect(head[0]?.message).toContain('apple-touch-icon');
});

test('한쪽에만 있는 페이지는 그 자체가 위반이다 — 라우트가 빠진 것이다', () => {
  const { violations } = checkParity(
    new Map([['/', page('')]]),
    new Map([
      ['/', page('')],
      ['/series/', page('')],
    ]),
    { pages: ['/', '/series/'] },
  );
  expect(violations).toHaveLength(1);
  expect(violations[0]?.page).toBe('/series/');
  expect(violations[0]?.message).toContain('대상 산출물에 없습니다');
});

test('pages를 비우면 양쪽에 다 있는 페이지 전부를 본다', () => {
  const { compared } = checkParity(
    new Map([
      ['/', page('')],
      ['/about/', page('')],
      ['/only-target/', page('')],
    ]),
    new Map([
      ['/', page('')],
      ['/about/', page('')],
    ]),
    {},
  );
  expect(compared).toStrictEqual(['/', '/about/']);
});
