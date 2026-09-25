import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MockWebSocket } from '@/test/MockWebSocket';
import { useWebSocketQuery } from './useWebSocketQuery';

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

describe('useWebSocketQuery', () => {
  let queryClient: QueryClient;

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

  test('렌더 전에 연달아 도착한 메시지도 빠짐없이 순서대로 onMessage에 넘긴다', () => {
    const received: string[] = [];
    renderHook(
      () =>
        useWebSocketQuery({
          url: 'ws://test',
          onMessage: data => received.push(data),
        }),
      { wrapper: createWrapper(queryClient) },
    );
    act(() => MockWebSocket.last().simulateOpen());

    // 한 틱에 시세 두 개 — React는 두 setState를 한 렌더로 합친다
    act(() => {
      MockWebSocket.last().simulateMessage('{"symbol":"AAPL"}');
      MockWebSocket.last().simulateMessage('{"symbol":"MSFT"}');
    });

    expect(received).toEqual(['{"symbol":"AAPL"}', '{"symbol":"MSFT"}']);
  });

  test('같은 내용이 연속으로 와도 각각 처리한다', () => {
    const received: string[] = [];
    renderHook(
      () =>
        useWebSocketQuery({
          url: 'ws://test',
          onMessage: data => received.push(data),
        }),
      { wrapper: createWrapper(queryClient) },
    );
    act(() => MockWebSocket.last().simulateOpen());

    act(() => MockWebSocket.last().simulateMessage('tick'));
    act(() => MockWebSocket.last().simulateMessage('tick'));

    expect(received).toEqual(['tick', 'tick']);
  });

  test('내가 보낸 메시지는 수신 처리하지 않는다', () => {
    const received: string[] = [];
    const { result } = renderHook(
      () =>
        useWebSocketQuery({
          url: 'ws://test',
          onMessage: data => received.push(data),
        }),
      { wrapper: createWrapper(queryClient) },
    );
    act(() => MockWebSocket.last().simulateOpen());

    act(() => result.current.sendMessage('hello'));

    expect(received).toEqual([]);
  });

  test('메시지마다 지정한 쿼리를 무효화한다', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(
      () =>
        useWebSocketQuery({
          url: 'ws://test',
          invalidateQueries: [['stocks']],
        }),
      { wrapper: createWrapper(queryClient) },
    );
    act(() => MockWebSocket.last().simulateOpen());

    act(() => {
      MockWebSocket.last().simulateMessage('a');
      MockWebSocket.last().simulateMessage('b');
    });

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['stocks'] });
  });
});
