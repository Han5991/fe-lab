import type { ReactNode } from 'react';
import { Component } from 'react';
import type { ErrorInfo } from 'react';
import { Box } from '@design-system/ui-lib/jsx';
import { ApiError } from '@package/core';
import { ActivityError, ChartError, StatsError } from '@/shared';

type ErrorCtor<T extends Error = Error> = new (...args: never[]) => T;

interface Props<T extends Error = Error> {
  children: ReactNode;
  sectionName: string;
  errorType: ErrorCtor<T>; // 제너릭 생성자 시그니처로 일반화
  onReset?: () => void; // 선택: 리셋 시 외부 재시도 트리거
}

interface State {
  error: Error | null;
}

export class SectionErrorBoundary<T extends Error = Error> extends Component<
  Props<T>,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 여기서는 "그냥 저장"만 합니다. 처리 여부는 render에서 결정.
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    // 전파는 render에서 합니다. 여기서는 로깅만.
    console.error(`[${this.props.sectionName}]`, error, _info);
  }

  private isHandled(error: Error | null): error is T {
    if (!error) return false;
    return error instanceof this.props.errorType;
  }

  resetError = () => {
    this.setState({ error: null }, () => {
      this.props.onReset?.(); // React Query 재시도 등 외부 트리거
    });
  };

  render() {
    const { children, sectionName } = this.props;
    const { error } = this.state;

    if (error) {
      if (this.isHandled(error)) {
        // 담당 에러: 이 바운더리가 처리
        const message = error.message;
        const code = error instanceof ApiError ? (error.code ?? '') : '';

        return (
          <Box
            border="2px solid #ef4444"
            borderRadius="8px"
            p={6}
            bg="red.400"
            height="100%"
          >
            <Box fontSize="lg" fontWeight="bold" color="#dc2626" mb={2}>
              ❌ {sectionName} 에러
            </Box>
            <Box fontSize="sm" color="#991b1b" mb={2}>
              {message}
            </Box>
            {code && (
              <Box fontSize="xs" color="#7f1d1d" mb={3}>
                에러 코드: {code}
              </Box>
            )}
            <Box fontSize="xs" color="#6b7280" mb={3}>
              에러 타입: {error.constructor?.name ?? 'Error'}
            </Box>
            <Box
              as="button"
              type="button"
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
      // 담당 아님: 렌더 단계에서 재-throw → 상위 바운더리로 전파
      throw error;
    }

    return children;
  }
}

export const StatsErrorBoundary = ({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="통계"
    errorType={StatsError}
    onReset={onReset}
  >
    {children}
  </SectionErrorBoundary>
);

export const ChartErrorBoundary = ({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="차트"
    errorType={ChartError}
    onReset={onReset}
  >
    {children}
  </SectionErrorBoundary>
);

export const ActivityErrorBoundary = ({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset?: () => void;
}) => (
  <SectionErrorBoundary
    sectionName="활동"
    errorType={ActivityError}
    onReset={onReset}
  >
    {children}
  </SectionErrorBoundary>
);
