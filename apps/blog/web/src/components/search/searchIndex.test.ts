import { afterEach, expect, test, vi } from 'vitest';
import { fetchSearchIndex } from './searchIndex';

const entry = {
  slug: 'a',
  title: 'A',
  date: '2026-01-01',
  excerpt: 'e',
  tags: ['x'],
  series: 'lab/s',
  seriesTitle: 'S',
  contentPreview: 'c',
};

function serve(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json(body, { status }))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test('계약대로 생긴 색인은 그대로 돌려준다', async () => {
  serve([entry]);
  await expect(fetchSearchIndex()).resolves.toEqual([entry]);
});

test('실패 응답은 던진다 — "결과 없음"과 구분된다', async () => {
  serve([], 404);
  await expect(fetchSearchIndex()).rejects.toThrow('HTTP 404');
});

// 예전에는 빠진 필드를 빈 값으로 채워 넘겼다 — 생성기가 필드 이름을 바꾸면 본문 검색만
// 조용히 멈췄다. 같은 빌드가 만드는 파일이라 어긋남은 버그로 드러나야 한다.
test.each([
  ['배열이 아닌 본문', { posts: [entry] }],
  ['필드가 빠진 행', [{ ...entry, contentPreview: undefined }]],
  ['타입이 다른 필드', [{ ...entry, tags: 'x' }]],
])('%s은 던진다', async (_kind, body) => {
  serve(body);
  await expect(fetchSearchIndex()).rejects.toThrow('search index');
});
