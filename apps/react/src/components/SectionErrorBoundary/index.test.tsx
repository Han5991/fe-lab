import { Suspense } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { vi } from 'vitest';
import {
  SectionErrorBoundary,
  StatsErrorBoundary,
  ChartErrorBoundary,
  ActivityErrorBoundary,
} from './index';
import { StatsError, ChartError, ActivityError } from '@/shared';

const ThrowError = ({ error }: { error: Error }) => {
  throw error;
};

const NormalComponent = () => <div>정상 렌더링</div>;

describe('SectionErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('에러가 없으면 자식 컴포넌트를 렌더링한다', () => {
    render(
      <SectionErrorBoundary sectionName="테스트" errorType={StatsError}>
        <NormalComponent />
      </SectionErrorBoundary>,
    );

    expect(screen.getByText('정상 렌더링')).toBeInTheDocument();
  });

  test('지정된 에러 타입이면 에러 UI를 표시한다', () => {
    const error = new StatsError('통계 에러 발생', 'STATS_ERROR');

    render(
      <SectionErrorBoundary sectionName="통계" errorType={StatsError}>
        <ThrowError error={error} />
      </SectionErrorBoundary>,
    );

    expect(screen.getByText('❌ 통계 에러')).toBeInTheDocument();
    expect(screen.getByText('통계 에러 발생')).toBeInTheDocument();
    expect(screen.getByText('에러 코드: STATS_ERROR')).toBeInTheDocument();
    expect(screen.getByText('에러 타입: StatsError')).toBeInTheDocument();
    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });

  test('다시 시도 버튼 클릭 시 에러를 리셋한다', () => {
    let shouldThrow = true;
    const ConditionalThrow = () => {
      if (shouldThrow) {
        throw new StatsError('일시적 에러');
      }
      return <div>복구됨</div>;
    };

    render(
      <SectionErrorBoundary sectionName="통계" errorType={StatsError}>
        <ConditionalThrow />
      </SectionErrorBoundary>,
    );

    expect(screen.getByText('❌ 통계 에러')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText('다시 시도'));

    expect(screen.getByText('복구됨')).toBeInTheDocument();
    expect(screen.queryByText('❌ 통계 에러')).not.toBeInTheDocument();
  });

  test('다시 시도는 onReset(QueryErrorResetBoundary의 reset)을 먼저 불러 useSuspenseQuery가 다시 요청하게 한다', async () => {
    let calls = 0;
    const queryFn = async () => {
      calls += 1;
      if (calls === 1) throw new StatsError('일시적 에러');
      return '복구됨';
    };
    const Data = () => {
      const { data } = useSuspenseQuery({ queryKey: ['reset-test'], queryFn });
      return <div>{data}</div>;
    };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <SectionErrorBoundary
              sectionName="통계"
              errorType={StatsError}
              onReset={reset}
            >
              <Suspense fallback={<div>로딩</div>}>
                <Data />
              </Suspense>
            </SectionErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('❌ 통계 에러')).toBeInTheDocument();

    fireEvent.click(screen.getByText('다시 시도'));

    expect(await screen.findByText('복구됨')).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  test('에러 코드가 없으면 에러 코드를 표시하지 않는다', () => {
    const error = new StatsError('통계 에러 발생');

    render(
      <SectionErrorBoundary sectionName="통계" errorType={StatsError}>
        <ThrowError error={error} />
      </SectionErrorBoundary>,
    );

    expect(screen.queryByText(/에러 코드:/)).not.toBeInTheDocument();
  });
});

describe('StatsErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('StatsError를 캐치하여 표시한다', () => {
    const error = new StatsError('통계 데이터 로드 실패', 'STATS_LOAD_ERROR');

    render(
      <StatsErrorBoundary>
        <ThrowError error={error} />
      </StatsErrorBoundary>,
    );

    expect(screen.getByText('❌ 통계 에러')).toBeInTheDocument();
    expect(screen.getByText('통계 데이터 로드 실패')).toBeInTheDocument();
    expect(screen.getByText('에러 코드: STATS_LOAD_ERROR')).toBeInTheDocument();
  });
});

describe('ChartErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('ChartError를 캐치하여 표시한다', () => {
    const error = new ChartError('차트 데이터 로드 실패', 'CHART_LOAD_ERROR');

    render(
      <ChartErrorBoundary>
        <ThrowError error={error} />
      </ChartErrorBoundary>,
    );

    expect(screen.getByText('❌ 차트 에러')).toBeInTheDocument();
    expect(screen.getByText('차트 데이터 로드 실패')).toBeInTheDocument();
    expect(screen.getByText('에러 코드: CHART_LOAD_ERROR')).toBeInTheDocument();
  });
});

describe('ActivityErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('ActivityError를 캐치하여 표시한다', () => {
    const error = new ActivityError(
      '활동 데이터 로드 실패',
      'ACTIVITY_LOAD_ERROR',
    );

    render(
      <ActivityErrorBoundary>
        <ThrowError error={error} />
      </ActivityErrorBoundary>,
    );

    expect(screen.getByText('❌ 활동 에러')).toBeInTheDocument();
    expect(screen.getByText('활동 데이터 로드 실패')).toBeInTheDocument();
    expect(
      screen.getByText('에러 코드: ACTIVITY_LOAD_ERROR'),
    ).toBeInTheDocument();
  });
});
