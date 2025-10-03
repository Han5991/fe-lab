import { Suspense } from 'react';
import { Box, Grid } from '@design-system/ui-lib/jsx';
import {
  useDashboardStats,
  useChartData,
  useActivities,
} from '@/hooks/useDashboard';
import {
  StatsErrorBoundary,
  ChartErrorBoundary,
  ActivityErrorBoundary,
} from '@/components/SectionErrorBoundary';

// 통계 카드 컴포넌트
const StatCard = ({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) => (
  <Box border="1px solid #e5e7eb" borderRadius="8px" p={6} bg="white">
    <Box fontSize="sm" color="#6b7280" mb={2}>
      {title}
    </Box>
    <Box fontSize="2xl" fontWeight="bold" mb={1}>
      {value}
    </Box>
    <Box fontSize="sm" color={change.startsWith('+') ? '#10b981' : '#ef4444'}>
      {change}
    </Box>
  </Box>
);

// 통계 섹션
const StatsSection = () => {
  const { data: stats } = useDashboardStats();

  return (
    <>
      <StatCard
        title="총 방문자"
        value={stats.visitors.total.toLocaleString()}
        change={`${stats.visitors.change > 0 ? '+' : ''}${stats.visitors.change}%`}
      />
      <StatCard
        title="신규 가입"
        value={stats.signups.total.toLocaleString()}
        change={`${stats.signups.change > 0 ? '+' : ''}${stats.signups.change}%`}
      />
      <StatCard
        title="매출"
        value={`₩${stats.revenue.total.toLocaleString()}`}
        change={`${stats.revenue.change > 0 ? '+' : ''}${stats.revenue.change}%`}
      />
      <StatCard
        title="전환율"
        value={`${stats.conversion.rate}%`}
        change={`${stats.conversion.change > 0 ? '+' : ''}${stats.conversion.change}%`}
      />
    </>
  );
};

// 차트 영역 컴포넌트
const ChartWidget = () => {
  const { data } = useChartData();

  return (
    <Box border="1px solid #e5e7eb" borderRadius="8px" p={6} bg="white">
      <Box fontSize="lg" fontWeight="semibold" mb={4}>
        주간 트래픽
      </Box>
      <Box
        height="200px"
        bg="#f3f4f6"
        borderRadius="4px"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        p={4}
      >
        {data.labels.map((label, i) => (
          <Box key={label} fontSize="sm" mb={1}>
            {label}: {data.data[i]}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// 활동 피드 컴포넌트
const ActivityFeed = () => {
  const { data } = useActivities();

  return (
    <Box border="1px solid #e5e7eb" borderRadius="8px" p={6} bg="white">
      <Box fontSize="lg" fontWeight="semibold" mb={4}>
        최근 활동
      </Box>
      <Box display="flex" flexDirection="column" gap={3}>
        {data.map(activity => (
          <Box
            key={activity.id}
            p={3}
            bg="#f9fafb"
            borderRadius="4px"
            fontSize="sm"
          >
            • {activity.message}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// 로딩 폴백 컴포넌트
const LoadingFallback = ({ message }: { message: string }) => (
  <Box
    border="1px solid #e5e7eb"
    borderRadius="8px"
    p={6}
    bg="white"
    height="100%"
    display="flex"
    alignItems="center"
    justifyContent="center"
  >
    {message}
  </Box>
);

const ErrorDesignPage = () => (
  <Grid
    gridTemplateColumns="repeat(4, minmax(0, 1fr))"
    gridTemplateRows="auto repeat(3, 1fr)"
    gap={4}
    height="100vh"
    width="100vw"
    p={4}
    bg="#f9fafb"
  >
    {/* 헤더 */}
    <Box
      gridColumn="span 4"
      p={4}
      bg="white"
      borderRadius="8px"
      border="1px solid #e5e7eb"
    >
      <Box fontSize="2xl" fontWeight="bold">
        대시보드 - 에러 핸들링 예제
      </Box>
      <Box fontSize="sm" color="#6b7280" mt={2}>
        각 섹션은 독립적으로 로딩되고 에러를 처리합니다
      </Box>
    </Box>

    {/* 통계 카드 4개 - 독립적 Suspense + ErrorBoundary */}
    <StatsErrorBoundary>
      <Suspense
        fallback={
          <>
            <LoadingFallback message="통계 로딩..." />
            <LoadingFallback message="통계 로딩..." />
            <LoadingFallback message="통계 로딩..." />
            <LoadingFallback message="통계 로딩..." />
          </>
        }
      >
        <StatsSection />
      </Suspense>
    </StatsErrorBoundary>

    {/* 큰 차트 (2x2) - 독립적 Suspense + ErrorBoundary */}
    <Box gridColumn="span 2" gridRow="span 2">
      <ChartErrorBoundary>
        <Suspense fallback={<LoadingFallback message="차트 로딩..." />}>
          <ChartWidget />
        </Suspense>
      </ChartErrorBoundary>
    </Box>

    {/* 활동 피드 (2x2) - 독립적 Suspense + ErrorBoundary */}
    <Box gridColumn="span 2" gridRow="span 2">
      <ActivityErrorBoundary>
        <Suspense fallback={<LoadingFallback message="활동 로딩..." />}>
          <ActivityFeed />
        </Suspense>
      </ActivityErrorBoundary>
    </Box>
  </Grid>
);

export default ErrorDesignPage;
