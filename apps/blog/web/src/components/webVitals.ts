import { sendGAEvent } from '@next/third-parties/google';
import type { Metric } from 'web-vitals';

/** GA4 이벤트 매개변수 값은 100자까지만 담긴다. */
const MAX_PARAM = 100;
/** `page_location`만은 1000자까지 받는다 — 한글 slug는 퍼센트 인코딩되면 100자를 쉽게 넘는다. */
const MAX_PAGE_LOCATION = 1000;
/**
 * web-vitals가 넘기는 지표 중 여기서 읽는 필드 — 테스트가 이 필드만으로 지표를 만들 수 있게 좁힌다.
 * 어떤 지표를 보낼지는 등록하는 쪽(`src/instrumentation-client.ts`)이 정한다.
 */
export type WebVitalMetric = Pick<
  Metric,
  'name' | 'id' | 'value' | 'delta' | 'rating'
>;

/**
 * GA4 이벤트 매개변수. `value`·`metric_id`·`metric_value`·`metric_delta`는 web-vitals 문서의
 * GA4 예시를 따른다. `metric_rating`은 등급별로 나누려고 더했고, `non_interaction`은 UA
 * 시절 패턴에서 온 것이라 GA4에서는 등록하지 않은 매개변수일 뿐 참여 지표에 영향이 없다.
 * `page_location`은 아래 `landingPageUrl`을 본다.
 */
export interface WebVitalsEvent {
  value: number;
  metric_id: string;
  metric_value: number;
  metric_delta: number;
  metric_rating: string;
  non_interaction: true;
  page_location: string;
}

/**
 * 지표 하나를 GA4 이벤트 매개변수로 — web-vitals 문서의 GA4 패턴.
 *
 * `value`는 `delta`다. 같은 로드에서 지표가 다시 보고되면(bfcache 복원 등) 합이 최종값이
 * 되도록. 정수로 반올림하고, 단위가 없는 CLS는 1000배해 소수 셋째 자리까지 남긴다.
 * 원값은 `metric_value`·`metric_delta`에 그대로 둔다.
 */
export function toWebVitalsEvent(
  metric: WebVitalMetric,
  landingUrl: string,
): WebVitalsEvent {
  const scale = metric.name === 'CLS' ? 1000 : 1;
  return {
    value: Math.round(metric.delta * scale),
    metric_id: metric.id.slice(0, MAX_PARAM),
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating.slice(0, MAX_PARAM),
    non_interaction: true,
    page_location: landingUrl.slice(0, MAX_PAGE_LOCATION),
  };
}

/**
 * 지표가 속한 페이지 — **하드 로드한 문서**의 URL.
 *
 * web-vitals는 문서 로드마다 한 번 재고, 등록(`src/instrumentation-client.ts`)도 문서마다 한 번이라
 * 소프트 내비게이션에 다시 등록되지 않는다. 그런데 LCP는 첫 클릭 뒤 유휴 시간에, CLS·INP는 탭이 숨겨질 때 보고돼서
 * 그 순간의 `location`은 이미 소프트 내비게이션으로 옮겨 간 페이지다. gtag가 그 주소를
 * `page_location`으로 찍으면 홈의 LCP가 글의 것으로 집계된다. 내비게이션 타이밍 항목의
 * `name`은 하드 로드의 URL이고 `pushState`로 바뀌지 않으므로 이벤트마다 그것으로 덮는다.
 */
function landingPageUrl(): string {
  const [entry] = performance.getEntriesByType('navigation');
  return entry?.name ?? window.location.href;
}

/** 지표 하나를 GA4 이벤트로 보낸다 — GA가 초기화된 뒤에 불러야 한다(`sendGAEvent`는 그 전이면 버린다). */
export function reportWebVital(metric: WebVitalMetric): void {
  sendGAEvent('event', metric.name, toWebVitalsEvent(metric, landingPageUrl()));
}
