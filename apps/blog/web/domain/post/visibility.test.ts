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
