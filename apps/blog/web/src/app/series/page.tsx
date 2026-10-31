import { css, cx } from '@blog/styled-system/css';

import { archivePath, POSTS_PATH } from '@blog/content/client';
import {
  getAllPostSummaries,
  getAllSeries,
  getSeriesMeta,
} from '@/src/content';
import { safeJsonLd } from '@blog/content/client';
import { PostListRow } from '@/src/components/blog/PostListRow';
import { postRowMeta, postRowMetaRaw } from '@/src/components/blog/postRow';
import { PageBoundary } from '@/src/components/PageBoundary';
import { inlineLink } from '@/src/components/inlineLink';
import { pressText } from '@/src/components/interaction';
import { railGutter, railColumn } from '@/src/components/Rail';
import { seriesBadgeRaw } from '@/src/components/seriesBadge';
import { TransitionLink } from '@/src/components/shared/TransitionLink';

import { attachSeriesPosts } from './seriesIndex';
import {
  buildSeriesJsonLd,
  buildSeriesMetadata,
  PAGE_DESCRIPTION,
} from './seo';

export const metadata = buildSeriesMetadata();

// 시리즈 배지(`seriesBadgeRaw`)는 h2 안에 놓이므로 줄 높이를 snug로 고정한다.
const seriesHeadingBadge = css(seriesBadgeRaw, { lineHeight: 'snug' });

// 글 목록에 기대지 않는 JSON-LD라 한 번만 만든다.
const jsonLd = buildSeriesJsonLd();

export default function SeriesPage() {
  // 로더 호출은 컴포넌트 안에 둔다. dev에서 `readAllPosts()`는 캐시를 건너뛰고
  // 매번 fs를 다시 읽는데(`repository.ts`), 그 설계는 요청마다 호출된다는
  // 전제 위에 있다 — 모듈 최상위로 올리면 dev 서버가 재시작 전까지 첫 요청
  // 시점 목록에 고정된다.
  const posts = getAllPostSummaries();
  // getAllSeries()는 최근 갱신 순으로 정렬해 돌려준다. 시리즈 "안"의 순서만
  // _series.yml의 order(없으면 날짜 오름차순)로 다시 잡는다.
  const series = attachSeriesPosts(
    getAllSeries(),
    posts,
    id => getSeriesMeta(id)?.order,
  );
  const seriesPostCount = series.reduce((sum, s) => sum + s.posts.length, 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary>
        <div className={cx(css({ bg: 'paper.50' }), railGutter)}>
          {/* /series는 글 본문과 같은 text 레일을 쓴다. */}
          <div
            className={cx(
              railColumn({ width: 'text' }),
              css({ py: { base: '10', md: '16' } }),
            )}
          >
            <header className={css({ mb: '[30px]' })}>
              <h1
                className={css({
                  fontSize: '[21px]',
                  fontWeight: 'bold',
                  color: 'ink.950',
                  mb: '[8px]',
                })}
              >
                시리즈
              </h1>
              <p
                className={css({
                  fontSize: '[14px]',
                  color: 'ink.600',
                  lineHeight: 'relaxed',
                })}
              >
                {PAGE_DESCRIPTION}
              </p>
              {series.length > 0 && (
                <p className={css(postRowMetaRaw, { mt: '[10px]' })}>
                  {series.length}개 시리즈 · {seriesPostCount}편
                </p>
              )}
            </header>

            {series.length === 0 ? (
              <p
                className={css({
                  py: '[24px]',
                  borderTopWidth: 'hairline',
                  borderTopStyle: 'solid',
                  borderColor: 'ink.border',
                  fontSize: '[14px]',
                  color: 'ink.600',
                })}
              >
                아직 묶인 시리즈가 없습니다.{' '}
                {/* 문장 속 링크 — 둘레 글자(ink.600)와 잉크 링크의 명도 차가 다크
                    2.59:1로 3:1에 못 미쳐 밑줄이 표식이다(inlineLink). */}
                <TransitionLink href={POSTS_PATH} className={inlineLink}>
                  전체 글 목록
                </TransitionLink>
                에서 모든 글을 볼 수 있습니다.
              </p>
            ) : (
              series.map(entry => (
                <section
                  key={entry.id}
                  className={css({ mb: '[34px]', _last: { mb: '0' } })}
                >
                  <div
                    className={css({
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '[16px]',
                      mb: '[8px]',
                    })}
                  >
                    {/* 배지 자체가 그 시리즈로 필터된 아카이브로 가는 링크다.
                        (글 목록 행이 h3라 시리즈 제목은 h2로 둔다) */}
                    <h2 className={css({ minW: '0' })}>
                      <TransitionLink
                        href={archivePath({ series: entry.id })}
                        className={css(pressText, {
                          display: 'inline-block',
                          _hover: { textDecorationLine: 'underline' },
                        })}
                      >
                        <span className={seriesHeadingBadge}>
                          {entry.title}
                        </span>
                      </TransitionLink>
                    </h2>
                    <span className={postRowMeta}>{entry.posts.length}편</span>
                  </div>

                  {entry.description && (
                    <p
                      className={css({
                        fontSize: '[13px]',
                        color: 'ink.600',
                        lineHeight: 'relaxed',
                        mb: '[10px]',
                      })}
                    >
                      {entry.description}
                    </p>
                  )}

                  <ol
                    className={css({ listStyleType: 'none', p: '0', m: '0' })}
                  >
                    {entry.posts.map(post => (
                      <PostListRow key={post.slug} post={post} />
                    ))}
                  </ol>
                </section>
              ))
            )}
          </div>
        </div>
      </PageBoundary>
    </>
  );
}
