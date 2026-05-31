import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPostVisible } from './visibility';

test('status가 없으면 published === true 일 때만 공개', () => {
  assert.equal(isPostVisible({ published: true }), true);
  assert.equal(isPostVisible({ published: false }), false);
  assert.equal(isPostVisible({}), false);
});

test('status: published는 항상 공개', () => {
  assert.equal(isPostVisible({ status: 'published' }), true);
});

test('status: draft는 항상 비공개', () => {
  assert.equal(isPostVisible({ status: 'draft' }), false);
  assert.equal(isPostVisible({ status: 'draft', published: true }), false);
});

test('scheduled: scheduledDate가 없으면 비공개', () => {
  assert.equal(isPostVisible({ status: 'scheduled' }), false);
});

test('scheduled: 과거 시각이면 공개', () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(
    isPostVisible({ status: 'scheduled', scheduledDate: past }),
    true,
  );
});

test('scheduled: 미래 시각이면 비공개', () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  assert.equal(
    isPostVisible({ status: 'scheduled', scheduledDate: future }),
    false,
  );
});

test('scheduled: scheduledDate가 string이 아니면 비공개', () => {
  assert.equal(
    isPostVisible({
      status: 'scheduled',
      scheduledDate: undefined,
    }),
    false,
  );
});

test('알 수 없는 status는 비공개', () => {
  assert.equal(isPostVisible({ status: 'unknown-value' }), false);
});

// --- 예약 발행(scheduled) 경계 — now 주입으로 결정적 검증 ---
// 'YYYY-MM-DD' scheduledDate는 KST 자정 기준으로 공개됩니다. UTC 자정으로 파싱하면
// KST보다 9시간 빨리 공개되는 버그(commit 0e2df5a 클래스)가 됩니다.
// 이전 테스트는 6년 이상 떨어진 날짜를 써서 9시간 shift를 실제로 구분하지 못했으나
// (KST/UTC 어느 쪽이든 결과 동일), now를 주입해 경계를 정확히 잠급니다.

const SCHEDULED_KST_DATE = '2026-05-24'; // KST 2026-05-24 00:00 = UTC 2026-05-23 15:00

test('scheduled(YYYY-MM-DD): KST 자정 직전이면 비공개', () => {
  const justBefore = new Date('2026-05-23T14:59:59Z'); // KST 2026-05-23 23:59:59
  assert.equal(
    isPostVisible(
      { status: 'scheduled', scheduledDate: SCHEDULED_KST_DATE },
      justBefore,
    ),
    false,
  );
});

test('scheduled(YYYY-MM-DD): KST 자정 정각이면 공개 (<= 경계)', () => {
  const atMidnight = new Date('2026-05-23T15:00:00Z');
  assert.equal(
    isPostVisible(
      { status: 'scheduled', scheduledDate: SCHEDULED_KST_DATE },
      atMidnight,
    ),
    true,
  );
});

test('scheduled(YYYY-MM-DD): KST 자정 직후면 공개', () => {
  const justAfter = new Date('2026-05-23T15:00:01Z');
  assert.equal(
    isPostVisible(
      { status: 'scheduled', scheduledDate: SCHEDULED_KST_DATE },
      justAfter,
    ),
    true,
  );
});

test('scheduled(YYYY-MM-DD): 9시간 shift 판별 — UTC 자정 파싱으로 회귀하면 깨지는 시점', () => {
  // now = UTC 2026-05-23 16:00 = KST 2026-05-24 01:00 (KST 자정은 이미 지남).
  // 올바른 KST 파싱: scheduled(UTC 15:00) <= now(16:00) → 공개.
  // (버그) UTC 자정 파싱: scheduled가 UTC 2026-05-24 00:00이 되어 now보다 미래 → 비공개.
  // 즉 parseScheduledDateKST가 UTC로 회귀하면 이 단언이 false가 되어 실패한다.
  const kstAfterMidnight = new Date('2026-05-23T16:00:00Z');
  assert.equal(
    isPostVisible(
      { status: 'scheduled', scheduledDate: SCHEDULED_KST_DATE },
      kstAfterMidnight,
    ),
    true,
    'KST 자정 지난 시점에는 공개여야 함 (UTC 파싱 회귀 시 비공개로 깨짐)',
  );
});

test('scheduled(offset 명시 +09:00): 해당 instant 경계로 판단', () => {
  // '2026-05-24T09:00:00+09:00' = UTC 2026-05-24 00:00:00
  const scheduledDate = '2026-05-24T09:00:00+09:00';
  assert.equal(
    isPostVisible(
      { status: 'scheduled', scheduledDate },
      new Date('2026-05-23T23:59:59Z'),
    ),
    false,
  );
  assert.equal(
    isPostVisible(
      { status: 'scheduled', scheduledDate },
      new Date('2026-05-24T00:00:00Z'), // 정각 == instant, <= 경계
    ),
    true,
  );
  assert.equal(
    isPostVisible(
      { status: 'scheduled', scheduledDate },
      new Date('2026-05-24T00:00:01Z'),
    ),
    true,
  );
});

test('비-scheduled status는 now 주입과 무관 (회귀 가드)', () => {
  const farPast = new Date('2000-01-01T00:00:00Z');
  const farFuture = new Date('2099-01-01T00:00:00Z');
  // published는 now·scheduledDate와 무관하게 항상 공개
  assert.equal(
    isPostVisible(
      { status: 'published', scheduledDate: '2099-12-31' },
      farPast,
    ),
    true,
  );
  assert.equal(isPostVisible({ status: 'published' }, farFuture), true);
  // draft는 now·scheduledDate와 무관하게 항상 비공개
  assert.equal(
    isPostVisible({ status: 'draft', scheduledDate: '2000-01-01' }, farFuture),
    false,
  );
});
