import { useState } from 'react';
import { ToastContainer, toasts } from '@design-system/ui';
import { Button } from '@design-system/ui';
import { css } from '@design-system/ui-lib/css';

export const ToastExamplePage = () => {
  const [isLoading, setIsLoading] = useState(false);

  // 기본 토스트 예제
  const showSuccessToast = () => {
    toasts.show({
      message: '성공적으로 저장되었습니다!',
      type: 'success',
    });
  };

  const showErrorToast = () => {
    toasts.show({
      message: '오류가 발생했습니다. 다시 시도해주세요.',
      type: 'error',
    });
  };

  const showWarningToast = () => {
    toasts.show({
      message: '주의: 이 작업은 되돌릴 수 없습니다.',
      type: 'warning',
    });
  };

  const showInfoToast = () => {
    toasts.show({
      message: '새로운 업데이트가 있습니다.',
      type: 'info',
    });
  };

  // 위치별 토스트 예제
  const showTopLeftToast = () => {
    toasts.show({
      message: 'Top Left 위치 토스트',
      type: 'info',
      position: 'top-left',
    });
  };

  const showTopRightToast = () => {
    toasts.show({
      message: 'Top Right 위치 토스트',
      type: 'success',
      position: 'top-right',
    });
  };

  const showBottomCenterToast = () => {
    toasts.show({
      message: 'Bottom Center 위치 토스트',
      type: 'warning',
      position: 'bottom-center',
    });
  };

  // 비동기 작업 시뮬레이션
  const simulateAsyncOperation = async () => {
    setIsLoading(true);

    const toastId = toasts.show({
      message: '데이터를 처리하는 중...',
      type: 'info',
      duration: 0, // 수동 관리
      autoClose: false,
    });

    try {
      // 2초 대기 (API 호출 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 성공 시 토스트 업데이트
      toasts.update({
        id: toastId,
        message: '데이터 처리 완료!',
        type: 'success',
        duration: 3000,
        autoClose: true,
      });
    } catch {
      // 에러 시 토스트 업데이트
      toasts.update({
        id: toastId,
        message: '데이터 처리 실패',
        type: 'error',
        duration: 5000,
        autoClose: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 여러 토스트 동시 표시
  const showMultipleToasts = () => {
    toasts.show({
      message: '첫 번째 토스트',
      type: 'success',
    });

    setTimeout(() => {
      toasts.show({
        message: '두 번째 토스트',
        type: 'info',
      });
    }, 500);

    setTimeout(() => {
      toasts.show({
        message: '세 번째 토스트',
        type: 'warning',
      });
    }, 1000);
  };

  // 모든 토스트 제거
  const clearAllToasts = () => {
    toasts.clean();
  };

  return (
    <div
      className={css({
        padding: '32px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
      })}
    >
      <h1
        className={css({
          fontSize: '2xl',
          fontWeight: 'bold',
          marginBottom: '24px',
          textAlign: 'center',
        })}
      >
        Toast 시스템 예제
      </h1>

      <div
        className={css({
          display: 'grid',
          gap: '24px',
        })}
      >
        {/* 기본 토스트 타입들 */}
        <section>
          <h2
            className={css({
              fontSize: 'lg',
              fontWeight: 'semibold',
              marginBottom: '16px',
            })}
          >
            기본 토스트 타입
          </h2>
          <div
            className={css({
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            })}
          >
            <Button onClick={showSuccessToast}>Success Toast</Button>
            <Button onClick={showErrorToast}>Error Toast</Button>
            <Button onClick={showWarningToast}>Warning Toast</Button>
            <Button onClick={showInfoToast}>Info Toast</Button>
          </div>
        </section>

        {/* 위치별 토스트 */}
        <section>
          <h2
            className={css({
              fontSize: 'lg',
              fontWeight: 'semibold',
              marginBottom: '16px',
            })}
          >
            위치별 토스트
          </h2>
          <div
            className={css({
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            })}
          >
            <Button onClick={showTopLeftToast}>Top Left</Button>
            <Button onClick={showTopRightToast}>Top Right</Button>
            <Button onClick={showBottomCenterToast}>Bottom Center</Button>
          </div>
        </section>

        {/* 비동기 작업 예제 */}
        <section>
          <h2
            className={css({
              fontSize: 'lg',
              fontWeight: 'semibold',
              marginBottom: '16px',
            })}
          >
            비동기 작업 시뮬레이션
          </h2>
          <Button onClick={simulateAsyncOperation} disabled={isLoading}>
            {isLoading ? '처리 중...' : '비동기 작업 시작'}
          </Button>
        </section>

        {/* 고급 예제 */}
        <section>
          <h2
            className={css({
              fontSize: 'lg',
              fontWeight: 'semibold',
              marginBottom: '16px',
            })}
          >
            고급 예제
          </h2>
          <div
            className={css({
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            })}
          >
            <Button onClick={showMultipleToasts}>여러 토스트 표시</Button>
            <Button onClick={clearAllToasts}>모든 토스트 제거</Button>
          </div>
        </section>

        {/* 사용법 안내 */}
        <section
          className={css({
            backgroundColor: 'gray.50',
            padding: '16px',
            borderRadius: '8px',
          })}
        >
          <h2
            className={css({
              fontSize: 'lg',
              fontWeight: 'semibold',
              marginBottom: '12px',
            })}
          >
            사용법
          </h2>
          <pre
            className={css({
              fontSize: 'sm',
              fontFamily: 'mono',
              overflow: 'auto',
            })}
          >
            {`// 기본 사용법
toasts.show({
  message: '메시지 내용',
  type: 'success' | 'error' | 'warning' | 'info',
  position: 'top-center', // 선택사항
  duration: 3000, // 선택사항 (ms)
});

// 비동기 작업 시
const id = toasts.show({ message: '로딩 중...', duration: 0 });
toasts.update({ id, message: '완료!', type: 'success' });`}
          </pre>
        </section>
      </div>

      {/* Toast Container는 앱 최상위에 한 번만 추가 */}
      <ToastContainer />
    </div>
  );
};
