import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MockWebSocket } from '@/test/MockWebSocket';
import { useWebSocketQuery } from './useWebSocketQuery';

describe('useWebSocketQuery', () => {
  let queryClient: QueryClient;

  const renderQuery = (
    options: Omit<Parameters<typeof useWebSocketQuery>[0], 'url'>,
  ) => {
    const hook = renderHook(
      () => useWebSocketQuery({ url: 'ws://test', ...options }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      },
    );
    act(() => MockWebSocket.last().simulateOpen());
    return hook;
  };

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    queryClient = new QueryClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('서버 메시지를 도착 순서대로 하나씩 넘기고 내가 보낸 메시지는 넘기지 않는다', () => {
    const received: string[] = [];
    const { result } = renderQuery({ onMessage: data => received.push(data) });

    // 한 틱에 온 두 프레임(한 렌더로 합쳐진다)과 다음 렌더의 같은 내용
    act(() => {
      MockWebSocket.last().simulateMessage('AAPL');
      MockWebSocket.last().simulateMessage('MSFT');
    });
    act(() => MockWebSocket.last().simulateMessage('MSFT'));
    act(() => result.current.sendMessage('hello'));

    expect(received).toEqual(['AAPL', 'MSFT', 'MSFT']);
  });

  test('메시지마다 지정한 쿼리를 무효화한다', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderQuery({ invalidateQueries: [['stocks']] });

    act(() => {
      MockWebSocket.last().simulateMessage('a');
      MockWebSocket.last().simulateMessage('b');
    });

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['stocks'] });
  });
});
