/**
 * 테스트용 WebSocket 대역. `vi.stubGlobal('WebSocket', MockWebSocket)`으로 끼운다.
 * 서버 쪽 이벤트(open·message·close)는 simulate* 헬퍼로 흉내 낸다.
 */
export class MockWebSocket {
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
  closeCalls: number[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  static last(): MockWebSocket {
    const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    if (!socket) throw new Error('열린 MockWebSocket이 없다');
    return socket;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code = 1000) {
    this.closeCalls.push(code);
    // 브라우저는 연결 전에 닫힌 소켓에 1006(비정상 종료)을 준다
    this.simulateClose(
      this.readyState === MockWebSocket.CONNECTING ? 1006 : code,
    );
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  simulateClose(code: number) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code } as CloseEvent);
  }
}
