import fs from 'node:fs';
import path from 'node:path';
import type { SiteConfig, TimezoneConfig } from '../shared/contentConfig.ts';
import { parseScheduledDateKST } from '../shared/dates.ts';
import { postUrl, RSS_PATH, type PostSummary } from '../post/index.ts';
import { resolvePostSet } from './artifacts.ts';
import type { ContentContext } from './context.ts';

/**
 * RSS XML 빌더 — 글마다 제목·링크·날짜·요약(excerpt)만 싣는 순수 문자열 조립.
 *
 * **본문 전문(content:encoded)은 싣지 않는다.** 2026-07 SEO 점검 항목으로 최신
 * 20편의 전문 HTML을 넣었다가(#131) 뺐다. 전문이 있어야 할 근거는 기록된 적이
 * 없고, 대가는 셋이었다:
 * - 피드 리더 안에서 읽힌 글은 사이트에 오지 않아 조회수·댓글이 보지 못한다
 * - 사이트 전용 커스텀 태그를 피드용 HTML로 따로 매핑해야 해서, 새 태그가 생길
 *   때마다 어긋났다 — `<diagram>`이 변환 없이 나가 리더에서 통째로 사라졌다
 * - 이 패키지가 그 렌더링 하나 때문에 React 스택(react-dom/server·react-markdown)을
 *   의존했다
 * 요약은 항상 있다 — frontmatter에 excerpt가 없으면 로더가 본문 앞부분으로 채우고
 * (`resolveExcerptFrom`), 발행 글은 prebuild `--strict`가 `missing-excerpt`로 직접 쓰게 한다.
 */

/**
 * XML 1.0이 허용하는 문자인가 — 탭·개행·CR과 U+0020 이상(서로게이트 영역·
 * U+FFFE/FFFF 제외). 제목에 붙여 넣은 U+000B 같은 제어 문자는 엔티티로도 쓸 수
 * 없어서, 하나만 섞여도 리더가 **피드 전체**를 거부한다.
 */
function isXmlChar(code: number): boolean {
  return (
    code === 0x9 ||
    code === 0xa ||
    code === 0xd ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    code >= 0x10000
  );
}

/**
 * @internal RSS 본문에 들어가는 raw text 전용 XML 이스케이프.
 *           모듈 외부에서는 사용을 권장하지 않으며 (entity awareness 없음 — 이미
 *           escape된 문자열을 다시 이중 인코딩함), 테스트에서 동작 잠금 목적으로만 export.
 *           XML에 쓸 수 없는 문자(제어 문자·짝 없는 서로게이트)는 버린다.
 */
export function escapeXml(str: string): string {
  // for…of는 코드포인트 단위라 짝 없는 서로게이트가 따로 걸러진다.
  return [...str]
    .filter(ch => isXmlChar(ch.codePointAt(0) ?? 0))
    .join('')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type RssPost = Pick<PostSummary, 'slug' | 'title' | 'date' | 'excerpt'>;

interface RssBuildOptions {
  /** 사이트 정체성 — 진입점이 컨텍스트의 설정을 넘긴다(기본값 없음) */
  site: Pick<SiteConfig, 'url' | 'name' | 'description'>;
  /** 'YYYY-MM-DD' pubDate를 어느 타임존의 자정으로 볼지 */
  timezone: Pick<TimezoneConfig, 'isoOffset'>;
  /** lastBuildDate / pubDate fallback 시 사용 — 테스트에서 결정성 확보용 */
  now?: Date;
}

/**
 * RSS XML을 생성합니다.
 * 옵션을 주입받아 결정성을 확보합니다 (테스트에서 재현 가능하도록).
 */
export function buildRssXml(
  posts: RssPost[],
  options: RssBuildOptions,
): string {
  const {
    site: { url: siteUrl, name: siteName, description: siteDescription },
    timezone,
    now = new Date(),
  } = options;

  const rssItems = posts
    .map(
      post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl(post.slug, siteUrl)}</link>
      <guid isPermaLink="true">${postUrl(post.slug, siteUrl)}</guid>
      <pubDate>${post.date ? parseScheduledDateKST(timezone, post.date).toUTCString() : now.toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}
    </item>`,
    )
    .join('\n');

  // 채널 문구도 설정에서 오는 **텍스트**다 — 항목(title·excerpt)만 이스케이프하던
  // 때는 사이트 이름에 `&` 하나만 있어도 XML이 깨져 리더가 피드 전체를 거부했다.
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${siteName} | ${siteDescription.split('。')[0]}`)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>ko</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}${RSS_PATH}" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;
}

export function main(ctx: ContentContext) {
  // 레지스트리 선언(postSet: 'visible', exact)과 같은 셀렉터.
  const posts = resolvePostSet(ctx, 'visible');
  const rss = buildRssXml(posts, {
    site: ctx.content.config.site,
    timezone: ctx.content.config.timezone,
    now: ctx.now,
  });
  // 파일 위치도 링크와 **같은 상수**에서 온다 — 갈리면 atom self URL이 404를
  // 가리킨다. `path.join`이 앞의 `/`를 흡수한다.
  fs.writeFileSync(path.join(ctx.content.paths.publicDir, RSS_PATH), rss);
  console.log('RSS feed generated successfully!');
}
