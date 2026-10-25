import { css } from '@blog/styled-system/css';

import { POSTS_PATH, safeJsonLd } from '@blog/content/client';
import { getAllPostSummaries } from '@/src/content';
import { buildHomeJsonLd, buildHomeMetadata } from './homeSeo';

import { Hero } from '@/src/components/blog/Hero';
import { PostCard } from '@/src/components/blog/PostCard';
import { PostThumbRow } from '@/src/components/blog/PostThumbRow';
import { HomeSection } from '@/src/components/home/HomeSection';
import { OssStrip } from '@/src/components/home/OssStrip';
import { PageBoundary } from '@/src/components/PageBoundary';
import { Rail } from '@/src/components/Rail';

export const metadata = buildHomeMetadata();

const jsonLd = buildHomeJsonLd();

/** "최근 글" 쇼케이스에 놓는 글 수 — 큰 카드 1 + 옆 열 작은 카드 2(승인 목업). */
const RECENT_COUNT = 3;
/** "지난 글" 썸네일 목록의 글 수 — 두 열 네 줄. */
const OLDER_COUNT = 8;

export default function HomePage() {
  // 로더 호출은 컴포넌트 안에 둔다. dev에서 `readAllPosts()`는 캐시를 건너뛰고
  // 매번 fs를 다시 읽는데(`repository.ts`), 그 설계는 요청마다 호출된다는
  // 전제 위에 있다 — 모듈 최상위로 올리면 dev 서버가 재시작 전까지 첫 요청
  // 시점 목록에 고정돼 글을 추가·수정해도 화면에 반영되지 않는다.
  const allPosts = getAllPostSummaries();
  const [showcase, ...side] = allPosts.slice(0, RECENT_COUNT);
  const older = allPosts.slice(RECENT_COUNT, RECENT_COUNT + OLDER_COUNT);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary>
        {/* 히어로 위 간격과 섹션 사이 간격이 같은 토큰이다(md 이상 100 · 아래 48). */}
        <Rail
          width="wide"
          className={css({
            display: 'flex',
            flexDir: 'column',
            gap: 'section',
            pt: 'section',
          })}
        >
          <Hero />

          {showcase && (
            <HomeSection
              id="recent-posts"
              title="최근 글"
              more={{ href: POSTS_PATH, label: '모든 글' }}
            >
              {/* 1024px 이상은 2.4fr : 1fr(Astryx BlogShowcase), 아래는 큰 카드가 한 줄을 다 쓴다.
                  큰 카드의 커버는 옆 열 높이를 따라 늘지 않고 16:9로 고정이다 — 이미지 도착 전후로
                  높이가 같고(CLS), OG 카드의 글자가 잘리지 않는다. 옆 열이 더 길면 큰 카드 아래가 빈다. */}
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: {
                    base: '[minmax(0, 1fr)]',
                    lg: '[minmax(0, 2.4fr) minmax(0, 1fr)]',
                  },
                  gap: '8',
                  alignItems: 'start',
                })}
              >
                {/* LCP 후보 — 첫 화면에서 가장 큰 이미지라 이것만 바로 받는다. */}
                <PostCard post={showcase} variant="showcase" priority />
                {/* 작은 카드 둘. lg 이상은 옆 열로 행 높이까지 늘어 두 카드를 위아래 끝에 붙인다 —
                    옆 열이 더 짧으면 아래 카드의 끝이 큰 카드의 끝과 맞는다(목업 space-between).
                    md~lg는 큰 카드 아래에 두 열로 놓는다 — 한 열로 쌓으면 작은 카드도 큰 카드와 같은
                    폭의 커버를 받는데 제목은 작아 크기 위계가 뒤집힌다. md 미만은 한 열. */}
                <div
                  className={css({
                    alignSelf: 'stretch',
                    display: 'grid',
                    gridTemplateColumns: {
                      base: '[minmax(0, 1fr)]',
                      md: '[repeat(2, minmax(0, 1fr))]',
                      lg: '[minmax(0, 1fr)]',
                    },
                    alignContent: 'space-between',
                    columnGap: '8',
                    rowGap: '6',
                  })}
                >
                  {side.map(post => (
                    <PostCard key={post.slug} post={post} variant="default" />
                  ))}
                </div>
              </div>
            </HomeSection>
          )}

          {older.length > 0 && (
            <HomeSection
              id="older-posts"
              title="지난 글"
              more={{
                href: POSTS_PATH,
                label: `${allPosts.length}편 모두 보기`,
              }}
            >
              <ol
                aria-label="지난 글"
                className={css({
                  display: 'grid',
                  gridTemplateColumns: {
                    base: '[minmax(0, 1fr)]',
                    lg: '[repeat(2, minmax(0, 1fr))]',
                  },
                  columnGap: '8',
                  rowGap: '6',
                  listStyleType: 'none',
                  p: '0',
                  m: '0',
                })}
              >
                {older.map(post => (
                  <li key={post.slug} className={css({ minW: '0' })}>
                    <PostThumbRow post={post} />
                  </li>
                ))}
              </ol>
            </HomeSection>
          )}

          <OssStrip />
        </Rail>
      </PageBoundary>
    </>
  );
}
