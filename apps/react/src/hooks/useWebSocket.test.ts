import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code = 1000) {
    this.simulateClose(code);
  }

  // 테스트 헬퍼 — 서버 쪽 이벤트를 흉내낸다
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateClose(code: number) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code } as CloseEvent);
  }
}

const lastSocket = () =>
  MockWebSocket.instances[MockWebSocket.instances.length - 1];

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('마운트 시 소켓을 하나 연다', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://test' }));

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(lastSocket().url).toBe('ws://test');
    expect(result.current.isConnected).toBe(false);

    act(() => lastSocket().simulateOpen());
    expect(result.current.isConnected).toBe(true);
  });

  test('자동 재연결 시 소켓이 정확히 하나만 새로 열린다 (이중 오픈 회귀 방지)', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://test' }));
    act(() => lastSocket().simulateOpen());

    // 비정상 종료 → 백오프(1000ms) 후 재연결 예약
    act(() => lastSocket().simulateClose(1006));
    expect(result.current.isReconnecting).toBe(true);
    expect(MockWebSocket.instances).toHaveLength(1);

    // 타이머 경과 + 그로 인한 리렌더까지 지나도 새 소켓은 딱 하나여야 한다.
    // (과거 구조: reconnectAttempt가 connect deps에 있어 마운트 effect가
    // 재실행되며 소켓이 2개 열렸다)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current.reconnectAttempt).toBe(1);
  });

  test('재연결 백오프가 시도 횟수에 따라 늘어난다', () => {
    renderHook(() =>
      useWebSocket({
        url: 'ws://test',
        reconnectInterval: 1000,
        reconnectBackoffMultiplier: 1.5,
      }),
    );

    act(() => lastSocket().simulateClose(1006));
    act(() => {
      vi.advanceTimersByTime(1000); // attempt 0 → 1000ms
    });
    expect(MockWebSocket.instances).toHaveLength(2);

    act(() => lastSocket().simulateClose(1006));
    act(() => {
      vi.advanceTimersByTime(1499); // attempt 1 → 1500ms — 아직
    });
    expect(MockWebSocket.instances).toHaveLength(2);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  test('최대 재연결 횟수를 넘으면 더 이상 시도하지 않는다', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://test',
        maxReconnectAttempts: 2,
        reconnectInterval: 1000,
        reconnectBackoffMultiplier: 1,
      }),
    );

    for (let i = 0; i < 2; i += 1) {
      act(() => lastSocket().simulateClose(1006));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(MockWebSocket.instances).toHaveLength(3);

    // 3번째 실패 — attempt(2) >= max(2)라 예약 없음
    act(() => lastSocket().simulateClose(1006));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(MockWebSocket.instances).toHaveLength(3);
    expect(result.current.isReconnecting).toBe(false);
    expect(
      result.current.messages.some(m => m.includes('최대 재연결 시도 횟수')),
    ).toBe(true);
  });

  test('정상 종료(1000)는 재연결하지 않는다', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://test' }));
    act(() => lastSocket().simulateOpen());

    act(() => lastSocket().simulateClose(1000));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result.current.isReconnecting).toBe(false);
  });

  test('수동 reconnect는 시도 횟수를 리셋하고 새로 연결한다', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://test' }));
    act(() => lastSocket().simulateOpen());

    act(() => result.current.reconnect());
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current.reconnectAttempt).toBe(0);
  });

  test('재연결 대기 중 url이 바뀌면 새 url로 연결한다', () => {
    const { rerender } = renderHook(({ url }) => useWebSocket({ url }), {
      initialProps: { url: 'ws://a' },
    });
    act(() => lastSocket().simulateClose(1006)); // 재연결 예약된 상태

    rerender({ url: 'ws://b' });
    expect(lastSocket().url).toBe('ws://b');

    // 이전 예약이 살아남아 ws://a로 추가 연결하지 않는다
    const count = MockWebSocket.instances.length;
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(
      MockWebSocket.instances.slice(count).every(s => s.url === 'ws://b'),
    ).toBe(true);
  });

  test('sendMessage는 연결된 소켓으로 보낸다', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'ws://test' }));
    act(() => lastSocket().simulateOpen());

    act(() => result.current.sendMessage('hello'));
    expect(lastSocket().sent).toEqual(['hello']);
    const lastMessage =
      result.current.messages[result.current.messages.length - 1];
    expect(lastMessage).toBe('전송: hello');
  });
});
