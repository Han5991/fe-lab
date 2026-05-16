# WebSocket 구현 - 바닥부터 만들기

Node.js와 React로 WebSocket을 직접 구현한 학습 프로젝트입니다.

## 🎯 학습 목표

- WebSocket 프로토콜 (RFC 6455) 이해
- HTTP Upgrade 메커니즘
- WebSocket Frame 파싱 및 인코딩
- 바이너리 데이터 처리
- 실시간 양방향 통신 구현

## 📁 프로젝트 구조

```
apps/
├── socket-server/          # Node.js WebSocket 서버
│   └── src/
│       ├── index.js                    # HTTP 서버 + WebSocket 서버 초기화
│       └── websocket-server.js         # WebSocket 프로토콜 구현
└── react/src/pages/
    └── SocketDemo.tsx      # React WebSocket 클라이언트
```

## 🚀 실행 방법

### 1. WebSocket 서버 실행

```bash
cd apps/socket-server
pnpm install
pnpm dev
```

서버가 `http://localhost:3001`에서 실행됩니다.

### 2. React 클라이언트 실행

별도 터미널에서:

```bash
# 루트 디렉토리에서
pnpm react
```

React 앱이 실행되면 `http://localhost:5173/socket`으로 접속합니다.

### 3. 다중 클라이언트 테스트

여러 브라우저 탭을 열어 `/socket` 페이지를 동시에 접속하면 브로드캐스팅을 테스트할 수 있습니다.

## 🔍 구현 상세

### WebSocket 핸드셰이크

서버는 HTTP Upgrade 요청을 받아 WebSocket으로 전환합니다:

```javascript
// 1. 클라이언트가 Upgrade 요청
GET / HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

// 2. 서버가 101 Switching Protocols 응답
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**Sec-WebSocket-Accept 계산:**

```javascript
const acceptKey = crypto
  .createHash('sha1')
  .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
  .digest('base64');
```

### WebSocket Frame 구조

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+-------------------------------+
|     Masking-key (if MASK=1)   |          Payload Data         |
+-------------------------------+-------------------------------+
```

**주요 필드:**

- **FIN (1bit)**: 최종 프레임 여부
- **Opcode (4bits)**: 프레임 타입 (0x1=Text, 0x8=Close, 0x9=Ping, 0xA=Pong)
- **MASK (1bit)**: 마스킹 여부 (클라이언트→서버는 항상 1)
- **Payload Length (7bits)**: 페이로드 길이
  - 0-125: 실제 길이
  - 126: 다음 2바이트가 길이
  - 127: 다음 8바이트가 길이

### 마스킹/언마스킹

클라이언트에서 서버로 전송되는 모든 데이터는 XOR 마스킹됩니다:

```javascript
// 언마스킹
for (let i = 0; i < payload.length; i++) {
  unmasked[i] = payload[i] ^ maskingKey[i % 4];
}
```

이는 프록시 캐시 오염을 방지하기 위한 보안 조치입니다.

## 📚 핵심 개념

### 1. HTTP Upgrade

WebSocket은 HTTP/1.1의 Upgrade 메커니즘을 사용하여 연결을 전환합니다:

```javascript
httpServer.on('upgrade', (req, socket, head) => {
  // HTTP 소켓을 WebSocket으로 전환
});
```

### 2. 양방향 전이중 통신

WebSocket은 TCP 위에서 동작하며 클라이언트와 서버 모두 언제든 메시지를 보낼 수 있습니다.

### 3. 프레임 기반 프로토콜

데이터는 프레임 단위로 전송되며, 각 프레임은 헤더와 페이로드로 구성됩니다.

### 4. 브로드캐스팅

서버는 연결된 모든 클라이언트를 추적하고 메시지를 브로드캐스트할 수 있습니다:

```javascript
broadcast(message) {
  for (const client of this.clients) {
    client.send(message);
  }
}
```

## 🧪 테스트 시나리오

1. **단일 클라이언트 연결**: 메시지 송수신 확인
2. **다중 클라이언트**: 브로드캐스팅 동작 확인
3. **연결 종료**: Graceful shutdown 확인
4. **큰 메시지**: Extended payload length 처리 확인

## 📖 참고 자료

- [RFC 6455 - The WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Node.js HTTP Module](https://nodejs.org/api/http.html)

## 🔧 확장 아이디어

현재 구현에 추가할 수 있는 기능들:

1. **재연결 로직**: 클라이언트 자동 재연결
2. **Heartbeat**: Ping/Pong을 이용한 연결 유지
3. **방(Room) 시스템**: 특정 그룹에만 메시지 전송
4. **이벤트 시스템**: Socket.io처럼 이벤트 기반 통신
5. **바이너리 데이터**: ArrayBuffer/Blob 지원
6. **압축**: permessage-deflate 확장 구현
7. **인증/권한**: 연결 시 토큰 검증
8. **메시지 큐**: 연결 끊김 시 메시지 버퍼링

## 💡 학습 포인트

### 저수준 네트워크 프로그래밍

- TCP 소켓 직접 다루기
- 바이너리 데이터 파싱
- 비트 연산 (bit masking, shifting)

### 프로토콜 설계

- 핸드셰이크 메커니즘
- 프레임 구조 설계
- 상태 관리 (CONNECTING, OPEN, CLOSING, CLOSED)

### 실시간 통신 패턴

- 이벤트 기반 아키텍처
- 브로드캐스팅 vs 유니캐스팅
- 연결 풀 관리

## ⚠️ 현재 구현의 제한사항

이 구현은 학습 목적이므로 다음 제한사항이 있습니다:

1. **단일 프레임만 지원**: 프래그멘테이션 미구현
2. **텍스트만 지원**: 바이너리 프레임 미구현
3. **에러 처리 간소화**: 프로덕션 수준의 에러 핸들링 부족
4. **보안**: 실제 서비스에는 추가 보안 검증 필요
5. **성능 최적화**: 대용량 트래픽 처리 미고려

프로덕션 환경에서는 [ws](https://github.com/websockets/ws) 또는 [Socket.io](https://socket.io/)를 사용하세요.
