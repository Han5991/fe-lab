import crypto from 'crypto';
import type { Server as HTTPServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

/**
 * WebSocket 서버 옵션
 */
interface WebSocketServerOptions {
  /** 허용할 Origin 목록. null이면 모든 origin 허용 */
  allowedOrigins?: string[] | null;
}

/**
 * 이벤트 리스너 타입
 */
type EventListener = (data?: any) => void;

/**
 * 이벤트 맵
 */
interface EventListeners {
  [event: string]: EventListener[];
}

/**
 * WebSocket Opcode
 */
enum WebSocketOpcode {
  Continuation = 0x0,
  Text = 0x1,
  Binary = 0x2,
  Close = 0x8,
  Ping = 0x9,
  Pong = 0xa,
}

/**
 * WebSocket Server - HTTP 서버 위에서 동작하는 WebSocket 구현
 * RFC 6455 스펙 기반
 */
export class WebSocketServer {
  private httpServer: HTTPServer;
  private readonly clients: Set<WebSocketConnection>;
  private readonly allowedOrigins: string[] | null;

  constructor(httpServer: HTTPServer, options: WebSocketServerOptions = {}) {
    this.httpServer = httpServer;
    this.clients = new Set();
    this.allowedOrigins = options.allowedOrigins || null; // null이면 모든 origin 허용

    // HTTP 서버의 upgrade 이벤트를 리스닝
    this.httpServer.on('upgrade', (req, socket, head) => {
      this.handleUpgrade(req, socket, head);
    });
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
    this.clients.add(client);

    console.log(`New client connected. Total clients: ${this.clients.size}`);

    // 핸드셰이크 중 이미 수신된 WebSocket 데이터 처리
    if (head.length > 0) {
      socket.emit('data', head);
    }

    // 클라이언트 이벤트 리스너
    client.on('message', (data: string) => {
      console.log('Received text:', data);
      // 모든 클라이언트에게 브로드캐스트
      this.broadcast(data);
    });

    client.on('binary', (data: Buffer) => {
      console.log('Received binary data:', data.length, 'bytes');
      // 바이너리 데이터 처리 (필요시 구현)
    });

    client.on('close', () => {
      this.clients.delete(client);
      console.log(`Client disconnected. Total clients: ${this.clients.size}`);
    });
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
}

/**
 * 개별 WebSocket 연결을 관리하는 클래스
 */
class WebSocketConnection {
  private socket: Duplex;
  private listeners: EventListeners;
  private fragmentedMessage: Buffer[];
  private fragmentedOpcode: number | null;

  constructor(socket: Duplex) {
    this.socket = socket;
    this.listeners = {};
    this.fragmentedMessage = [];
    this.fragmentedOpcode = null;

    this.socket.on('data', (buffer: Buffer) => {
      this.handleData(buffer);
    });

    this.socket.on('close', () => {
      this.emit('close');
    });

    this.socket.on('error', (err: Error) => {
      console.error('Socket error:', err);
    });
  }

  /**
   * WebSocket 프레임 파싱
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
  private handleData(buffer: Buffer): void {
    // 첫 번째 바이트: FIN, RSV, Opcode
    const firstByte = buffer[0];
    const isFinalFrame = Boolean(firstByte & 0x80); // FIN bit
    const opcode = firstByte & 0x0f;

    // 두 번째 바이트: MASK, Payload Length
    const secondByte = buffer[1];
    const isMasked = Boolean(secondByte & 0x80);
    let payloadLength = secondByte & 0x7f;

    let offset = 2;

    // Extended payload length
    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      // 64-bit length (Node.js에서는 Number로 처리)
      const high = buffer.readUInt32BE(offset);
      const low = buffer.readUInt32BE(offset + 4);
      payloadLength = high * 0x100000000 + low;
      offset += 8;
    }

    // Masking key (클라이언트->서버 메시지는 항상 마스킹됨)
    let maskingKey: Buffer | null = null;
    if (isMasked) {
      maskingKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    // Payload data
    const payloadData = buffer.slice(offset, offset + payloadLength);

    // 마스킹 해제
    const unmaskedData =
      isMasked && maskingKey
        ? this.unmask(payloadData, maskingKey)
        : payloadData;

    // Opcode 및 단편화 처리
    if (opcode === WebSocketOpcode.Text || opcode === WebSocketOpcode.Binary) {
      if (isFinalFrame) {
        // 단일 프레임 메시지
        this.handleCompleteMessage(opcode, unmaskedData);
      } else {
        // 단편화된 메시지의 시작
        this.fragmentedOpcode = opcode;
        this.fragmentedMessage = [unmaskedData];
      }
    } else if (opcode === WebSocketOpcode.Continuation) {
      if (this.fragmentedOpcode === null) {
        console.error('Received continuation frame without initial frame');
        return;
      }

      this.fragmentedMessage.push(unmaskedData);

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
      this.sendPong(unmaskedData);
    } else if (opcode === WebSocketOpcode.Pong) {
      // Pong 수신 (필요시 처리)
    } else {
      console.log(`Unsupported opcode: ${opcode}`);
    }
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
  on(event: string, callback: EventListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private emit(event: string, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}
