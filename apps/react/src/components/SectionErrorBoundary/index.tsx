import type { ReactNode } from 'react';
import { Component } from 'react';
import { Box } from '@design-system/ui-lib/jsx';
import { StatsError, ChartError, ActivityError, AppError } from '@package/core';

interface Props {
  children: ReactNode;
  sectionName: string;
  errorTypes?: (typeof AppError)[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const { errorTypes } = this.props;

    // 특정 에러 타입만 캐치하도록 설정된 경우
    if (errorTypes && errorTypes.length > 0) {
      const shouldHandle = errorTypes.some(
        ErrorType => error instanceof ErrorType,
      );

      if (!shouldHandle) {
        // 이 ErrorBoundary에서 처리할 에러가 아니면 위로 전파
        throw error;
      }
    }

    console.error(`[${this.props.sectionName}] Error caught:`, error);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const error = this.state.error;
      const errorMessage = error.message;
      let errorCode = '';

      // 커스텀 에러 클래스인 경우 추가 정보 표시
      if (error instanceof AppError) {
        errorCode = error.code || '';
      }

      return (
        <Box
          border="2px solid #ef4444"
          borderRadius="8px"
          p={6}
          bg="#fef2f2"
          height="100%"
        >
          <Box fontSize="lg" fontWeight="bold" color="#dc2626" mb={2}>
            ❌ {this.props.sectionName} 에러
          </Box>
          <Box fontSize="sm" color="#991b1b" mb={2}>
            {errorMessage}
          </Box>
          {errorCode && (
            <Box fontSize="xs" color="#7f1d1d" mb={3}>
              에러 코드: {errorCode}
            </Box>
          )}
          <Box fontSize="xs" color="#6b7280" mb={3}>
            에러 타입: {error.constructor.name}
          </Box>
          <Box
            as="button"
            onClick={this.resetError}
            bg="#dc2626"
            color="white"
            px={4}
            py={2}
            borderRadius="4px"
            fontSize="sm"
            cursor="pointer"
            border="none"
          >
            다시 시도
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

// 섹션별 ErrorBoundary 래퍼
export const StatsErrorBoundary = ({ children }: { children: ReactNode }) => (
  <SectionErrorBoundary sectionName="통계" errorTypes={[StatsError]}>
    {children}
  </SectionErrorBoundary>
);

export const ChartErrorBoundary = ({ children }: { children: ReactNode }) => (
  <SectionErrorBoundary sectionName="차트" errorTypes={[ChartError]}>
    {children}
  </SectionErrorBoundary>
);

export const ActivityErrorBoundary = ({
  children,
}: {
  children: ReactNode;
}) => (
  <SectionErrorBoundary sectionName="활동" errorTypes={[ActivityError]}>
    {children}
  </SectionErrorBoundary>
);
