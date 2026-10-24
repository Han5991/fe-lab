import { PageBoundary } from '@/src/components/PageBoundary';
import { DashboardScreen } from './DashboardScreen';

/** admin 대시보드 — 화면은 `DashboardScreen`이고, 여기서는 페이지 전환 경계만 씌운다. */
export default function AdminPage() {
  return (
    <PageBoundary>
      <DashboardScreen />
    </PageBoundary>
  );
}
