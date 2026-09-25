import crypto from 'node:crypto';
import type { Server as HTTPServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

/**
 * WebSocket 서버 옵션
 */
interface WebSocketServerOptions {
  /** 허용할 Origin 목록. null이면 모든 origin 허용 */
  allowedOrigins?: string[] | null;
  /** 세션 타임아웃 시간 (밀리초). 기본값: 5분 */
  sessionTimeout?: number;
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
 * enum 대신 const 객체다 — node의 type stripping(`node src/index.ts`, `node --test`)은
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

/** 한 프레임 페이로드의 상한. 넘으면 1009로 닫는다 — 수신 버퍼가 무한히 자라지 않게 한다 */
const DEFAULT_MAX_PAYLOAD = 1024 * 1024;

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
  private readonly allowedOrigins: string[] | null;
  private readonly sessionTimeout: number;
  private cleanupIntervalId: NodeJS.Timeout | null;
  private stockBroadcastIntervalId: NodeJS.Timeout | null;
  private stockData: Map<string, StockData>;

  constructor(httpServer: HTTPServer, options: WebSocketServerOptions = {}) {
    this.httpServer = httpServer;
    this.clients = new Set();
    this.sessions = new Map();
    this.allowedOrigins = options.allowedOrigins || null; // null이면 모든 origin 허용
    this.sessionTimeout = options.sessionTimeout || 5 * 60 * 1000; // 기본 5분
    this.cleanupIntervalId = null;
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

    // 세션 정리 타이머 시작 (1분마다 체크)
    this.startCleanupTimer();

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

    // URL에서 세션 ID 추출 (쿼리 파라미터: ?sessionId=xxx)
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
    const requestedSessionId = url.searchParams.get('sessionId');

    // WebSocket 핸드셰이크 키 추출
    const key = req.headers['sec-websocket-key'];

    if (!key) {
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
    const client = new WebSocketConnection(socket);
    const sessionId = client.getSessionId();

    this.clients.add(client);
    this.sessions.set(sessionId, client);

    console.log(
      `New client connected. Session ID: ${sessionId}, Total clients: ${this.clients.size}`,
    );

    // 클라이언트 이벤트 리스너
    client.on('message', (data: string) => {
      console.log(`[${sessionId}] Received text:`, data);
      // 모든 클라이언트에게 브로드캐스트
      this.broadcast(data);
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
    return this.allowedOrigins.includes(origin);
  }

  /**
   * 모든 연결된 클라이언트에게 메시지 브로드캐스트
   */
  broadcast(message: string): void {
    for (const client of this.clients) {
      client.send(message);
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
    // 1분마다 비활성 세션 체크
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60 * 1000);
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

    // 비활성 세션 종료
    for (const sessionId of inactiveSessions) {
      console.log(
        `Closing inactive session: ${sessionId} (inactive for ${Math.round(this.sessionTimeout / 1000)}s)`,
      );
      this.closeSession(sessionId);
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
    }, 1000);

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
    // 클라이언트가 없으면 브로드캐스트 안함
    if (this.clients.size === 0) return;

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

      // 모든 클라이언트에게 브로드캐스트
      this.broadcast(message);
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
    this.stopStockBroadcast();

    // 모든 연결 종료
    for (const client of this.clients) {
      client.close();
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
  private fragmentedOpcode: number | null;
  private readonly sessionInfo: SessionInfo;
  /**
   * 아직 프레임으로 떼어 내지 못한 수신 바이트.
   * TCP는 스트림이라 'data' 청크 경계가 프레임 경계와 맞지 않는다 — 한 청크에 프레임이
   * 여럿 오기도, 한 프레임(헤더까지)이 여러 청크로 쪼개져 오기도 한다.
   */
  private receiveBuffer: Buffer;
  private readonly maxPayload: number;
  /** 프로토콜 위반으로 끊은 뒤에는 남은 바이트를 해석하지 않는다 */
  private failed: boolean;

  constructor(
    socket: Duplex,
    sessionId?: string,
    maxPayload: number = DEFAULT_MAX_PAYLOAD,
  ) {
    this.socket = socket;
    this.listeners = {};
    this.fragmentedMessage = [];
    this.fragmentedOpcode = null;
    this.receiveBuffer = Buffer.alloc(0);
    this.maxPayload = maxPayload;
    this.failed = false;

    // 세션 정보 초기화
    const now = new Date();
    this.sessionInfo = {
      id: sessionId || this.generateSessionId(),
      connectedAt: now,
      lastActiveAt: now,
      metadata: {},
    };

    this.socket.on('data', (chunk: Buffer) => {
      this.receive(chunk);
    });

    this.socket.on('close', () => {
      this.emit('close');
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
    if (this.failed) return;

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
        if (this.failed) return;
        frame = this.readFrame();
      }
    } catch (error) {
      // 'data' 리스너에서 던지면 잡을 곳이 없어 프로세스가 죽는다 — 이 연결만 끊는다
      const closeCode =
        error instanceof WebSocketProtocolError ? error.closeCode : 1011;
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

    // 두 번째 바이트: MASK, Payload Length
    const secondByte = buffer[1];
    const isMasked = Boolean(secondByte & 0x80);
    let payloadLength = secondByte & 0x7f;

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
        1009,
        `Frame payload too large: ${payloadLength} bytes`,
      );
    }

    // Masking key (클라이언트->서버 메시지는 항상 마스킹됨)
    const maskLength = isMasked ? 4 : 0;
    const frameLength = offset + maskLength + payloadLength;
    // 페이로드가 다 오지 않았다 — 다음 청크를 기다린다
    if (buffer.length < frameLength) return null;

    const maskingKey = isMasked ? buffer.subarray(offset, offset + 4) : null;
    offset += maskLength;

    // Payload data
    const payloadData = buffer.subarray(offset, frameLength);

    // 이 프레임 뒤의 바이트는 다음 프레임의 시작이다
    this.receiveBuffer = buffer.subarray(frameLength);

    // 마스킹 해제 (unmask는 새 버퍼를 만든다 — 수신 버퍼를 계속 붙잡지 않는다)
    const payload = maskingKey
      ? this.unmask(payloadData, maskingKey)
      : Buffer.from(payloadData);

    return { isFinalFrame, opcode, payload };
  }

  /**
   * 완성된 프레임 하나를 opcode에 따라 처리한다
   */
  private handleFrame({ isFinalFrame, opcode, payload }: ParsedFrame): void {
    // Opcode 및 단편화 처리
    if (opcode === WebSocketOpcode.Text || opcode === WebSocketOpcode.Binary) {
      if (isFinalFrame) {
        // 단일 프레임 메시지
        this.handleCompleteMessage(opcode, payload);
      } else {
        // 단편화된 메시지의 시작
        this.fragmentedOpcode = opcode;
        this.fragmentedMessage = [payload];
      }
    } else if (opcode === WebSocketOpcode.Continuation) {
      if (this.fragmentedOpcode === null) {
        console.error('Received continuation frame without initial frame');
        return;
      }

      this.fragmentedMessage.push(payload);

      if (isFinalFrame) {
        // 모든 프레임 조립
        const completeMessage = Buffer.concat(this.fragmentedMessage);
        this.handleCompleteMessage(this.fragmentedOpcode, completeMessage);

        // 상태 초기화
        this.fragmentedMessage = [];
        this.fragmentedOpcode = null;
      }
    } else if (opcode === WebSocketOpcode.Close) {
      this.close();
    } else if (opcode === WebSocketOpcode.Ping) {
      this.sendPong(payload);
    } else if (opcode === WebSocketOpcode.Pong) {
      // Pong 수신 (필요시 처리)
    } else {
      console.log(`Unsupported opcode: ${opcode}`);
    }
  }

  /**
   * 프로토콜 위반: 상태 코드를 실은 Close 프레임을 보내고 연결을 끊는다
   */
  private fail(closeCode: number): void {
    this.failed = true;
    this.receiveBuffer = Buffer.alloc(0);
    const frame = Buffer.alloc(4);
    frame[0] = 0x88; // FIN=1, Opcode=8 (Close)
    frame[1] = 2;
    frame.writeUInt16BE(closeCode, 2);
    if (this.socket.writable) this.socket.write(frame);
    this.socket.end();
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
      const message = data.toString('utf-8');
      this.emit('message', message);
    } else if (opcode === WebSocketOpcode.Binary) {
      this.emit('binary', data);
    }
  }

  /**
   * 메시지 전송 (서버->클라이언트는 마스킹 안함)
   */
  send(message: string): void {
    const payload = Buffer.from(message);
    const frame = this.createFrame(payload);
    this.socket.write(frame);
  }

  /**
   * WebSocket Frame 생성
   */
  private createFrame(payload: Buffer): Buffer {
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

    // FIN bit = 1, Opcode = 1 (text frame)
    frame[0] = 0x81;

    // Payload 복사
    payload.copy(frame, offset);

    return frame;
  }

  /**
   * Pong 프레임 전송
   */
  private sendPong(data: Buffer): void {
    const frame = Buffer.alloc(2 + data.length);
    frame[0] = 0x8a; // FIN=1, Opcode=0xA (Pong)
    frame[1] = data.length;
    data.copy(frame, 2);
    this.socket.write(frame);
  }

  /**
   * 연결 종료
   */
  close(): void {
    const closeFrame = Buffer.from([0x88, 0x00]); // FIN=1, Opcode=8 (Close)
    this.socket.write(closeFrame);
    this.socket.end();
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
