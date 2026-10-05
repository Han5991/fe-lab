/**
 * 네트워크 봉인 — 이 스위트는 로컬 서버(`wrangler dev`) 밖으로 요청을 하나도 내보내지
 * 않는다.
 *
 * - Supabase(PostgREST·RPC·Edge Function·Auth)는 **실제 응답 모양의 JSON으로 채운다.**
 *   끊어 버리면 앱이 실패 경로(`console.error`)를 타서, 이 스위트가 지키려는 "콘솔
 *   에러 0"이 시끄러워지고 진짜 회귀를 가린다. 모양의 출처는
 *   `src/lib/platform/database.types.ts`(행·RPC Returns)와
 *   `src/lib/platform/adminActions.ts`(Edge Function action)다.
 * - 분석 태그(GA4·GTM)·Giscus는 빈 성공 응답으로 조용히 막는다. `abort()`는 크로미움이
 *   "Failed to load resource" 콘솔 에러를 찍으므로 쓰지 않는다.
 * - 그 밖의 외부 호스트는 알 수 없는 의존이다 — 막고 기록해 테스트가 실패하게 한다.
 *   새 외부 의존이 생기면 여기 목록에 명시적으로 넣어야 한다.
 */
import type { BrowserContext, Request, Route } from '@playwright/test';
import { SUPABASE_URL } from './site';

/** 조용히 막는 서드파티 — 응답이 비어도 앱 동작에 영향이 없는 것만. */
const STUBBED_HOSTS = [
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'region1.google-analytics.com',
  'analytics.google.com',
  'stats.g.doubleclick.net',
  'giscus.app',
  // GTM 컨테이너가 싣는 Microsoft Clarity(AGENTS.md §7). gtm.js를 빈 응답으로 막으니
  // 실제로는 닿지 않지만, 컨테이너 내용이 저장소 밖이라 미리 적어 둔다.
  'www.clarity.ms',
];

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'access-control-expose-headers': 'content-range, x-supabase-api-version',
};

/** 같은 slug에는 언제나 같은 값 — 실행마다 화면이 달라지지 않게 한다. */
function seeded(slug: string, salt: number, max: number): number {
  let h = 2166136261 ^ salt;
  for (const ch of slug) {
    h = Math.imul(h ^ (ch.codePointAt(0) ?? 0), 16777619);
  }
  return (h >>> 0) % max;
}

/** PostgREST의 `in.(a,"b,c")` 필터 값을 slug 목록으로 푼다. */
function parseInFilter(value: string | null): string[] {
  const inner = /^in\.\((.*)\)$/s.exec(value ?? '')?.[1];
  if (!inner) return [];
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
  for (const m of inner.matchAll(re)) {
    out.push(m[1] !== undefined ? m[1].replace(/\\(.)/g, '$1') : (m[2] ?? ''));
  }
  return out.filter(Boolean);
}

/** `post_views` 읽기 — `Database['public']['Tables']['post_views']['Row']`의 부분형. */
function postViewsRows(url: URL) {
  const rows = parseInFilter(url.searchParams.get('slug'))
    .map(slug => ({ slug, view_count: 10 + seeded(slug, 1, 990) }))
    .sort(
      (a, b) => b.view_count - a.view_count || a.slug.localeCompare(b.slug),
    );
  const limit = Number(url.searchParams.get('limit') ?? rows.length);
  return rows.slice(0, limit);
}

function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Edge Function 요청 본문 — `adminActions.ts`의 `AdminRequest` 모양. */
interface AdminRequestBody {
  action?: string;
  params?: { slugs?: string[]; slug?: string };
}

/** `admin-analytics` action별 응답 — 대리 호출하는 RPC의 `Returns` 모양을 `{ data }`로 감싼다. */
function adminAnalytics(body: AdminRequestBody): unknown {
  const slugs = body.params?.slugs ?? [];
  const slug = body.params?.slug ?? '';
  switch (body.action) {
    case 'all_post_stats':
      return slugs.map(s => ({
        slug: s,
        today_views: seeded(s, 2, 20),
        total_views: 50 + seeded(s, 3, 2000),
      }));
    case 'all_posts_trends':
      return slugs.flatMap(s =>
        Array.from({ length: 30 }, (_, i) => ({
          slug: s,
          view_date: isoDay(i),
          view_count: seeded(`${s}:${i}`, 4, 40),
        })),
      );
    case 'post_hourly_distribution':
      return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        view_count: seeded(`${slug}:${hour}`, 5, 60),
      }));
    case 'post_dow_distribution':
      return Array.from({ length: 7 }, (_, dow) => ({
        dow,
        view_count: seeded(`${slug}:${dow}`, 6, 200),
      }));
    default:
      return null;
  }
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function fulfillSupabase(
  route: Route,
  request: Request,
  unexpected: string[],
): Promise<void> {
  const url = new URL(request.url());
  if (request.method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  }
  if (url.pathname === '/rest/v1/post_views' && request.method() === 'GET') {
    return json(route, 200, postViewsRows(url));
  }
  if (url.pathname === '/rest/v1/rpc/increment_view_count') {
    // RETURNS void — PostgREST는 본문 없는 204를 준다.
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  }
  if (url.pathname === '/functions/v1/admin-analytics') {
    const data = adminAnalytics(request.postDataJSON() as AdminRequestBody);
    return data === null
      ? json(route, 400, { error: 'unknown action' })
      : json(route, 200, { data });
  }
  if (url.pathname === '/auth/v1/logout') {
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  }
  // 모양을 모르는 Supabase 경로 — 조용히 넘기지 않고 테스트를 실패시킨다.
  unexpected.push(`${request.method()} ${url.pathname}`);
  return json(route, 501, { error: `e2e mock 없음: ${url.pathname}` });
}

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const STUB_BODY: Readonly<Record<string, string>> = {
  script: '',
  document: '<!doctype html><html lang="ko"><title>stub</title></html>',
};

/**
 * 컨텍스트 하나의 모든 요청을 봉인한다. `unexpected`에는 목록에 없는 외부 요청과
 * 모양을 모르는 Supabase 경로가 쌓인다 — 픽스처가 끝에서 비어 있음을 단언한다.
 */
export async function sealNetwork(
  context: BrowserContext,
  baseURL: string,
  unexpected: string[],
): Promise<void> {
  const own = new URL(baseURL).origin;
  const supabase = new URL(SUPABASE_URL).origin;

  await context.route('**/*', async (route, request) => {
    const url = new URL(request.url());
    if (url.origin === own || url.protocol === 'data:') {
      return route.fallback();
    }
    if (url.origin === supabase) {
      return fulfillSupabase(route, request, unexpected);
    }
    if (STUBBED_HOSTS.includes(url.hostname)) {
      return route.fulfill({
        status: 200,
        headers: {
          'content-type':
            request.resourceType() === 'document'
              ? 'text/html'
              : 'application/javascript',
        },
        body: STUB_BODY[request.resourceType()] ?? '',
      });
    }
    if (request.resourceType() === 'image') {
      // 원고가 외부 CDN(velog 등)에 둔 본문 이미지. 그 호스트의 생사는 이 게이트가 볼
      // 일이 아니다(링크 부패는 claude-link-rot.yml) — 투명 1px로 채워 레이아웃만 남긴다.
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'image/png' },
        body: TRANSPARENT_PNG,
      });
    }
    unexpected.push(`${request.method()} ${request.url()}`);
    return route.abort('blockedbyclient');
  });
}
