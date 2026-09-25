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
import type { MockInstance } from 'vitest';
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
  /** 다음 텍스트 메시지(주식 시세 브로드캐스트는 건너뛴다) */
  nextText(): Promise<string>;
  /** 서버가 TCP를 닫을 때 resolve */
  closed: Promise<void>;
  /** 지금까지 받은 주식 시세 브로드캐스트 수 */
  priceUpdates(): number;
}

interface Harness {
  port: number;
  wsServer: WebSocketServer;
  httpServer: Server;
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
  /** 요청 경로(쿼리 포함). 기본 '/' */
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

async function startServer(
  options: ConstructorParameters<typeof WebSocketServer>[1] = {},
): Promise<Harness> {
  const httpServer = createServer();
  const wsServer = new WebSocketServer(httpServer, {
    allowedOrigins: null,
    ...options,
  });
  await new Promise<void>(resolve =>
    httpServer.listen(0, '127.0.0.1', resolve),
  );
  const { port } = httpServer.address() as AddressInfo;
  return { port, wsServer, httpServer };
}

async function stopServer({ wsServer, httpServer }: Harness): Promise<void> {
  wsServer.shutdown();
  await new Promise<void>(resolve => httpServer.close(() => resolve()));
}

const closeCodeOf = (frame: ServerFrame) =>
  frame.payload.length >= 2 ? frame.payload.readUInt16BE(0) : undefined;

let errorLog: MockInstance<typeof console.error>;

beforeAll(() => {
  // 연결·메시지마다 찍히는 서버 로그를 끈다
  vi.spyOn(console, 'log').mockImplementation(() => {});
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
});

/** 서버가 console.error로 남긴 소켓 오류 중 code가 있는 것(ERR_STREAM_WRITE_AFTER_END 등) */
const socketErrorCodes = () =>
  errorLog.mock.calls.flatMap(args =>
    args.flatMap((arg: unknown) =>
      arg instanceof Error && 'code' in arg ? [String(arg.code)] : [],
    ),
  );

afterAll(() => {
  vi.restoreAllMocks();
});

describe('프레임 수신 — TCP 청크 경계와 무관하게', () => {
  let harness: Harness;
  const sockets: net.Socket[] = [];

  beforeEach(async () => {
    harness = await startServer();
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.destroy();
    await stopServer(harness);
  });

  const connect = async (options?: ClientOptions) => {
    const client = await openClient(harness.port, options);
    sockets.push(client.socket);
    return client;
  };

  test('한 청크에 실린 프레임 여러 개를 모두 처리한다', async () => {
    const client = await connect();

    client.socket.write(
      Buffer.concat([text('one'), text('two'), text('three')]),
    );

    expect(await client.nextText()).toBe('one');
    expect(await client.nextText()).toBe('two');
    expect(await client.nextText()).toBe('three');
  });

  test('헤더 중간을 포함해 여러 청크로 쪼개진 프레임을 하나로 조립한다', async () => {
    const client = await connect();
    const message = 'x'.repeat(300);
    const frame = text(message);

    // [81 FE 01] — 16비트 확장 길이의 첫 바이트에서 자른다. 예전엔 여기서 readUInt16BE가
    // ERR_OUT_OF_RANGE를 던져 서버 프로세스가 죽었다.
    for (const [from, to] of [
      [0, 3],
      [3, 5],
      [5, 100],
      [100, frame.length],
    ]) {
      client.socket.write(frame.subarray(from, to));
      await sleep(20);
    }

    expect(await client.nextText()).toBe(message);

    // 다음 프레임도 정상 경계에서 읽힌다
    client.socket.write(text('after'));
    expect(await client.nextText()).toBe('after');
  });

  test('상한 크기(1MB) 프레임을 64비트 길이 필드 중간에서 끊고 1460바이트씩 보내도 한 메시지로 받는다', async () => {
    const client = await connect();
    const message = 'y'.repeat(1024 * 1024);
    const frame = text(message);

    client.socket.write(frame.subarray(0, 5));
    await sleep(20);
    for (let from = 5; from < frame.length; from += 1460) {
      client.socket.write(frame.subarray(from, from + 1460));
    }

    expect(await client.nextText()).toBe(message);
  });

  test('프레임 끝과 다음 프레임 앞부분이 한 청크에 섞여도 경계를 지킨다', async () => {
    const client = await connect();
    const both = Buffer.concat([text('first'), text('second')]);
    const cut = text('first').length + 1;

    client.socket.write(both.subarray(0, cut));
    await sleep(20);
    client.socket.write(both.subarray(cut));

    expect(await client.nextText()).toBe('first');
    expect(await client.nextText()).toBe('second');
  });

  test('핸드셰이크와 같은 패킷에 실려 온 프레임을 잃지 않는다', async () => {
    const client = await connect({ extra: text('early') });

    expect(await client.nextText()).toBe('early');
  });

  test('상한을 넘는 길이를 선언한 프레임은 버퍼링하지 않고 1009로 닫는다', async () => {
    const client = await connect();
    const header = Buffer.alloc(14);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeUInt32BE(0x1000, 2); // 약 16TB
    header.writeUInt32BE(0, 6);

    client.socket.write(header);

    const frame = await client.nextFrame();
    expect(frame.opcode).toBe(0x8);
    expect(closeCodeOf(frame)).toBe(1009);
    await client.closed;
  });
});

describe('핸드셰이크 입력 검증', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startServer();
  });

  afterEach(async () => {
    await stopServer(harness);
  });

  test('파싱할 수 없는 Host 헤더에는 400으로 답하고 서버는 계속 동작한다', async () => {
    const socket = net.connect(harness.port, '127.0.0.1');
    const response = await new Promise<string>((resolve, reject) => {
      let received = '';
      socket.on('data', chunk => {
        received += chunk.toString();
      });
      socket.on('close', () => resolve(received));
      socket.on('error', reject);
      socket.write(handshakeRequest(harness.port, '['));
    });

    expect(response).toMatch(/^HTTP\/1\.1 400 /);

    // 같은 서버에 정상 연결이 여전히 된다
    const client = await openClient(harness.port);
    client.socket.write(text('alive'));
    expect(await client.nextText()).toBe('alive');
    client.socket.destroy();
  });
});

describe('하트비트', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startServer({
      heartbeatInterval: 40,
      sessionTimeout: 200,
      cleanupInterval: 40,
    });
  });

  afterEach(async () => {
    await stopServer(harness);
  });

  test('보내는 것 없이 듣기만 하는 클라이언트도 Pong으로 살아 있으면 끊지 않는다', async () => {
    const listener = await openClient(harness.port);
    let closed = false;
    void listener.closed.then(() => {
      closed = true;
    });

    await sleep(500);

    expect(closed).toBe(false);
    listener.socket.write(text('still here'));
    expect(await listener.nextText()).toBe('still here');
    listener.socket.destroy();
  });

  test('Ping에도 답하지 않는 연결은 sessionTimeout 뒤에 닫는다', async () => {
    const dead = await openClient(harness.port, { autoPong: false });

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('응답 없는 연결이 닫히지 않았다')),
        1500,
      );
    });
    try {
      await Promise.race([dead.closed, timeout]);
    } finally {
      clearTimeout(timer);
    }
  });
});

describe('구독(topics)', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startServer({ stockBroadcastInterval: 20 });
  });

  afterEach(async () => {
    await stopServer(harness);
  });

  test('시세는 ?topics=stocks로 구독한 클라이언트에게만, 채팅은 기본(chat) 클라이언트에게만 간다', async () => {
    const chat = await openClient(harness.port);
    const stocks = await openClient(harness.port, { path: '/?topics=stocks' });

    await sleep(200);
    chat.socket.write(text('hello'));

    expect(await chat.nextText()).toBe('hello');
    expect(
      stocks.priceUpdates(),
      '구독자가 시세를 받지 못했다',
    ).toBeGreaterThan(0);
    expect(chat.priceUpdates()).toBe(0);

    // 시세 구독자에게 채팅이 가지 않는다
    await expect(stocks.nextFrame(200)).rejects.toThrow(/시간 초과/);

    chat.socket.destroy();
    stocks.socket.destroy();
  });
});

describe('종료 핸드셰이크와 프로토콜 검증', () => {
  let harness: Harness;
  const sockets: net.Socket[] = [];

  beforeEach(async () => {
    harness = await startServer();
    errorLog.mockClear();
  });

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.destroy();
    await stopServer(harness);
  });

  const connect = async (options?: ClientOptions) => {
    const client = await openClient(harness.port, options);
    sockets.push(client.socket);
    return client;
  };

  const expectClosedWith = async (client: RawClient, code: number) => {
    const frame = await client.nextFrame();
    expect(frame.opcode).toBe(0x8);
    expect(closeCodeOf(frame)).toBe(code);
    await client.closed;
  };

  test('클라이언트가 먼저 닫으면 같은 상태 코드로 Close를 돌려주고 TCP를 닫는다', async () => {
    const client = await connect();
    const payload = Buffer.alloc(2);
    payload.writeUInt16BE(1000);

    client.socket.write(clientFrame(0x8, payload));

    await expectClosedWith(client, 1000);
    expect(socketErrorCodes()).toEqual([]);
  });

  test('서버가 먼저 닫으면 1001을 보내고, 클라이언트의 Close 응답에 다시 쓰지 않는다', async () => {
    const client = await connect();

    harness.wsServer.shutdown();

    await expectClosedWith(client, 1001);
    await sleep(20);
    // 예전엔 응답 Close를 받아 이미 end()한 소켓에 또 Close를 써 ERR_STREAM_WRITE_AFTER_END가 났다
    expect(socketErrorCodes()).toEqual([]);
  });

  test('마스킹되지 않은 클라이언트 프레임은 1002로 닫는다', async () => {
    const client = await connect();

    client.socket.write(clientFrame(0x1, 'plain', { masked: false }));

    await expectClosedWith(client, 1002);
  });

  test('UTF-8이 아닌 텍스트 메시지는 1007로 닫는다', async () => {
    const client = await connect();

    client.socket.write(clientFrame(0x1, Buffer.from([0xc3, 0x28])));

    await expectClosedWith(client, 1007);
  });

  test('125바이트를 넘는 제어 프레임은 1002로 닫는다', async () => {
    const client = await connect();

    client.socket.write(clientFrame(0x9, Buffer.alloc(126)));

    await expectClosedWith(client, 1002);
  });

  test('조각 메시지가 끝나기 전에 새 메시지를 시작하면 1002로 닫는다', async () => {
    const client = await connect();

    client.socket.write(
      Buffer.concat([
        clientFrame(0x1, 'part-1', { fin: false }),
        clientFrame(0x1, 'another'),
      ]),
    );

    await expectClosedWith(client, 1002);
  });

  test('조각을 합친 크기가 상한을 넘으면 1009로 닫는다', async () => {
    const client = await connect();
    const piece = Buffer.alloc(400 * 1024, 0x61);

    client.socket.write(
      Buffer.concat([
        clientFrame(0x1, piece, { fin: false }),
        clientFrame(0x0, piece, { fin: false }),
        clientFrame(0x0, piece),
      ]),
    );

    await expectClosedWith(client, 1009);
  });

  test(`조각 ${MAX_FRAGMENTS}개로 나뉜 메시지를 순서대로 이어 붙인다`, async () => {
    const client = await connect();
    const parts = Array.from({ length: MAX_FRAGMENTS }, (_, i) =>
      String.fromCharCode(0x61 + (i % 26)),
    );

    client.socket.write(
      Buffer.concat(
        parts.map((part, i) =>
          clientFrame(i === 0 ? 0x1 : 0x0, part, {
            fin: i === parts.length - 1,
          }),
        ),
      ),
    );

    expect(await client.nextText()).toBe(parts.join(''));
  });

  test('조각 수가 상한을 넘으면 빈 조각이어도 1009로 닫는다', async () => {
    const client = await connect();
    const empty = clientFrame(0x0, '', { fin: false });

    client.socket.write(
      Buffer.concat([
        clientFrame(0x1, '', { fin: false }),
        ...Array<Buffer>(MAX_FRAGMENTS).fill(empty),
      ]),
    );

    await expectClosedWith(client, 1009);
  });

  test('조각난 텍스트 메시지를 이어 붙여 한 메시지로 전달한다', async () => {
    const client = await connect();

    client.socket.write(
      Buffer.concat([
        clientFrame(0x1, 'Hel', { fin: false }),
        clientFrame(0x9, 'ping-in-between'),
        clientFrame(0x0, 'lo'),
      ]),
    );

    // 조각 사이에 끼어든 Ping에는 같은 페이로드의 Pong으로 먼저 답한다
    const pong = await client.nextFrame();
    expect(pong.opcode).toBe(0xa);
    expect(pong.payload.toString()).toBe('ping-in-between');
    expect(await client.nextText()).toBe('Hello');
  });

  test('Sec-WebSocket-Version이 13이 아니면 426으로 답한다', async () => {
    const socket = net.connect(harness.port, '127.0.0.1');
    sockets.push(socket);
    const response = await new Promise<string>((resolve, reject) => {
      let received = '';
      socket.on('data', chunk => {
        received += chunk.toString();
      });
      socket.on('close', () => resolve(received));
      socket.on('error', reject);
      socket.write(
        handshakeRequest(harness.port).replace(
          'Sec-WebSocket-Version: 13',
          'Sec-WebSocket-Version: 8',
        ),
      );
    });

    expect(response).toMatch(/^HTTP\/1\.1 426 /);
    expect(response).toMatch(/Sec-WebSocket-Version: 13/);
  });
});

describe('Origin 검증', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startServer({ allowedOrigins: isLocalOrigin });
  });

  afterEach(async () => {
    await stopServer(harness);
  });

  const handshakeStatus = (origin: string) =>
    new Promise<string>((resolve, reject) => {
      const socket = net.connect(harness.port, '127.0.0.1');
      socket.once('data', chunk => {
        resolve(chunk.toString().split('\r\n')[0]);
        socket.destroy();
      });
      socket.on('error', reject);
      socket.write(
        handshakeRequest(harness.port).replace(
          '\r\n\r\n',
          `\r\nOrigin: ${origin}\r\n\r\n`,
        ),
      );
    });

  test('로컬 개발 출처는 포트와 무관하게 허용하고 다른 출처는 403으로 막는다', async () => {
    expect(await handshakeStatus('http://localhost:5173')).toMatch(/ 101 /);
    expect(await handshakeStatus('http://localhost:5174')).toMatch(/ 101 /);
    expect(await handshakeStatus('http://127.0.0.1:4173')).toMatch(/ 101 /);
    expect(await handshakeStatus('https://evil.example')).toMatch(/ 403 /);
  });
});
