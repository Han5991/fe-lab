import fs from 'node:fs';
import path from 'node:path';
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
} from '../../shared/constants.ts';
import { CONTENT_PATHS } from '../../shared/contentPaths.ts';
import { parseScheduledDateKST } from '../../shared/dates.ts';
import { postUrl, type PostSummary } from '../../post/index.ts';
import { POST_SETS } from '../artifacts.ts';

/**
 * RSS XML 빌더 — **React 없이** 순수 문자열 조립만 한다.
 *
 * 본문 전문(content:encoded)의 마크다운 → HTML 변환은 `renderContent` 옵션으로
 * **주입**받는다(실제 렌더러는 feedRenderer.ts — react-dom/server 스택).
 * 예전에는 이 파일이 렌더러를 직접 들고 있어 buildRssXml을 import하는 모든
 * 곳이 React를 끌고 왔고, 헤딩 강등 공유 때문에 레이어 경계(render-build → app)
 * 예외까지 필요했다. 방향을 뒤집어 빌더는 렌더러를 모른다.
 */

/**
 * @internal RSS 본문에 들어가는 raw text 전용 XML 이스케이프.
 *           모듈 외부에서는 사용을 권장하지 않으며 (entity awareness 없음 — 이미
 *           escape된 문자열을 다시 이중 인코딩함), 테스트에서 동작 잠금 목적으로만 export.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type RssPost = Pick<
  PostSummary,
  'slug' | 'title' | 'date' | 'excerpt'
> & {
  /** 마크다운 원문 — 있으면(그리고 renderContent가 주입되면) content:encoded로 전문 포함 */
  content?: string;
  /** 상대 경로 이미지(`./img.png`)를 절대 URL로 바꿀 때 쓰는 포스트 디렉토리 */
  relativeDir?: string;
};

/** CDATA 종료 시퀀스(`]]>`)가 본문에 있어도 깨지지 않도록 분할 래핑 */
export function wrapCdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

/** content:encoded 전문을 포함할 최신 글 개수 — 피드 크기 무한 증가 방지 */
const DEFAULT_FULL_CONTENT_LIMIT = 20;

interface RssBuildOptions {
  siteUrl?: string;
  siteName?: string;
  siteDescription?: string;
  /** lastBuildDate / pubDate fallback 시 사용 — 테스트에서 결정성 확보용 */
  now?: Date;
  /**
   * content:encoded를 포함할 앞쪽 아이템 수 (posts는 최신순 정렬 가정 —
   * getAllPosts가 sortByDateDesc로 보장). 이후 글은 excerpt만 포함.
   */
  fullContentLimit?: number;
  /**
   * 마크다운 본문 → 피드용 HTML 렌더러. **주지 않으면 content:encoded가
   * 생략된다** — 진입점은 feedRenderer.ts의 renderContentHtml을 주입한다.
   */
  renderContent?: (
    content: string,
    siteUrl: string,
    relativeDir?: string,
  ) => string;
}

/**
 * RSS XML을 생성합니다.
 * 옵션을 주입받아 결정성을 확보합니다 (테스트에서 재현 가능하도록).
 */
export function buildRssXml(
  posts: RssPost[],
  options: RssBuildOptions = {},
): string {
  const {
    siteUrl = SITE_URL,
    siteName = SITE_NAME,
    siteDescription = SITE_DESCRIPTION,
    now = new Date(),
    fullContentLimit = DEFAULT_FULL_CONTENT_LIMIT,
    renderContent,
  } = options;

  const rssItems = posts
    .map(
      (post, index) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl(post.slug, siteUrl)}</link>
      <guid isPermaLink="true">${postUrl(post.slug, siteUrl)}</guid>
      <pubDate>${post.date ? parseScheduledDateKST(post.date).toUTCString() : now.toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}${post.content && renderContent && index < fullContentLimit ? `\n      <content:encoded>${wrapCdata(renderContent(post.content, siteUrl, post.relativeDir))}</content:encoded>` : ''}
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${siteName} | ${siteDescription.split('。')[0]}</title>
    <link>${siteUrl}</link>
    <description>${siteDescription}</description>
    <language>ko</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;
}

export async function main() {
  // React 스택은 진입점에서만, 동적 import로 든다 — buildRssXml을 import하는
  // 쪽(테스트·contract)은 react-dom을 로드하지 않는다.
  const { renderContentHtml } = await import('./feedRenderer.ts');
  // 레지스트리 선언(postSet: 'visible', exact)과 같은 셀렉터.
  const posts = POST_SETS.visible();
  const rss = buildRssXml(posts, { renderContent: renderContentHtml });
  fs.writeFileSync(path.join(CONTENT_PATHS.publicDir, 'rss.xml'), rss);
  console.log('RSS feed generated successfully!');
}
