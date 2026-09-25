import { act, render, screen } from '@testing-library/react';
import { ToastContainer, toasts } from '@design-system/ui';

describe('토스트', () => {
  afterEach(() => {
    act(() => toasts.clean());
    vi.useRealTimers();
  });

  test('위치당 limit(3)을 넘는 토스트는 대기열에 두었다가 앞의 것이 닫히면 올리고, cleanQueue는 대기열만 비운다', () => {
    render(<ToastContainer />);

    act(() => {
      for (let i = 1; i <= 5; i += 1) {
        toasts.show({ id: `t${i}`, message: `토스트 ${i}`, autoClose: false });
      }
      toasts.show({
        id: 'br',
        message: '아래',
        position: 'bottom-right',
        autoClose: false,
      });
    });
    expect(screen.getByText('토스트 3')).toBeInTheDocument();
    expect(screen.queryByText('토스트 4')).not.toBeInTheDocument();
    expect(screen.getByText('아래')).toBeInTheDocument();

    act(() => toasts.hide('t1'));
    expect(screen.queryByText('토스트 1')).not.toBeInTheDocument();
    expect(screen.getByText('토스트 4')).toBeInTheDocument();

    act(() => {
      toasts.cleanQueue();
      toasts.hide('t2');
    });
    expect(screen.getByText('토스트 4')).toBeInTheDocument();
    expect(screen.getByText('아래')).toBeInTheDocument();
    expect(screen.queryByText('토스트 5')).not.toBeInTheDocument();
  });

  test('다른 토스트가 뜨고 닫혀도 떠 있는 토스트의 자동 닫힘 시간은 처음부터 다시 세지 않는다', () => {
    vi.useFakeTimers();
    render(<ToastContainer />);

    act(() =>
      toasts.show({ id: 'a', message: '먼저 뜬 토스트', duration: 3000 }),
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // 스토어가 바뀌어 모든 토스트가 다시 렌더된다
    act(() =>
      toasts.show({ id: 'b', message: '나중 토스트', autoClose: false }),
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('먼저 뜬 토스트')).not.toBeInTheDocument();
    expect(screen.getByText('나중 토스트')).toBeInTheDocument();
  });
});
