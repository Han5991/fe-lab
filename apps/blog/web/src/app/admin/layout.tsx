import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { PageBoundary } from '@/src/components/PageBoundary';
import { AdminLayoutClient } from './AdminLayoutClient';
import { AdminQueryProvider } from './AdminQueryProvider';

// robots.txt의 Disallow는 크롤만 막고 색인은 막지 못하므로 noindex를 명시한다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * admin 영역은 페이지마다가 아니라 영역 전체를 페이지 전환 경계(PageBoundary) 하나에 담는다.
 * 경계가 없으면 셸 링크(워드마크 → 홈 등)로 떠날 때 admin 화면이 전환 스냅샷에 담기지 않아 첫
 * 프레임에 사라지고, 방향 있는 이동은 들어오는 페이지가 fast 뒤에 나타나 그 사이 지면이 빈다.
 *
 * - 레이아웃에 두는 것은 의도다 — 레이아웃은 admin 안의 이동을 건너 살아남아 enter/exit가 돌지
 *   않으므로, 영역을 드나드는 이동만 움직이고 admin 안의 이동은 전처럼 움직이지 않는다.
 * - 클라이언트 레이아웃(`AdminLayoutClient`)이 아니라 이 서버 레이아웃에 둔다 — 클라이언트에서 쓰면
 *   경계 코드와 `VIEW_TRANSITION` 그룹 객체가 클라이언트 그래프에 들어와, 공유 모듈을 거쳐 공개
 *   페이지 첫 로드까지 무거워졌다(실측 +128B gzip).
 *
 * React Query의 Provider(`AdminQueryProvider`)는 여기, 가장 바깥에 둔다. 가드(`AdminGuard`) 안이
 * 아니라 레이아웃인 것은 가드 밖에서 그려지는 로그인 화면도 `useMutation`을 쓰기 때문이고, 가장
 * 바깥인 것은 `PageBoundary` 안쪽 트리를 그대로 두기 위해서다.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminQueryProvider>
      <PageBoundary>
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </PageBoundary>
    </AdminQueryProvider>
  );
}
