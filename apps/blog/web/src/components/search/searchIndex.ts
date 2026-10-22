import {
  isPublicSearchIndexEntry,
  type PublicSearchIndexEntry,
  SEARCH_INDEX_PATH,
} from '@blog/content/client';

/**
 * 색인을 받아 온다 — 실패 응답도, 계약(`PublicSearchIndexEntry`)에서 벗어난 본문도 던져
 * "결과 없음"과 구분되게 한다. 색인은 화면과 같은 빌드가 만드므로 어긋남은 버그다 —
 * 빈 값으로 채워 넘기면 본문 검색만 조용히 멈춘다.
 */
export async function fetchSearchIndex(): Promise<PublicSearchIndexEntry[]> {
  const res = await fetch(SEARCH_INDEX_PATH);
  if (!res.ok) throw new Error(`search index: HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('search index: not an array');
  const entries: readonly unknown[] = data;
  if (!entries.every(isPublicSearchIndexEntry)) {
    throw new Error('search index: 계약과 다른 행');
  }
  return [...entries];
}
