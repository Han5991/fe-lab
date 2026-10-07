/** Web Vitals → GA4 이벤트 매개변수 — 단위·반올림·길이 한도. */
import { expect, test } from 'vitest';
import { toWebVitalsEvent, type WebVitalMetric } from './webVitals';

const metric = (over: Partial<WebVitalMetric>): WebVitalMetric => ({
  name: 'LCP',
  id: 'v4-1700000000000-1234567890123',
  value: 1234.56,
  delta: 1234.56,
  rating: 'good',
  ...over,
});

const LANDING = 'https://blog.example.test/';

test('ms 지표는 delta를 정수 ms로 value에 싣고, 원값은 metric_*에 그대로 둔다', () => {
  expect(
    toWebVitalsEvent(
      metric({ name: 'INP', value: 312.4, delta: 112.6 }),
      LANDING,
    ),
  ).toStrictEqual({
    value: 113,
    metric_id: 'v4-1700000000000-1234567890123',
    metric_value: 312.4,
    metric_delta: 112.6,
    metric_rating: 'good',
    non_interaction: true,
    page_location: LANDING,
  });
});

test('CLS는 단위가 없어 1000배해 반올림한다 — 0.0123이 0으로 사라지지 않게', () => {
  const event = toWebVitalsEvent(
    metric({ name: 'CLS', value: 0.0123, delta: 0.0123, rating: 'good' }),
    LANDING,
  );
  expect(event.value).toBe(12);
  expect(event.metric_value).toBe(0.0123);
});

test('문자열 매개변수는 GA4 한도(100자, page_location은 1000자)로 자른다', () => {
  const event = toWebVitalsEvent(
    metric({ id: 'x'.repeat(150), rating: 'needs-improvement' }),
    `${LANDING}posts/${'%EA%B0%80'.repeat(400)}/`,
  );
  expect(event.metric_id).toHaveLength(100);
  expect(event.metric_rating).toBe('needs-improvement');
  // page_location은 GA4가 1000자까지 받는다 — 100자로 자르면 한글 slug가 잘린다.
  expect(event.page_location).toHaveLength(1000);
});
