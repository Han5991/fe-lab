import { isUtf8 } from 'node:buffer';
import crypto from 'node:crypto';
import type { Server as HTTPServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

/**
 * WebSocket 서버 옵션
 */
interface WebSocketServerOptions {
  /**
   * 허용할 Origin. 목록이면 정확히 일치하는 것만, 함수면 true를 돌려준 것만 허용한다.
   * null이면 모든 origin 허용. Origin 헤더가 없는 요청(브라우저가 아닌 클라이언트)은 늘 통과한다
   */
  allowedOrigins?: string[] | ((origin: string) => boolean) | null;
  /** 세션 타임아웃 시간 (밀리초). 이 시간 동안 아무것도 받지 못한 연결을 닫는다. 기본값: 5분 */
  sessionTimeout?: number;
  /**
   * 서버가 Ping을 보내는 주기 (밀리초). 기본값: 30초
   *
   * 듣기만 하는 클라이언트(시세 화면)는 보낼 게 없다. 브라우저는 Ping에 Pong을 자동으로
   * 답하므로, 그 Pong이 "살아 있음"을 알려 sessionTimeout에 걸리지 않게 한다.
   * Pong도 오지 않는 연결은 죽은 것으로 보고 닫는다.
   */
  heartbeatInterval?: number;
  /** 비활성 세션을 검사하는 주기 (밀리초). 기본값: 1분 */
  cleanupInterval?: number;
  /** 주식 시세를 브로드캐스트하는 주기 (밀리초). 기본값: 1초 */
  stockBroadcastInterval?: number;
}

/**
 * 클라이언트가 받을 메시지 묶음. 접속 URL의 `?topics=stocks,chat`으로 고르고,
 * 지정하지 않으면 채팅만 받는다 — 채팅 화면이 초마다 오는 시세에 묻히지 않게 한다.
 */
type Topic = 'chat' | 'stocks';

const TOPICS: readonly Topic[] = ['chat', 'stocks'];
const DEFAULT_TOPICS: readonly Topic[] = ['chat'];

function parseTopics(value: string | null): Set<Topic> {
  if (value === null) return new Set(DEFAULT_TOPICS);
  return new Set(
    value
      .split(',')
      .map(topic => topic.trim())
      .filter((topic): topic is Topic => TOPICS.includes(topic as Topic)),
  );
}

/**
 * 로컬 개발 출처인가. 포트는 보지 않는다 — Vite는 5173이 차 있으면 5174로 옮겨 뜨는데,
 * 포트를 박아 두면 그때 핸드셰이크가 403으로 막힌다.
 */
export function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * 세션 정보
 */
interface SessionInfo {
  /** 세션 고유 ID */
  id: string;
  /** 연결 생성 시간 */
  connectedAt: Date;
  /** 마지막 활동 시간 */
  lastActiveAt: Date;
  /** 세션 메타데이터 */
  metadata: Record<string, unknown>;
}

/**
 * 클라이언트 이벤트별 페이로드 맵
 *
 * - `message`: 텍스트 프레임 (UTF-8 디코딩된 string)
 * - `binary`: 바이너리 프레임 (Buffer)
 * - `close`: 연결 종료 (페이로드 없음)
 */
interface ClientEventPayloadMap {
  message: string;
  binary: Buffer;
  close: void;
}

type ClientEvent = keyof ClientEventPayloadMap;

type ClientEventListener<E extends ClientEvent> =
  ClientEventPayloadMap[E] extends void
    ? () => void
    : (data: ClientEventPayloadMap[E]) => void;

/**
 * WebSocket Opcode
 *
 * enum 대신 const 객체다 — node의 type stripping(`dev`의 `node --watch src/index.ts`)은
 * 지울 수 있는 타입 문법만 받는다(tsconfig `erasableSyntaxOnly`).
 */
const WebSocketOpcode = {
  Continuation: 0x0,
  Text: 0x1,
  Binary: 0x2,
  Close: 0x8,
  Ping: 0x9,
  Pong: 0xa,
} as const;

/** 한 메시지 페이로드의 상한. 넘으면 1009로 닫는다 — 수신 버퍼가 무한히 자라지 않게 한다 */
const DEFAULT_MAX_PAYLOAD = 1024 * 1024;

/** 한 메시지의 조각(프레임) 수 상한. 넘으면 1009 — 빈 조각은 길이 상한에 걸리지 않는다 */
export const MAX_FRAGMENTS = 1024;

/** 제어 프레임(Close·Ping·Pong) 페이로드 상한 (RFC 6455 §5.5) */
const MAX_CONTROL_PAYLOAD = 125;

/** Close를 보낸 뒤 상대의 Close를 기다리는 시간. 넘으면 TCP를 강제로 끊는다 */
const CLOSE_TIMEOUT = 3000;

/**
 * RFC 6455 §7.4 상태 코드 중 이 서버가 쓰는 것
 */
const CloseCode = {
  Normal: 1000,
  GoingAway: 1001,
  ProtocolError: 1002,
  InvalidPayload: 1007,
  MessageTooBig: 1009,
  InternalError: 1011,
} as const;

/** Close 프레임에 실어 보낼 수 있는 상태 코드인가 (RFC 6455 §7.4.1·§7.4.2) */
function isValidCloseCode(code: number): boolean {
  return (
    (code >= 1000 && code <= 1003) ||
    (code >= 1007 && code <= 1011) ||
    (code >= 3000 && code <= 4999)
  );
}

/**
 * 연결 상태. CONNECTING(핸드셰이크 전)은 WebSocketConnection이 만들어지기 전 단계다.
 * - OPEN: 메시지를 주고받는다
 * - CLOSING: 이쪽이 Close를 보냈고 상대의 Close를 기다린다 — 더 보내지 않는다
 * - CLOSED: Close를 주고받았거나 TCP가 끊겼다
 */
type ReadyState = 'OPEN' | 'CLOSING' | 'CLOSED';

/**
 * 수신 버퍼에서 완성된 프레임 하나를 떼어 낸 결과
 */
interface ParsedFrame {
  isFinalFrame: boolean;
  opcode: number;
  payload: Buffer;
}

/**
 * 연결을 끊어야 하는 프로토콜 위반. `closeCode`는 RFC 6455 §7.4.1의 상태 코드다
 */
class WebSocketProtocolError extends Error {
  readonly closeCode: number;

  constructor(closeCode: number, message: string) {
    super(message);
    this.name = 'WebSocketProtocolError';
    this.closeCode = closeCode;
  }
}

/**
 * 주식 데이터
 */
interface StockData {
  symbol: string;
  name: string;
  price: number;
  basePrice: number; // 기준가 (변동 계산용)
}

/**
 * WebSocket Server - HTTP 서버 위에서 동작하는 WebSocket 구현
 * RFC 6455 스펙 기반
 */
export class WebSocketServer {
  private httpServer: HTTPServer;
  private readonly clients: Set<WebSocketConnection>;
  private readonly sessions: Map<string, WebSocketConnection>;
  private readonly allowedOrigins:
    string[] | ((origin: string) => boolean) | null;
  private readonly sessionTimeout: number;
  private readonly heartbeatInterval: number;
  private readonly cleanupInterval: number;
  private readonly stockBroadcastInterval: number;
  private cleanupIntervalId: NodeJS.Timeout | null;
  private heartbeatIntervalId: NodeJS.Timeout | null;
  private stockBroadcastIntervalId: NodeJS.Timeout | null;
  private stockData: Map<string, StockData>;

  constructor(httpServer: HTTPServer, options: WebSocketServerOptions = {}) {
    this.httpServer = httpServer;
    this.clients = new Set();
    this.sessions = new Map();
    this.allowedOrigins = options.allowedOrigins || null; // null이면 모든 origin 허용
    this.sessionTimeout = options.sessionTimeout || 5 * 60 * 1000; // 기본 5분
    this.heartbeatInterval = options.heartbeatInterval || 30 * 1000; // 기본 30초
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 기본 1분
    this.stockBroadcastInterval = options.stockBroadcastInterval || 1000; // 기본 1초
    this.cleanupIntervalId = null;
    this.heartbeatIntervalId = null;
    this.stockBroadcastIntervalId = null;

    // 주식 데이터 초기화
    this.stockData = new Map([
      [
        'AAPL',
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 178.25,
          basePrice: 178.25,
        },
      ],
      [
        'GOOGL',
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          price: 141.8,
          basePrice: 141.8,
        },
      ],
      [
        'MSFT',
        {
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          price: 378.91,
          basePrice: 378.91,
        },
      ],
      [
        'TSLA',
        {
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          price: 242.84,
          basePrice: 242.84,
        },
      ],
      [
        'AMZN',
        {
          symbol: 'AMZN',
          name: 'Amazon.com Inc.',
          price: 178.35,
          basePrice: 178.35,
        },
      ],
    ]);

    // HTTP 서버의 upgrade 이벤트를 리스닝
    this.httpServer.on('upgrade', this.handleUpgrade.bind(this));

    // 세션 정리 타이머 시작 (기본 1분마다 체크)
    this.startCleanupTimer();

    // 하트비트 시작 (기본 30초마다 Ping)
    this.startHeartbeat();

    // 주식 데이터 브로드캐스트 시작 (1초마다)
    this.startStockBroadcast();
  }

  /**
   * WebSocket 핸드셰이크 처리
   */
  private handleUpgrade(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void {
    // Origin 검증
    const origin = req.headers.origin;
    if (this.allowedOrigins && !this.isOriginAllowed(origin)) {
      console.log(`Rejected connection from origin: ${origin}`);
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }

    // 구독할 topic 추출 (쿼리 파라미터: ?topics=stocks)
    // Host 헤더는 클라이언트 입력이다 — `Host: [` 같은 값에 URL 생성자가 던지면
    // upgrade 리스너 밖으로 새어 프로세스가 죽는다
    let url: URL;
    try {
      url = new URL(
        req.url || '/',
        `http://${req.headers.host ?? 'localhost'}`,
      );
    } catch {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    const topics = parseTopics(url.searchParams.get('topics'));

    // 핸드셰이크 검증 (RFC 6455 §4.2.1): Upgrade: websocket, 버전 13,
    // 키는 16바이트를 Base64로 인코딩한 값
    if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    if (req.headers['sec-websocket-version'] !== '13') {
      socket.end(
        'HTTP/1.1 426 Upgrade Required\r\nSec-WebSocket-Version: 13\r\n\r\n',
      );
      return;
    }

    // WebSocket 핸드셰이크 키 추출
    const key = req.headers['sec-websocket-key'];

    if (!key || Buffer.from(key, 'base64').length !== 16) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }

    // RFC 6455에 정의된 매직 스트링
    const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

    // Accept 키 생성: SHA-1(key + MAGIC_STRING)을 Base64 인코딩
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + MAGIC_STRING)
      .digest('base64');

    // HTTP 101 Switching Protocols 응답
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      '',
    ].join('\r\n');

    socket.write(responseHeaders);

    // WebSocket 연결 생성
    const client = new WebSocketConnection(socket, { topics });
    const sessionId = client.getSessionId();

    this.clients.add(client);
    this.sessions.set(sessionId, client);

    console.log(
      `New client connected. Session ID: ${sessionId}, Total clients: ${this.clients.size}`,
    );

    // 클라이언트 이벤트 리스너
    client.on('message', (data: string) => {
      console.log(`[${sessionId}] Received text:`, data);
      // 채팅을 구독한 클라이언트에게 브로드캐스트
      this.broadcast(data, 'chat');
    });

    client.on('binary', (data: Buffer) => {
      console.log(`[${sessionId}] Received binary data:`, data.length, 'bytes');
      // 바이너리 데이터 처리 (필요시 구현)
    });

    client.on('close', () => {
      this.clients.delete(client);
      this.sessions.delete(sessionId);
      console.log(
        `Client disconnected. Session ID: ${sessionId}, Total clients: ${this.clients.size}`,
      );
    });

    // 핸드셰이크와 같은 패킷에 실려 온 프레임 처리 — 리스너를 단 **뒤에** 넣어야
    // 그 프레임의 message 이벤트가 허공에 emit되지 않는다
    if (head.length > 0) {
      client.receive(head);
    }
  }

  /**
   * Origin이 허용된 출처인지 확인
   */
  private isOriginAllowed(origin?: string): boolean {
    if (!this.allowedOrigins || !origin) return true;
    if (typeof this.allowedOrigins === 'function') {
      return this.allowedOrigins(origin);
    }
    return this.allowedOrigins.includes(origin);
  }

  /**
   * 연결된 클라이언트에게 메시지 브로드캐스트. topic을 주면 그 topic을 구독한 클라이언트에게만
   */
  broadcast(message: string, topic?: Topic): void {
    for (const client of this.clients) {
      if (topic === undefined || client.isSubscribed(topic)) {
        client.send(message);
      }
    }
  }

  /**
   * 특정 세션 ID로 클라이언트 조회
   */
  getSession(sessionId: string): WebSocketConnection | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 모든 활성 세션 정보 조회
   */
  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map(client =>
      client.getSessionInfo(),
    );
  }

  /**
   * 세션 수 조회
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 세션 ID로 특정 클라이언트에게 메시지 전송
   */
  sendToSession(sessionId: string, message: string): boolean {
    const client = this.sessions.get(sessionId);
    if (client) {
      client.send(message);
      return true;
    }
    return false;
  }

  /**
   * 세션 ID로 연결 종료
   */
  closeSession(sessionId: string): boolean {
    const client = this.sessions.get(sessionId);
    if (client) {
      client.close();
      return true;
    }
    return false;
  }

  /**
   * 세션 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    // 주기마다 비활성 세션 체크
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.cleanupInterval);
  }

  /**
   * 하트비트 시작: 모든 클라이언트에 주기적으로 Ping을 보낸다.
   * 돌아오는 Pong은 수신 데이터라 lastActiveAt을 갱신한다.
   */
  private startHeartbeat(): void {
    this.heartbeatIntervalId = setInterval(() => {
      for (const client of this.clients) {
        client.ping();
      }
    }, this.heartbeatInterval);
  }

  /**
   * 하트비트 중지
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * 세션 정리 타이머 중지
   */
  stopCleanupTimer(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * 비활성 세션 정리
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const inactiveSessions: string[] = [];

    for (const [sessionId, client] of this.sessions.entries()) {
      const sessionInfo = client.getSessionInfo();
      const inactiveTime = now - sessionInfo.lastActiveAt.getTime();

      if (inactiveTime > this.sessionTimeout) {
        inactiveSessions.push(sessionId);
      }
    }

    // 비활성 세션 종료 — Ping에도 답하지 않은 연결이라 Close 응답을 기다리지 않는다
    for (const sessionId of inactiveSessions) {
      console.log(
        `Closing inactive session: ${sessionId} (inactive for ${Math.round(this.sessionTimeout / 1000)}s)`,
      );
      this.sessions.get(sessionId)?.terminate(CloseCode.GoingAway);
    }

    if (inactiveSessions.length > 0) {
      console.log(
        `Cleaned up ${inactiveSessions.length} inactive session(s). Active sessions: ${this.sessions.size}`,
      );
    }
  }

  /**
   * 주식 데이터 브로드캐스트 시작
   */
  private startStockBroadcast(): void {
    // 1초마다 랜덤하게 주식 가격 업데이트
    this.stockBroadcastIntervalId = setInterval(() => {
      this.updateStockPrices();
    }, this.stockBroadcastInterval);

    console.log('Stock price broadcast started (1s interval)');
  }

  /**
   * 주식 데이터 브로드캐스트 중지
   */
  private stopStockBroadcast(): void {
    if (this.stockBroadcastIntervalId) {
      clearInterval(this.stockBroadcastIntervalId);
      this.stockBroadcastIntervalId = null;
    }
  }

  /**
   * 주식 가격 업데이트 및 브로드캐스트
   */
  private updateStockPrices(): void {
    // 시세를 구독한 클라이언트가 없으면 브로드캐스트 안함
    const hasSubscribers = Array.from(this.clients).some(client =>
      client.isSubscribed('stocks'),
    );
    if (!hasSubscribers) return;

    // 랜덤하게 1-2개 종목 선택
    const symbols = Array.from(this.stockData.keys());
    const numUpdates = Math.floor(Math.random() * 2) + 1;
    const selectedSymbols = this.shuffleArray(symbols).slice(0, numUpdates);

    for (const symbol of selectedSymbols) {
      const stock = this.stockData.get(symbol);
      if (!stock) continue;

      // 가격을 -2% ~ +2% 범위에서 랜덤하게 변동
      const changePercent = (Math.random() - 0.5) * 4; // -2 ~ +2
      const newPrice = stock.price * (1 + changePercent / 100);
      const change = newPrice - stock.basePrice;
      const changePercentFromBase = (change / stock.basePrice) * 100;

      // 가격 업데이트
      stock.price = newPrice;

      // 거래량 생성 (랜덤)
      const volume = Math.floor(Math.random() * 100000000) + 10000000;

      // WebSocket 메시지 생성
      const message = JSON.stringify({
        type: 'PRICE_UPDATE',
        data: {
          symbol: stock.symbol,
          price: parseFloat(newPrice.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercentFromBase.toFixed(2)),
          volume,
          timestamp: Date.now(),
        },
      });

      // 시세를 구독한 클라이언트에게 브로드캐스트
      this.broadcast(message, 'stocks');
    }
  }

  /**
   * 배열 섞기 (Fisher-Yates shuffle)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 서버 종료 시 정리 작업
   */
  shutdown(): void {
    console.log('Shutting down WebSocket server...');

    // 타이머 중지
    this.stopCleanupTimer();
    this.stopHeartbeat();
    this.stopStockBroadcast();

    // 모든 연결 종료 (1001: 서버가 내려간다)
    for (const client of this.clients) {
      client.close(CloseCode.GoingAway, 'Server shutting down');
    }

    this.clients.clear();
    this.sessions.clear();

    console.log('WebSocket server shut down complete.');
  }
}

/**
 * 개별 WebSocket 연결을 관리하는 클래스
 */
class WebSocketConnection {
  private socket: Duplex;
  private readonly listeners: { [E in ClientEvent]?: ClientEventListener<E>[] };
  private fragmentedMessage: Buffer[];
  private fragmentedLength: number;
  private fragmentedOpcode: number | null;
  private readonly sessionInfo: SessionInfo;
  /**
   * 아직 프레임으로 떼어 내지 못한 수신 바이트.
   * TCP는 스트림이라 'data' 청크 경계가 프레임 경계와 맞지 않는다 — 한 청크에 프레임이
   * 여럿 오기도, 한 프레임(헤더까지)이 여러 청크로 쪼개져 오기도 한다.
   */
  private receiveBuffer: Buffer;
  private readonly maxPayload: number;
  private readyState: ReadyState;
  /** Close를 보낸 뒤 상대가 답하지 않으면 TCP를 끊는 타이머 */
  private closeTimer: NodeJS.Timeout | null;
  private readonly topics: ReadonlySet<Topic>;

  constructor(
    socket: Duplex,
    {
      maxPayload = DEFAULT_MAX_PAYLOAD,
      topics = new Set(DEFAULT_TOPICS),
    }: {
      maxPayload?: number;
      topics?: ReadonlySet<Topic>;
    } = {},
  ) {
    this.socket = socket;
    this.topics = topics;
    this.listeners = {};
    this.fragmentedMessage = [];
    this.fragmentedLength = 0;
    this.fragmentedOpcode = null;
    this.receiveBuffer = Buffer.alloc(0);
    this.maxPayload = maxPayload;
    this.readyState = 'OPEN';
    this.closeTimer = null;

    // 세션 정보 초기화
    const now = new Date();
    this.sessionInfo = {
      id: this.generateSessionId(),
      connectedAt: now,
      lastActiveAt: now,
      metadata: {},
    };

    this.socket.on('data', (chunk: Buffer) => {
      this.receive(chunk);
    });

    this.socket.on('close', () => {
      this.readyState = 'CLOSED';
      if (this.closeTimer) {
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
      }
      this.emit('close');
    });

    // 상대가 Close 프레임 없이 TCP를 닫았다(FIN). HTTP 서버 소켓은 allowHalfOpen이라
    // 이쪽도 end()해야 연결이 완전히 닫힌다
    this.socket.on('end', () => {
      this.readyState = 'CLOSED';
      this.socket.end();
    });

    this.socket.on('error', (err: Error) => {
      console.error('Socket error:', err);
    });
  }

  /**
   * 수신 청크를 버퍼에 붙이고, 완성된 프레임을 **전부** 처리한다.
   * 덜 온 프레임(헤더 일부만 온 경우 포함)은 다음 청크까지 버퍼에 남긴다.
   */
  receive(chunk: Buffer): void {
    if (this.readyState === 'CLOSED') return;

    // 마지막 활동 시간 업데이트
    this.updateLastActive();

    this.receiveBuffer =
      this.receiveBuffer.length === 0
        ? chunk
        : Buffer.concat([this.receiveBuffer, chunk]);

    try {
      let frame = this.readFrame();
      while (frame !== null) {
        this.handleFrame(frame);
        // handleFrame이 Close를 처리했으면 남은 바이트는 해석하지 않는다
        if (this.isClosed()) return;
        frame = this.readFrame();
      }
    } catch (error) {
      // 'data' 리스너에서 던지면 잡을 곳이 없어 프로세스가 죽는다 — 이 연결만 끊는다
      const closeCode =
        error instanceof WebSocketProtocolError
          ? error.closeCode
          : CloseCode.InternalError;
      console.error('Closing connection:', error);
      this.fail(closeCode);
    }
  }

  /**
   * 수신 버퍼 앞에서 완성된 프레임 하나를 떼어 낸다. 아직 덜 왔으면 null
   *
   * WebSocket Frame 구조:
   * 0                   1                   2                   3
   * 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   * +-+-+-+-+-------+-+-------------+-------------------------------+
   * |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
   * |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
   * |N|V|V|V|       |S|             |   (if payload len==126/127)   |
   * | |1|2|3|       |K|             |                               |
   * +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
   * |     Extended payload length continued, if payload len == 127  |
   * + - - - - - - - - - - - - - - - +-------------------------------+
   * |                               |Masking-key, if MASK set to 1  |
   * +-------------------------------+-------------------------------+
   * | Masking-key (continued)       |          Payload Data         |
   * +-------------------------------- - - - - - - - - - - - - - - - +
   * :                     Payload Data continued ...                :
   * + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
   * |                     Payload Data continued ...                |
   * +---------------------------------------------------------------+
   */
  private readFrame(): ParsedFrame | null {
    const buffer = this.receiveBuffer;
    // 최소 헤더(2바이트)도 안 왔다
    if (buffer.length < 2) return null;

    // 첫 번째 바이트: FIN, RSV, Opcode
    const firstByte = buffer[0];
    const isFinalFrame = Boolean(firstByte & 0x80); // FIN bit
    const opcode = firstByte & 0x0f;

    // 확장을 협상하지 않았으니 RSV1~3은 0이어야 한다 (§5.2)
    if (firstByte & 0x70) {
      throw new WebSocketProtocolError(
        CloseCode.ProtocolError,
        'RSV bits must be 0',
      );
    }

    // 두 번째 바이트: MASK, Payload Length
    const secondByte = buffer[1];
    const isMasked = Boolean(secondByte & 0x80);
    let payloadLength = secondByte & 0x7f;

    // 클라이언트→서버 프레임은 반드시 마스킹된다 — 아니면 서버는 연결을 닫아야 한다 (§5.1)
    if (!isMasked) {
      throw new WebSocketProtocolError(
        CloseCode.ProtocolError,
        'Client frames must be masked',
      );
    }

    // 제어 프레임은 쪼갤 수 없고 페이로드는 125바이트 이하다 (§5.5)
    if (
      opcode >= WebSocketOpcode.Close &&
      (!isFinalFrame || payloadLength > MAX_CONTROL_PAYLOAD)
    ) {
      throw new WebSocketProtocolError(
        CloseCode.ProtocolError,
        'Control frames must be final and at most 125 bytes',
      );
    }

    let offset = 2;

    // Extended payload length — 확장 길이 필드가 다 오기 전에는 읽지 않는다
    if (payloadLength === 126) {
      if (buffer.length < offset + 2) return null;
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      if (buffer.length < offset + 8) return null;
      // 64-bit length (Node.js에서는 Number로 처리)
      const high = buffer.readUInt32BE(offset);
      const low = buffer.readUInt32BE(offset + 4);
      payloadLength = high * 0x100000000 + low;
      offset += 8;
    }

    if (payloadLength > this.maxPayload) {
      throw new WebSocketProtocolError(
        CloseCode.MessageTooBig,
        `Frame payload too large: ${payloadLength} bytes`,
      );
    }

    // Masking key(4바이트) 다음이 페이로드
    const frameLength = offset + 4 + payloadLength;
    // 페이로드가 다 오지 않았다 — 다음 청크를 기다린다
    if (buffer.length < frameLength) return null;

    const maskingKey = buffer.subarray(offset, offset + 4);
    offset += 4;

    // Payload data
    const payloadData = buffer.subarray(offset, frameLength);

    // 이 프레임 뒤의 바이트는 다음 프레임의 시작이다
    this.receiveBuffer = buffer.subarray(frameLength);

    // 마스킹 해제 (unmask는 새 버퍼를 만든다 — 수신 버퍼를 계속 붙잡지 않는다)
    const payload = this.unmask(payloadData, maskingKey);

    return { isFinalFrame, opcode, payload };
  }

  /**
   * 완성된 프레임 하나를 opcode에 따라 처리한다
   */
  private handleFrame({ isFinalFrame, opcode, payload }: ParsedFrame): void {
    // Close를 보낸 뒤(CLOSING)에는 상대의 Close만 기다린다
    if (this.readyState === 'CLOSING' && opcode !== WebSocketOpcode.Close) {
      return;
    }

    // Opcode 및 단편화 처리
    if (opcode === WebSocketOpcode.Text || opcode === WebSocketOpcode.Binary) {
      // 단편화된 메시지가 끝나기 전에 새 메시지를 시작할 수 없다 (§5.4)
      if (this.fragmentedOpcode !== null) {
        throw new WebSocketProtocolError(
          CloseCode.ProtocolError,
          'New data frame before the fragmented message finished',
        );
      }
      if (isFinalFrame) {
        // 단일 프레임 메시지
        this.handleCompleteMessage(opcode, payload);
      } else {
        // 단편화된 메시지의 시작
        this.fragmentedOpcode = opcode;
        this.fragmentedMessage = [payload];
        this.fragmentedLength = payload.length;
      }
    } else if (opcode === WebSocketOpcode.Continuation) {
      if (this.fragmentedOpcode === null) {
        throw new WebSocketProtocolError(
          CloseCode.ProtocolError,
          'Continuation frame without initial frame',
        );
      }

      this.fragmentedMessage.push(payload);
      this.fragmentedLength += payload.length;

      // 조각마다는 상한 안이어도 합치면 넘을 수 있다 — 조립 중에도 상한을 지킨다
      if (this.fragmentedLength > this.maxPayload) {
        throw new WebSocketProtocolError(
          CloseCode.MessageTooBig,
          `Message too large: ${this.fragmentedLength} bytes`,
        );
      }
      if (this.fragmentedMessage.length > MAX_FRAGMENTS) {
        throw new WebSocketProtocolError(
          CloseCode.MessageTooBig,
          `Too many fragments: ${this.fragmentedMessage.length}`,
        );
      }

      if (isFinalFrame) {
        // 모든 프레임 조립
        const completeMessage = Buffer.concat(
          this.fragmentedMessage,
          this.fragmentedLength,
        );
        const messageOpcode = this.fragmentedOpcode;

        // 상태 초기화
        this.fragmentedMessage = [];
        this.fragmentedLength = 0;
        this.fragmentedOpcode = null;

        this.handleCompleteMessage(messageOpcode, completeMessage);
      }
    } else if (opcode === WebSocketOpcode.Close) {
      this.handleCloseFrame(payload);
    } else if (opcode === WebSocketOpcode.Ping) {
      this.sendPong(payload);
    } else if (opcode === WebSocketOpcode.Pong) {
      // Pong 수신 — 하트비트 응답. 활동 시각은 receive()에서 이미 갱신했다
    } else {
      throw new WebSocketProtocolError(
        CloseCode.ProtocolError,
        `Unsupported opcode: ${opcode}`,
      );
    }
  }

  /**
   * 상대가 보낸 Close 프레임 처리 (§5.5.1, §7.1)
   * - OPEN: 상대가 먼저 닫는다 → 같은 상태 코드로 Close를 돌려주고 TCP를 닫는다
   * - CLOSING: 이쪽 Close에 대한 응답이다 → 다시 보내지 않고 TCP만 닫는다
   */
  private handleCloseFrame(payload: Buffer): void {
    if (payload.length === 1) {
      throw new WebSocketProtocolError(
        CloseCode.ProtocolError,
        'Close frame payload must be empty or at least 2 bytes',
      );
    }
    const code = payload.length >= 2 ? payload.readUInt16BE(0) : null;
    if (code !== null && !isValidCloseCode(code)) {
      throw new WebSocketProtocolError(
        CloseCode.ProtocolError,
        `Invalid close code: ${code}`,
      );
    }
    if (payload.length > 2 && !isUtf8(payload.subarray(2))) {
      throw new WebSocketProtocolError(
        CloseCode.InvalidPayload,
        'Close reason is not valid UTF-8',
      );
    }

    if (this.readyState === 'OPEN') {
      this.writeFrame(
        WebSocketOpcode.Close,
        code === null ? Buffer.alloc(0) : this.closePayload(code, ''),
      );
    }
    this.finishClose();
  }

  /**
   * Close 교환이 끝났다: 서버가 먼저 TCP를 닫는다 (§7.1.1)
   */
  private finishClose(): void {
    this.readyState = 'CLOSED';
    this.receiveBuffer = Buffer.alloc(0);
    this.socket.end();
    // 상대가 FIN으로 답하지 않으면 소켓을 끝까지 붙잡지 않는다
    this.startCloseTimer();
  }

  /**
   * CLOSE_TIMEOUT 뒤에도 소켓이 닫히지 않았으면 강제로 끊는다. 소켓 'close'에서 해제된다
   */
  private startCloseTimer(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      this.socket.destroy();
    }, CLOSE_TIMEOUT);
  }

  /**
   * 응답 없는 연결을 끝낸다: Close를 보내되 상대의 Close를 기다리지 않고 바로 TCP를 닫는다
   */
  terminate(code: number = CloseCode.GoingAway): void {
    if (this.readyState === 'CLOSED') return;
    this.writeFrame(WebSocketOpcode.Close, this.closePayload(code, ''));
    this.finishClose();
  }

  /**
   * 프로토콜 위반: 상태 코드를 실은 Close 프레임을 보내고 연결을 끊는다 (§7.1.7)
   */
  private fail(closeCode: number): void {
    if (this.readyState === 'OPEN') {
      this.writeFrame(WebSocketOpcode.Close, this.closePayload(closeCode, ''));
    }
    this.finishClose();
  }

  private closePayload(code: number, reason: string): Buffer {
    const reasonBytes = Buffer.from(reason, 'utf-8');
    const payload = Buffer.alloc(2 + reasonBytes.length);
    payload.writeUInt16BE(code, 0);
    reasonBytes.copy(payload, 2);
    return payload;
  }

  /**
   * XOR 연산으로 마스킹 해제
   */
  private unmask(payload: Buffer, maskingKey: Buffer): Buffer {
    const unmasked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      unmasked[i] = payload[i] ^ maskingKey[i % 4];
    }
    return unmasked;
  }

  /**
   * 완전한 메시지 처리 (Text 또는 Binary)
   */
  private handleCompleteMessage(opcode: number, data: Buffer): void {
    if (opcode === WebSocketOpcode.Text) {
      // 텍스트 메시지는 UTF-8이어야 한다 (§5.6, §8.1) — 조각을 다 합친 뒤에 검사한다
      if (!isUtf8(data)) {
        throw new WebSocketProtocolError(
          CloseCode.InvalidPayload,
          'Text message is not valid UTF-8',
        );
      }
      const message = data.toString('utf-8');
      this.emit('message', message);
    } else if (opcode === WebSocketOpcode.Binary) {
      this.emit('binary', data);
    }
  }

  /**
   * 메시지 전송 (서버->클라이언트는 마스킹 안함). OPEN이 아니면 보내지 않는다
   */
  send(message: string): void {
    this.writeFrame(WebSocketOpcode.Text, Buffer.from(message));
  }

  /**
   * 프레임 하나를 만들어 쓴다. Close를 보낸 뒤(CLOSING)나 끊긴 뒤에는 쓰지 않는다 —
   * 이미 end()한 소켓에 쓰면 ERR_STREAM_WRITE_AFTER_END가 난다.
   */
  private writeFrame(opcode: number, payload: Buffer): void {
    if (this.readyState !== 'OPEN' || !this.socket.writable) return;
    this.socket.write(this.createFrame(opcode, payload));
  }

  /**
   * WebSocket Frame 생성 (FIN=1, 서버 프레임이라 마스킹 없음)
   */
  private createFrame(opcode: number, payload: Buffer): Buffer {
    const payloadLength = payload.length;
    let frame: Buffer;
    let offset = 0;

    // Frame 크기 계산
    if (payloadLength < 126) {
      frame = Buffer.alloc(2 + payloadLength);
      frame[1] = payloadLength;
      offset = 2;
    } else if (payloadLength < 65536) {
      frame = Buffer.alloc(4 + payloadLength);
      frame[1] = 126;
      frame.writeUInt16BE(payloadLength, 2);
      offset = 4;
    } else {
      frame = Buffer.alloc(10 + payloadLength);
      frame[1] = 127;
      frame.writeUInt32BE(0, 2); // 상위 32비트
      frame.writeUInt32BE(payloadLength, 6); // 하위 32비트
      offset = 10;
    }

    // FIN bit = 1 + Opcode
    frame[0] = 0x80 | opcode;

    // Payload 복사
    payload.copy(frame, offset);

    return frame;
  }

  /**
   * Ping 프레임 전송 (하트비트). 브라우저는 Pong으로 자동 응답한다
   */
  ping(): void {
    this.writeFrame(WebSocketOpcode.Ping, Buffer.alloc(0));
  }

  /**
   * Pong 프레임 전송. Ping 페이로드를 그대로 돌려준다(제어 프레임이라 125바이트 이하)
   */
  private sendPong(data: Buffer): void {
    this.writeFrame(WebSocketOpcode.Pong, data);
  }

  /**
   * 연결 종료를 시작한다: Close를 보내고 CLOSING으로 가서 상대의 Close를 기다린다.
   * 상대가 CLOSE_TIMEOUT 안에 답하지 않으면 TCP를 끊는다.
   */
  close(code: number = CloseCode.Normal, reason = ''): void {
    if (this.readyState !== 'OPEN') return;
    this.writeFrame(WebSocketOpcode.Close, this.closePayload(code, reason));
    this.readyState = 'CLOSING';
    this.startCloseTimer();
  }

  /**
   * 이벤트 시스템
   */
  on<E extends ClientEvent>(event: E, callback: ClientEventListener<E>): void {
    const bucket = (this.listeners[event] ??= []) as ClientEventListener<E>[];
    bucket.push(callback);
  }

  private emit<E extends ClientEvent>(
    ...args: ClientEventPayloadMap[E] extends void
      ? [event: E]
      : [event: E, data: ClientEventPayloadMap[E]]
  ): void {
    const [event, data] = args as [E, ClientEventPayloadMap[E] | undefined];
    const bucket = this.listeners[event];
    if (!bucket) return;
    for (const callback of bucket) {
      (callback as (payload?: ClientEventPayloadMap[E]) => void)(data);
    }
  }

  /**
   * 세션 ID 생성 (UUID v4)
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private isClosed(): boolean {
    return this.readyState === 'CLOSED';
  }

  /**
   * 이 클라이언트가 topic을 구독했는지
   */
  isSubscribed(topic: Topic): boolean {
    return this.topics.has(topic);
  }

  /**
   * 세션 ID 반환
   */
  getSessionId(): string {
    return this.sessionInfo.id;
  }

  /**
   * 세션 정보 반환
   */
  getSessionInfo(): SessionInfo {
    return { ...this.sessionInfo };
  }

  /**
   * 세션 메타데이터 설정
   */
  setMetadata(key: string, value: unknown): void {
    this.sessionInfo.metadata[key] = value;
  }

  /**
   * 마지막 활동 시간 업데이트
   */
  private updateLastActive(): void {
    this.sessionInfo.lastActiveAt = new Date();
  }
}
