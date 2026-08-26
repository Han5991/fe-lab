'use client';

import { useViewCount } from '@/src/hooks/useViewCount';
import { useRecordRecentView } from '@/src/hooks/useRecentViews';

/**
 * 화면을 그리지 않는 클라이언트 잎 — 글 페이지의 런타임 부수효과(조회수 RPC,
 * 최근 본 글 기록)만 진다. 페이지 본체는 서버 컴포넌트라 훅을 직접 들 수 없고,
 * 이 둘 때문에 페이지 전체를 클라이언트로 만들면 본문 컴파일러까지 번들에
 * 딸려온다.
 */
export function PostRuntime({ slug, title }: { slug: string; title: string }) {
  useViewCount(slug);
  useRecordRecentView(slug, title);
  return null;
}
