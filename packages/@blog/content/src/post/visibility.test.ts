import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPostVisible, resolvePostState } from './visibility';

test('status가 없으면 비공개 (fail-closed)', () => {
  assert.equal(isPostVisible({}), false);
});

test('status: published는 항상 공개', () => {
  assert.equal(isPostVisible({ status: 'published' }), true);
});

test('status: draft는 항상 비공개', () => {
  assert.equal(isPostVisible({ status: 'draft' }), false);
});

test('scheduled: scheduledDate도 date도 없으면 비공개', () => {
  assert.equal(isPostVisible({ status: 'scheduled' }), false);
  assert.equal(isPostVisible({ status: 'scheduled', date: null }), false);
});

// --- scheduledDate 생략 시 date 폴백 ---
// scheduledDate는 date와 값이 겹치는 중복 필드였습니다. 시각까지 지정할 때만 쓰고,
// 날짜만 필요하면 date 하나로 충분합니다.

test('scheduled: scheduledDate가 없으면 date를 공개 시각으로 사용', () => {
  const past = new Date('2026-05-23T15:00:01Z'); // KST 2026-05-24 00:00:01
  assert.equal(
    isPostVisible({ status: 'scheduled', date: '2026-05-24' }, past),
    true,
  );
  const before = new Date('2026-05-23T14:59:59Z'); // KST 2026-05-23 23:59:59
  assert.equal(
    isPostVisible({ status: 'scheduled', date: '2026-05-24' }, before),
    false,
  );
});

test('scheduled: scheduledDate가 있으면 date보다 우선', () => {
  // date는 이미 지났지만 scheduledDate가 미래면 비공개여야 한다.
  const now = new Date('2026-05-24T00:00:00Z');
  assert.equal(
    isPostVisible(
      {
        status: 'scheduled',
        date: '2020-01-01',
        scheduledDate: '2099-01-01T00:00:00Z',
      },
      now,
    ),
    false,
  );
});

test('published/draft는 date 폴백과 무관', () => {
  const now = new Date('2020-01-01T00:00:00Z');
  // date가 미래여도 published면 공개
  assert.equal(
    isPostVisible({ status: 'published', date: '2099-01-01' }, now),
    true,
  );
  // date가 과거여도 draft면 비공개
  assert.equal(
    isPostVisible({ status: 'draft', date: '1999-01-01' }, now),
    false,
  );
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

// --- resolvePostState: 화면에 보여줄 "현재 상태" ---
// status는 발행 의도의 기록이고, 배지는 지금 공개인지를 말해야 합니다.
// admin PostAccordion이 이 규칙을 자체 구현했다가 아래 두 케이스를 놓쳐서,
// 이미 공개돼 조회수가 쌓이는 글을 몇 달째 "예약"으로 표시했습니다.

test('resolvePostState: published/draft는 status 그대로', () => {
  const now = new Date('2026-05-24T00:00:00Z');
  assert.equal(resolvePostState({ status: 'published' }, now), 'published');
  assert.equal(resolvePostState({ status: 'draft' }, now), 'draft');
  // date가 미래여도 published면 공개 상태
  assert.equal(
    resolvePostState({ status: 'published', date: '2099-01-01' }, now),
    'published',
  );
});

test('resolvePostState: 예약 시각이 지나면 published (원본 status는 scheduled 그대로)', () => {
  const post = { status: 'scheduled', scheduledDate: '2026-05-24' };
  assert.equal(
    resolvePostState(post, new Date('2026-05-23T15:00:01Z')),
    'published',
  );
  // 파생 계산일 뿐 입력을 건드리지 않는다 — 원본은 예약으로 남는다.
  assert.equal(post.status, 'scheduled');
});

test('resolvePostState: 예약 시각 전이면 scheduled', () => {
  assert.equal(
    resolvePostState(
      { status: 'scheduled', scheduledDate: '2026-05-24' },
      new Date('2026-05-23T14:59:59Z'), // KST 2026-05-23 23:59:59
    ),
    'scheduled',
  );
});

test('resolvePostState(회귀): scheduledDate 없이 date만 있어도 지나면 published', () => {
  // 이 버그의 본체. scheduledDate는 "시각까지 지정할 때만" 쓰는 선택 필드라
  // 대부분의 예약 글에는 없다. scheduledDate가 있을 때만 승격하는 구현은
  // 이런 글을 영원히 '예약'으로 남긴다.
  assert.equal(
    resolvePostState(
      { status: 'scheduled', date: '2026-03-03' },
      new Date('2026-07-27T00:00:00Z'),
    ),
    'published',
  );
  assert.equal(
    resolvePostState(
      { status: 'scheduled', date: '2026-03-03' },
      new Date('2026-03-02T00:00:00Z'),
    ),
    'scheduled',
  );
});

test('resolvePostState(회귀): KST 자정 경계 — UTC 파싱으로 회귀하면 깨진다', () => {
  // now = UTC 2026-05-23 16:00 = KST 2026-05-24 01:00 (KST 자정은 지났다).
  // native Date로 'YYYY-MM-DD'를 파싱하면 UTC 자정(=KST 09:00)이 되어 아직 scheduled로 보인다.
  assert.equal(
    resolvePostState(
      { status: 'scheduled', date: '2026-05-24' },
      new Date('2026-05-23T16:00:00Z'),
    ),
    'published',
    'KST 자정을 지났으면 공개 상태여야 함',
  );
  // 반대편 경계: KST 자정 9시간 전에는 아직 예약이어야 한다.
  assert.equal(
    resolvePostState(
      { status: 'scheduled', date: '2026-05-24' },
      new Date('2026-05-23T06:00:00Z'), // KST 2026-05-23 15:00
    ),
    'scheduled',
  );
});

test('resolvePostState: scheduledDate가 date보다 우선', () => {
  // date는 지났지만 scheduledDate가 미래면 아직 예약
  assert.equal(
    resolvePostState(
      {
        status: 'scheduled',
        date: '2020-01-01',
        scheduledDate: '2099-01-01T00:00:00Z',
      },
      new Date('2026-05-24T00:00:00Z'),
    ),
    'scheduled',
  );
});

test('resolvePostState: 공개 시각이 없는 예약 글은 계속 scheduled', () => {
  const now = new Date('2026-05-24T00:00:00Z');
  assert.equal(resolvePostState({ status: 'scheduled' }, now), 'scheduled');
  assert.equal(
    resolvePostState({ status: 'scheduled', date: null }, now),
    'scheduled',
  );
  // analytics의 PostStatDetail은 빈 값을 null로 정규화해 넘긴다.
  assert.equal(
    resolvePostState(
      { status: 'scheduled', scheduledDate: null, date: null },
      now,
    ),
    'scheduled',
  );
});

test('resolvePostState: scheduledDate가 null이면 date로 폴백', () => {
  // PostStatDetail이 실제로 넘기는 형태 (scheduledDate: string | null)
  assert.equal(
    resolvePostState(
      { status: 'scheduled', scheduledDate: null, date: '2026-03-03' },
      new Date('2026-07-27T00:00:00Z'),
    ),
    'published',
  );
});

test('resolvePostState: status 누락·미지 값은 draft (fail-closed)', () => {
  const now = new Date('2026-05-24T00:00:00Z');
  assert.equal(resolvePostState({}, now), 'draft');
  assert.equal(resolvePostState({ status: 'unknown-value' }, now), 'draft');
  // 미지 status에 과거 date가 있어도 공개로 승격되지 않는다.
  assert.equal(
    resolvePostState({ status: 'archived', date: '2000-01-01' }, now),
    'draft',
  );
});

test('resolvePostState는 isPostVisible과 같은 규칙을 쓴다 (계약)', () => {
  const now = new Date('2026-05-24T00:00:00Z');
  const cases = [
    {},
    { status: 'published' },
    { status: 'draft' },
    { status: 'unknown' },
    { status: 'scheduled' },
    { status: 'scheduled', date: '2020-01-01' },
    { status: 'scheduled', date: '2099-01-01' },
    { status: 'scheduled', scheduledDate: '2020-01-01', date: '2099-01-01' },
    { status: 'scheduled', scheduledDate: '2099-01-01', date: '2020-01-01' },
    { status: 'scheduled', scheduledDate: null, date: '2020-01-01' },
    { status: 'draft', date: '2000-01-01' },
  ];
  for (const data of cases) {
    assert.equal(
      resolvePostState(data, now) === 'published',
      isPostVisible(data, now),
      `공개 판정이 갈라짐: ${JSON.stringify(data)}`,
    );
  }
});
