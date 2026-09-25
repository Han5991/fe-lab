import { act, render, renderHook, screen } from '@testing-library/react';
import {
  ToastContainer,
  toasts,
  useDistributedToasts,
} from '@design-system/ui';

const showMany = (count: number) => {
  for (let i = 1; i <= count; i += 1) {
    toasts.show({ id: `t${i}`, message: `토스트 ${i}`, autoClose: false });
  }
};

describe('토스트', () => {
  afterEach(() => {
    act(() => toasts.clean());
    vi.useRealTimers();
  });

  test('위치당 limit(3)을 넘는 토스트는 대기열에 두었다가 앞의 것이 닫히면 올린다', () => {
    render(<ToastContainer />);

    act(() => showMany(5));

    expect(screen.getByText('토스트 3')).toBeInTheDocument();
    expect(screen.queryByText('토스트 4')).not.toBeInTheDocument();

    act(() => toasts.hide('t1'));
    expect(screen.queryByText('토스트 1')).not.toBeInTheDocument();
    expect(screen.getByText('토스트 4')).toBeInTheDocument();

    act(() => toasts.hide('t2'));
    expect(screen.getByText('토스트 5')).toBeInTheDocument();
  });

  test('useDistributedToasts는 대기열을 보여 주고 cleanQueue는 대기열만 비운다', () => {
    const { result } = renderHook(() => useDistributedToasts());

    act(() => showMany(5));
    expect(result.current.toasts.map(toast => toast.id)).toEqual([
      't1',
      't2',
      't3',
    ]);
    expect(result.current.queue.map(toast => toast.id)).toEqual(['t4', 't5']);

    act(() => toasts.cleanQueue());
    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.queue).toHaveLength(0);
  });

  test('limit은 위치마다 따로 센다', () => {
    const { result } = renderHook(() => useDistributedToasts());

    act(() => {
      showMany(3);
      toasts.show({ id: 'br', message: '아래', position: 'bottom-right' });
    });

    expect(result.current.toasts.map(toast => toast.id)).toContain('br');
    expect(result.current.queue).toHaveLength(0);
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
