/**
 * dev 서버에서만 draft·scheduled 글을 노출하는 게이트를 잠그는 테스트.
 *
 * 이 게이트가 새면 draft가 그대로 발행됩니다. NODE_ENV를 실제로 바꿔가며
 * 실제 posts 디렉토리에 대해 검증합니다.
 *
 * 특히 중요한 케이스: 정적 산출물 스크립트(sitemap/rss/search-index/llms-full)는
 * tsx로 직접 실행되어 NODE_ENV가 **undefined**입니다. 게이트가 `!== 'production'`
 * 같은 느슨한 비교로 바뀌면 draft가 sitemap·RSS에 실려 나갑니다.
 */
import { expect, test } from 'vitest';
import { isPostVisible } from './visibility.ts';
import { testContent } from './testing.ts';

// runtime.isDevelopment 기본값은 호출 시점에 process.env.NODE_ENV를 읽으므로,
// 같은 인스턴스로도 NODE_ENV를 바꿔가며 게이트를 검증할 수 있다.
const { getAllPosts, getAllPostsIncludingHidden } = testContent;

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

// process.env.NODE_ENV는 @types/node에서 readonly로 선언되어 직접 대입이 막힌다.
const mutableEnv = process.env as Record<string, string | undefined>;

/**
 * readAllPosts의 캐시는 필터링 전 **전체** 글을 담으므로 NODE_ENV와 무관합니다.
 * (NODE_ENV는 캐시를 쓸지 말지만 결정) 따라서 여기서 캐시를 비울 필요가 없습니다.
 */
function withNodeEnv<T>(value: string | undefined, fn: () => T): T {
  if (value === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = value;
  try {
    return fn();
  } finally {
    if (ORIGINAL_NODE_ENV === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = ORIGINAL_NODE_ENV;
  }
}

const slugsOf = (posts: { slug: string }[]) => posts.map(p => p.slug).sort();

// isPostVisible을 filter에 직접 넘기면 Array.filter의 index(숫자)가 두 번째 인자
// now(Date) 자리에 주입된다 — service.ts가 화살표로 감싸는 이유와 동일.
const visibleOnly = <T extends Parameters<typeof isPostVisible>[0]>(
  posts: T[],
) => posts.filter(p => isPostVisible(p));

test('production에서는 공개 글만 반환한다', () => {
  const visible = withNodeEnv('production', () => slugsOf(getAllPosts()));
  const expected = slugsOf(visibleOnly(getAllPostsIncludingHidden()));
  expect(visible).toStrictEqual(expected);
});

test('NODE_ENV가 undefined(빌드 스크립트 컨텍스트)여도 공개 글만 반환한다', () => {
  // prebuild/predev의 sitemap·rss·search-index·llms-full이 도는 환경.
  // 여기서 draft가 새면 비공개 글이 sitemap과 RSS로 나간다.
  const visible = withNodeEnv(undefined, () => slugsOf(getAllPosts()));
  const expected = slugsOf(visibleOnly(getAllPostsIncludingHidden()));
  expect(visible).toStrictEqual(expected);
});

test('development에서는 draft·scheduled까지 전부 반환한다', () => {
  const all = withNodeEnv('development', () => slugsOf(getAllPosts()));
  const everything = slugsOf(getAllPostsIncludingHidden());
  expect(all).toStrictEqual(everything);
});

test('development의 결과는 production의 상위집합이다', () => {
  const dev = withNodeEnv('development', () => slugsOf(getAllPosts()));
  const prod = withNodeEnv('production', () => slugsOf(getAllPosts()));
  for (const slug of prod) {
    expect(
      dev.includes(slug),
      `dev 목록에 공개 글이 빠짐: ${slug}`,
    ).toBeTruthy();
  }
  expect(
    dev.length >= prod.length,
    'dev가 production보다 적게 반환할 수는 없다',
  ).toBeTruthy();
});

test('now 주입은 production 경로에서만 의미를 갖는다 (dev는 시각 무관 전체 노출)', () => {
  const farPast = new Date('2000-01-01T00:00:00Z');
  // 과거 시각을 주면 예약 글은 아직 공개 전이므로 production에서는 빠진다.
  const prodPast = withNodeEnv('production', () =>
    slugsOf(getAllPosts(farPast)),
  );
  const prodNow = withNodeEnv('production', () => slugsOf(getAllPosts()));
  expect(prodPast.length <= prodNow.length).toBeTruthy();

  // dev는 now와 무관하게 전부 보여야 한다.
  const devPast = withNodeEnv('development', () =>
    slugsOf(getAllPosts(farPast)),
  );
  expect(devPast).toStrictEqual(slugsOf(getAllPostsIncludingHidden()));
});
