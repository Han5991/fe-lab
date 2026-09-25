import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import {
  isLocalOrigin,
  MAX_FRAGMENTS,
  WebSocketServer,
} from './websocket-server.ts';

// 브라우저 대신 날 TCP 소켓으로 서버를 두드린다 — 청크 경계를 직접 정해야
// "TCP는 스트림"이라는 조건을 재현할 수 있다.

const WAIT_MS = 2000;

interface ServerFrame {
  opcode: number;
  payload: Buffer;
}

interface RawClient {
  socket: net.Socket;
  /** 다음 서버 프레임(주식 시세 브로드캐스트는 건너뛴다) */
  nextFrame(timeoutMs?: number): Promise<ServerFrame>;
  nextText(): Promise<string>;
  /** 서버가 TCP를 닫을 때 resolve */
  closed: Promise<void>;
  priceUpdates(): number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** 클라이언트→서버 프레임은 반드시 마스킹된다(RFC 6455 §5.3) */
function clientFrame(
  opcode: number,
  payload: Buffer | string,
  { fin = true, masked = true }: { fin?: boolean; masked?: boolean } = {},
): Buffer {
  const data = typeof payload === 'string' ? Buffer.from(payload) : payload;
  const length = data.length;
  let header: Buffer;
  if (length < 126) {
    header = Buffer.from([0, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(length, 6);
  }
  header[0] = (fin ? 0x80 : 0) | opcode;
  if (!masked) return Buffer.concat([header, data]);

  header[1] |= 0x80;
  const mask = crypto.randomBytes(4);
  const body = Buffer.alloc(length);
  for (let i = 0; i < length; i++) body[i] = data[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, body]);
}

const text = (message: string) => clientFrame(0x1, message);

function handshakeRequest(
  port: number,
  host = `localhost:${port}`,
  path = '/',
): string {
  return [
    `GET ${path} HTTP/1.1`,
    `Host: ${host}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}`,
    'Sec-WebSocket-Version: 13',
    '',
    '',
  ].join('\r\n');
}

const isPriceUpdate = (frame: ServerFrame) =>
  frame.opcode === 0x1 &&
  frame.payload.toString('utf-8').startsWith('{"type":"PRICE_UPDATE"');

interface ClientOptions {
  /** 핸드셰이크와 같은 write에 실어 보낼 바이트 */
  extra?: Buffer;
  /** 서버 Ping에 Pong으로 답할지(브라우저는 자동으로 답한다). 기본 true */
  autoPong?: boolean;
  path?: string;
}

async function openClient(
  port: number,
  { extra, autoPong = true, path = '/' }: ClientOptions = {},
): Promise<RawClient> {
  const socket = net.connect(port, '127.0.0.1');
  socket.setNoDelay(true);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  const frames: ServerFrame[] = [];
  const waiters: Array<(frame: ServerFrame) => void> = [];
  let pending = Buffer.alloc(0);
  let upgraded = false;
  let priceUpdates = 0;
  let closeSent = false;
  // 서버가 먼저 TCP를 닫은 뒤의 쓰기(EPIPE 등)로 테스트 프로세스가 죽지 않게 한다
  socket.on('error', () => {});
  let resolveUpgrade: () => void = () => {};
  const upgradedPromise = new Promise<void>(resolve => {
    resolveUpgrade = resolve;
  });

  const deliver = (frame: ServerFrame) => {
    const waiter = waiters.shift();
    if (waiter) waiter(frame);
    else frames.push(frame);
  };

  socket.on('data', chunk => {
    pending = Buffer.concat([pending, chunk]);
    if (!upgraded) {
      const end = pending.indexOf('\r\n\r\n');
      if (end === -1) return;
      expect(pending.subarray(0, end).toString()).toMatch(/^HTTP\/1\.1 101 /);
      pending = pending.subarray(end + 4);
      upgraded = true;
      resolveUpgrade();
    }
    // 서버→클라이언트 프레임(마스킹 없음) 파싱
    for (;;) {
      if (pending.length < 2) return;
      let length = pending[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (pending.length < 4) return;
        length = pending.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (pending.length < 10) return;
        length = pending.readUInt32BE(6);
        offset = 10;
      }
      if (pending.length < offset + length) return;
      const frame = {
        opcode: pending[0] & 0x0f,
        payload: Buffer.from(pending.subarray(offset, offset + length)),
      };
      pending = pending.subarray(offset + length);
      if (frame.opcode === 0x9) {
        // Ping — 브라우저처럼 같은 페이로드로 Pong을 돌려준다
        if (autoPong) socket.write(clientFrame(0xa, frame.payload));
        continue;
      }
      if (frame.opcode === 0x8 && !closeSent) {
        // Close — 브라우저처럼 같은 상태 코드로 Close를 돌려준다
        closeSent = true;
        if (socket.writable) socket.write(clientFrame(0x8, frame.payload));
      }
      if (isPriceUpdate(frame)) priceUpdates += 1;
      else deliver(frame);
    }
  });

  const closed = new Promise<void>(resolve => socket.once('close', resolve));

  const request = handshakeRequest(port, undefined, path);
  socket.write(extra ? Buffer.concat([Buffer.from(request), extra]) : request);
  await upgradedPromise;

  const nextFrame = (timeoutMs = WAIT_MS) =>
    new Promise<ServerFrame>((resolve, reject) => {
      const queued = frames.shift();
      if (queued) return resolve(queued);
      const timer = setTimeout(
        () => reject(new Error('서버 프레임을 기다리다 시간 초과')),
        timeoutMs,
      );
      waiters.push(frame => {
        clearTimeout(timer);
        resolve(frame);
      });
    });

  const nextText = async () => {
    const frame = await nextFrame();
    expect(frame.opcode, `텍스트가 아닌 프레임: ${frame.opcode}`).toBe(0x1);
    return frame.payload.toString('utf-8');
  };

  return {
    socket,
    nextFrame,
    nextText,
    closed,
    priceUpdates: () => priceUpdates,
  };
}

beforeAll(() => {
  // 연결·메시지마다 찍히는 서버 로그를 끈다
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

/** describe마다 서버를 띄우고, 테스트가 연 소켓은 끝에 모두 닫는다 */
function useServer(
  options: ConstructorParameters<typeof WebSocketServer>[1] = {},
) {
  let port = 0;
  let wsServer: WebSocketServer;
  let httpServer: Server;
  const sockets: net.Socket[] = [];

  beforeEach(async () => {
    httpServer = createServer();
    wsServer = new WebSocketServer(httpServer, {
      allowedOrigins: null,
      ...options,
    });
    await new Promise<void>(resolve =>
      httpServer.listen(0, '127.0.0.1', resolve),
    );
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.destroy();
    wsServer.shutdown();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  return {
    shutdown: () => wsServer.shutdown(),
    async connect(clientOptions?: ClientOptions) {
      const client = await openClient(port, clientOptions);
      sockets.push(client.socket);
      return client;
    },
    /** 핸드셰이크 요청을 보내고 서버의 첫 응답을 돌려준다 */
    handshake(request: (port: number) => string) {
      const socket = net.connect(port, '127.0.0.1');
      sockets.push(socket);
      return new Promise<string>((resolve, reject) => {
        socket.once('data', chunk => resolve(chunk.toString()));
        socket.on('error', reject);
        socket.write(request(port));
      });
    },
  };
}

async function expectClosedWith(client: RawClient, code: number) {
  const frame = await client.nextFrame();
  expect(frame.opcode).toBe(0x8);
  expect(frame.payload.readUInt16BE(0)).toBe(code);
  await client.closed;
  // Close는 한 번만 보낸다
  await expect(client.nextFrame(0)).rejects.toThrow(/시간 초과/);
}

const slices = (bytes: Buffer, size: number) =>
  Array.from({ length: Math.ceil(bytes.length / size) }, (_, i) =>
    bytes.subarray(i * size, (i + 1) * size),
  );

describe('프레임 수신 — TCP 청크 경계와 무관하게', () => {
  const server = useServer();
  const long = 'x'.repeat(300);
  const huge = 'y'.repeat(1024 * 1024);
  const mixed = Buffer.concat([text('one'), text('two'), text(long)]);
  const at = mixed.length - text(long).length;
  const hugeFrame = text(huge);

  // writes의 묶음 사이마다 잠깐 쉬어 서버가 따로 읽게 한다
  test.each([
    {
      name: '한 청크의 여러 프레임과 16비트 길이 필드에서 끊긴 다음 프레임',
      writes: [[mixed.subarray(0, at + 3)], [mixed.subarray(at + 3)]],
      expected: ['one', 'two', long],
    },
    {
      name: '64비트 길이 필드에서 끊고 1460바이트씩 온 상한 크기(1MB) 프레임',
      writes: [[hugeFrame.subarray(0, 5)], slices(hugeFrame.subarray(5), 1460)],
      expected: [huge],
    },
  ])('$name', async ({ writes, expected }) => {
    const client = await server.connect();

    for (const group of writes) {
      for (const chunk of group) client.socket.write(chunk);
      await sleep(20);
    }

    for (const message of expected) {
      expect(await client.nextText()).toBe(message);
    }
  });

  test('핸드셰이크와 같은 패킷에 실려 온 프레임을 잃지 않는다', async () => {
    const client = await server.connect({ extra: text('early') });

    expect(await client.nextText()).toBe('early');
  });
});

describe('핸드셰이크 검증', () => {
  const server = useServer({ allowedOrigins: isLocalOrigin });
  const withOrigin = (origin: string) => (port: number) =>
    handshakeRequest(port).replace('\r\n\r\n', `\r\nOrigin: ${origin}\r\n\r\n`);

  test.each([
    {
      name: '파싱할 수 없는 Host 헤더에는 400',
      request: (port: number) => handshakeRequest(port, '['),
      response: /^HTTP\/1\.1 400 /,
    },
    {
      name: '버전이 13이 아니면 426과 지원 버전',
      request: (port: number) =>
        handshakeRequest(port).replace('Version: 13', 'Version: 8'),
      response: /^HTTP\/1\.1 426 [^]*Sec-WebSocket-Version: 13/,
    },
    {
      name: '포트가 다른 로컬 개발 출처는 101',
      request: withOrigin('http://localhost:5174'),
      response: /^HTTP\/1\.1 101 /,
    },
    {
      name: '다른 출처는 403',
      request: withOrigin('https://evil.example'),
      response: /^HTTP\/1\.1 403 /,
    },
  ])('$name', async ({ request, response }) => {
    expect(await server.handshake(request)).toMatch(response);
  });
});

describe('하트비트', () => {
  const server = useServer({
    heartbeatInterval: 40,
    sessionTimeout: 200,
    cleanupInterval: 40,
  });

  test.each([
    { name: '듣기만 해도 Pong으로 답하면 끊지 않는다', autoPong: true },
    {
      name: 'Ping에 답하지 않으면 sessionTimeout 뒤에 닫는다',
      autoPong: false,
    },
  ])('$name', async ({ autoPong }) => {
    const client = await server.connect({ autoPong });
    let closed = false;
    void client.closed.then(() => {
      closed = true;
    });

    await sleep(500);

    expect(closed).toBe(!autoPong);
  });
});

describe('구독(topics)', () => {
  const server = useServer({ stockBroadcastInterval: 20 });

  test('시세는 ?topics=stocks로 구독한 클라이언트에게만, 채팅은 기본(chat) 클라이언트에게만 간다', async () => {
    const chat = await server.connect();
    const stocks = await server.connect({ path: '/?topics=stocks' });

    await sleep(200);
    chat.socket.write(text('hello'));

    expect(await chat.nextText()).toBe('hello');
    expect(stocks.priceUpdates()).toBeGreaterThan(0);
    expect(chat.priceUpdates()).toBe(0);
    await expect(stocks.nextFrame(200)).rejects.toThrow(/시간 초과/);
  });
});

describe('종료 핸드셰이크와 프로토콜 검증', () => {
  const server = useServer();

  test('서버가 먼저 닫으면 1001을 보내고, 클라이언트의 Close 응답에 다시 쓰지 않는다', async () => {
    const client = await server.connect();

    server.shutdown();

    await expectClosedWith(client, 1001);
  });

  const piece = Buffer.alloc(400 * 1024, 0x61);
  const emptyContinuation = clientFrame(0x0, '', { fin: false });

  test.each([
    {
      name: '클라이언트가 먼저 보낸 Close',
      bytes: clientFrame(0x8, Buffer.from([0x03, 0xe8])),
      code: 1000,
    },
    {
      name: '마스킹되지 않은 프레임',
      bytes: clientFrame(0x1, 'plain', { masked: false }),
      code: 1002,
    },
    {
      name: 'UTF-8이 아닌 텍스트',
      bytes: clientFrame(0x1, Buffer.from([0xc3, 0x28])),
      code: 1007,
    },
    {
      name: '125바이트를 넘는 제어 프레임',
      bytes: clientFrame(0x9, Buffer.alloc(126)),
      code: 1002,
    },
    {
      name: '조각 메시지가 끝나기 전에 시작한 새 메시지',
      bytes: Buffer.concat([
        clientFrame(0x1, 'part-1', { fin: false }),
        clientFrame(0x1, 'another'),
      ]),
      code: 1002,
    },
    {
      name: '상한을 넘는 길이를 선언한 프레임(페이로드 없이)',
      bytes: Buffer.from([0x81, 0xff, 0, 0, 0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      code: 1009,
    },
    {
      name: '합친 크기가 상한을 넘는 조각들',
      bytes: Buffer.concat([
        clientFrame(0x1, piece, { fin: false }),
        clientFrame(0x0, piece, { fin: false }),
        clientFrame(0x0, piece),
      ]),
      code: 1009,
    },
    {
      name: `${MAX_FRAGMENTS}개를 넘는 빈 조각`,
      bytes: Buffer.concat([
        clientFrame(0x1, '', { fin: false }),
        ...Array<Buffer>(MAX_FRAGMENTS).fill(emptyContinuation),
      ]),
      code: 1009,
    },
  ])('$name → Close $code', async ({ bytes, code }) => {
    const client = await server.connect();

    client.socket.write(bytes);

    await expectClosedWith(client, code);
  });

  test(`조각 ${MAX_FRAGMENTS}개를 사이에 낀 Ping에 먼저 답하고 순서대로 이어 붙인다`, async () => {
    const client = await server.connect();
    const parts = Array.from({ length: MAX_FRAGMENTS }, (_, i) =>
      String.fromCharCode(0x61 + (i % 26)),
    );
    const frames = parts.map((part, i) =>
      clientFrame(i === 0 ? 0x1 : 0x0, part, { fin: i === parts.length - 1 }),
    );
    frames.splice(1, 0, clientFrame(0x9, 'ping'));

    client.socket.write(Buffer.concat(frames));

    const pong = await client.nextFrame();
    expect(pong.opcode).toBe(0xa);
    expect(pong.payload.toString()).toBe('ping');
    expect(await client.nextText()).toBe(parts.join(''));
  });
});
