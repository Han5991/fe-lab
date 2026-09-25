import { expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineTestContent } from '../shared/testValues.ts';
import { createContext } from './context.ts';

test('컨텍스트의 로더 인스턴스는 인자 없이 불러도 실행의 기준 시각을 본다', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'context-now-'));
  const root = join(tmp, 'app');
  const postsDir = join(tmp, 'posts');
  mkdirSync(root, { recursive: true });
  mkdirSync(postsDir, { recursive: true });
  writeFileSync(
    join(postsDir, 'live.md'),
    "---\nstatus: published\ntitle: 발행 글\ndate: '2020-01-01'\nslug: live\n---\n\n본문.\n",
  );
  // 2100-01-02 00:00 +09:00에 공개 — 실제 시계로는 아직 비공개다.
  writeFileSync(
    join(postsDir, 'later.md'),
    "---\nstatus: scheduled\ntitle: 예약 글\ndate: '2100-01-02'\nslug: later\n---\n\n본문.\n",
  );
  const config = defineTestContent({ root });
  const configPath = join(root, 'content.config.mts');

  // 기준 시각을 공개 시각 뒤로 고정하면, 인자 없이 부르는 로더 메서드도 그
  // 시각으로 판정한다 — 산출물(resolvePostSet)과 페이지가 같은 글 집합을 본다.
  const after = createContext(
    config,
    configPath,
    new Date('2100-01-03T00:00:00Z'),
  );
  expect(after.content.getAllPostSlugs().sort()).toStrictEqual([
    'later',
    'live',
  ]);
  expect(after.content.getPostBySlug('later')?.slug).toBe('later');

  const before = createContext(
    config,
    configPath,
    new Date('2100-01-01T00:00:00Z'),
  );
  expect(before.content.getAllPostSlugs()).toStrictEqual(['live']);
});
