import { PageBoundary } from '@/src/components/PageBoundary';
import { AnalyticsScreen } from './AnalyticsScreen';

/**
 * admin 분석 — 고른 글이 없는 상태로 연다(`AnalyticsScreen`). 대시보드와 오갈 때 공개 페이지와 같은
 * 페이지 전환을 탄다(`PageBoundary`).
 */
export default function AdminAnalyticsPage() {
  return (
    <PageBoundary>
      <AnalyticsScreen />
    </PageBoundary>
  );
}
