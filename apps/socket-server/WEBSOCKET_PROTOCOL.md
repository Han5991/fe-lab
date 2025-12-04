# WebSocket 프로토콜 상세 가이드

WebSocket 핸드셰이크 이후의 복잡한 프로토콜 처리 방법을 설명합니다.

## 목차

1. [프레임 파싱 (Frame Parsing)](#1-프레임-파싱-frame-parsing)
2. [마스킹/언마스킹 (Masking/Unmasking)](#2-마스킹언마스킹-maskingunmasking)
3. [단편화 (Fragmentation) 처리](#3-단편화fragmentation-처리)
4. [제어 프레임 (Control Frames)](#4-제어-프레임-control-frames)
5. [전체 흐름](#전체-흐름-요약)

---

## 1. 프레임 파싱 (Frame Parsing)

WebSocket은 모든 데이터를 **프레임(Frame)** 단위로 전송합니다. 각 프레임은 바이너리 구조를 가집니다.

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
|     Extended payload length continued, if payload len == 127  |
+-------------------------------+-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------+-------------------------------+
:                     Payload Data continued ...                :
+---------------------------------------------------------------+
```

### 첫 번째 바이트 (8 bits)

```typescript
const firstByte = buffer[0];
const isFinalFrame = Boolean(firstByte & 0x80); // FIN bit (최상위 비트)
const opcode = firstByte & 0x0f; // Opcode (하위 4비트)
```

**예시**: `buffer[0] = 0b10000001` (0x81)

- `FIN bit = 1` → 마지막 프레임 (단편화 안됨)
- `Opcode = 0x1` → 텍스트 메시지

#### Opcode 종류

| Opcode       | 값  | 설명                          |
| ------------ | --- | ----------------------------- |
| Continuation | 0x0 | 단편화된 메시지의 후속 프레임 |
| Text         | 0x1 | 텍스트 데이터 (UTF-8)         |
| Binary       | 0x2 | 바이너리 데이터               |
| Close        | 0x8 | 연결 종료                     |
| Ping         | 0x9 | Ping (연결 확인)              |
| Pong         | 0xA | Pong (Ping 응답)              |

**코드 위치**: `websocket-server.ts:44-51`

### 두 번째 바이트 (8 bits)

```typescript
const secondByte = buffer[1];
const isMasked = Boolean(secondByte & 0x80); // MASK bit
let payloadLength = secondByte & 0x7f; // 페이로드 길이 (하위 7비트)
```

**예시**: `buffer[1] = 0b10000101` (0x85)

- `isMasked = true` → 마스킹됨 (클라이언트→서버는 항상 true)
- `payloadLength = 5` → 5바이트 데이터

### Payload Length 처리 (3단계)

#### 1. 길이 < 126

두 번째 바이트의 하위 7비트가 실제 길이입니다.

```typescript
// payloadLength가 0~125 사이면 그대로 사용
```

#### 2. 길이 = 126

다음 2바이트(16bit)가 실제 길이입니다 (최대 65,535).

```typescript
if (payloadLength === 126) {
  payloadLength = buffer.readUInt16BE(offset); // 2바이트 읽기
  offset += 2;
}
```

**코드 위치**: `websocket-server.ts:380-382`

#### 3. 길이 = 127

다음 8바이트(64bit)가 실제 길이입니다 (최대 2^64-1).

```typescript
else if (payloadLength === 127) {
  const high = buffer.readUInt32BE(offset);     // 상위 32비트
  const low = buffer.readUInt32BE(offset + 4);  // 하위 32비트
  payloadLength = high * 0x100000000 + low;     // 합치기
  offset += 8;
}
```

**코드 위치**: `websocket-server.ts:383-389`

### Masking Key 추출

클라이언트가 서버로 보내는 데이터는 **항상 마스킹**되어야 합니다.

```typescript
let maskingKey: Buffer | null = null;
if (isMasked) {
  maskingKey = buffer.slice(offset, offset + 4); // 4바이트 키
  offset += 4;
}
```

**코드 위치**: `websocket-server.ts:392-396`

### Payload 추출

```typescript
const payloadData = buffer.slice(offset, offset + payloadLength);
```

**코드 위치**: `websocket-server.ts:399`

---

## 2. 마스킹/언마스킹 (Masking/Unmasking)

### 왜 마스킹이 필요한가?

**프록시 캐시 포이즈닝(Cache Poisoning) 공격 방지**를 위해서입니다.

옛날 프록시 서버들은 WebSocket 프로토콜을 모르고, HTTP 메시지처럼 파싱하려고 시도했습니다. 악의적인 클라이언트가 "HTTP 응답처럼 보이는 WebSocket 메시지"를 보내서 프록시 캐시를 오염시킬 수 있었습니다.

마스킹을 통해 **모든 데이터를 무작위화**하면 이런 공격을 방지할 수 있습니다.

### 마스킹 규칙

- **클라이언트 → 서버**: 항상 마스킹 필수 (MASK bit = 1)
- **서버 → 클라이언트**: 마스킹 금지 (MASK bit = 0)

### XOR 마스킹 알고리즘

```typescript
private unmask(payload: Buffer, maskingKey: Buffer): Buffer {
  const unmasked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    unmasked[i] = payload[i] ^ maskingKey[i % 4]; // XOR 연산
  }
  return unmasked;
}
```

**코드 위치**: `websocket-server.ts:448-454`

### 마스킹 예시

```
원본 데이터:    "H"  "e"  "l"  "l"  "o"
바이트 값:      72   101  108  108  111

Masking Key:    [37, 250, 13, 82]
                (4바이트를 반복해서 사용)

마스킹 과정:
72  ^ 37  = 109
101 ^ 250 = 155
108 ^ 13  = 97
108 ^ 82  = 62
111 ^ 37  = 74   ← 키는 순환 (i % 4)

마스킹된 데이터: [109, 155, 97, 62, 74]

언마스킹 (같은 키로 다시 XOR):
109 ^ 37  = 72   ("H")
155 ^ 250 = 101  ("e")
97  ^ 13  = 108  ("l")
62  ^ 82  = 108  ("l")
74  ^ 37  = 111  ("o")
```

**XOR의 특성**: `A ^ B ^ B = A` → 같은 키로 두 번 XOR하면 원본 복구

### 서버→클라이언트는 마스킹 안 함

```typescript
private createFrame(payload: Buffer): Buffer {
  // ... 프레임 생성
  frame[0] = 0x81; // FIN=1, Opcode=1 (text)
  frame[1] = payloadLength; // MASK bit = 0 (마스킹 안 함)
  // 마스킹키 추가하지 않음
  payload.copy(frame, offset);
  return frame;
}
```

**코드 위치**: `websocket-server.ts:480-510`

---

## 3. 단편화(Fragmentation) 처리

큰 메시지를 여러 프레임으로 나눠서 전송할 수 있습니다.

### 단편화된 메시지 예시

클라이언트가 "Hello, World!"를 3개 프레임으로 분할하는 경우:

```
프레임 1: FIN=0, Opcode=0x1 (Text),    Data="Hello"
프레임 2: FIN=0, Opcode=0x0 (Cont),    Data=", Wor"
프레임 3: FIN=1, Opcode=0x0 (Cont),    Data="ld!"
```

### 처리 로직

```typescript
if (opcode === WebSocketOpcode.Text || opcode === WebSocketOpcode.Binary) {
  if (isFinalFrame) {
    // 단일 프레임 메시지 → 바로 처리
    this.handleCompleteMessage(opcode, unmaskedData);
  } else {
    // 단편화 시작 → opcode와 데이터 저장
    this.fragmentedOpcode = opcode;
    this.fragmentedMessage = [unmaskedData];
  }
} else if (opcode === WebSocketOpcode.Continuation) {
  // 후속 프레임
  if (this.fragmentedOpcode === null) {
    console.error('Received continuation frame without initial frame');
    return;
  }

  this.fragmentedMessage.push(unmaskedData); // 데이터 추가

  if (isFinalFrame) {
    // 마지막 프레임 → 모두 합치기
    const completeMessage = Buffer.concat(this.fragmentedMessage);
    this.handleCompleteMessage(this.fragmentedOpcode, completeMessage);

    // 상태 초기화
    this.fragmentedMessage = [];
    this.fragmentedOpcode = null;
  }
}
```

**코드 위치**: `websocket-server.ts:408-433`

### 단편화를 사용하는 이유

1. **메모리 효율**: 거대한 파일을 한 번에 버퍼에 올리지 않음
2. **멀티플렉싱**: 여러 메시지를 인터리브해서 보낼 수 있음
3. **스트리밍**: 데이터를 생성하면서 동시에 전송 가능

### 단편화 규칙

- 첫 프레임: FIN=0, Opcode=Text/Binary
- 중간 프레임들: FIN=0, Opcode=Continuation
- 마지막 프레임: FIN=1, Opcode=Continuation
- 제어 프레임(Ping, Pong, Close)은 단편화 불가

---

## 4. 제어 프레임 (Control Frames)

### Ping/Pong (연결 유지)

#### Ping 수신 처리

```typescript
else if (opcode === WebSocketOpcode.Ping) {
  this.sendPong(unmaskedData); // Ping 받으면 즉시 Pong 응답
}
```

**코드 위치**: `websocket-server.ts:436-437`

#### Pong 프레임 전송

```typescript
private sendPong(data: Buffer): void {
  const frame = Buffer.alloc(2 + data.length);
  frame[0] = 0x8a; // FIN=1, Opcode=0xA (Pong)
  frame[1] = data.length; // 서버는 마스킹 안 함
  data.copy(frame, 2);
  this.socket.write(frame);
}
```

**코드 위치**: `websocket-server.ts:515-521`

#### Ping/Pong 용도

- **Keep-alive**: 연결이 살아있는지 확인
- **지연 측정**: Ping 보낸 시간과 Pong 받은 시간 차이로 RTT 계산
- Ping 페이로드를 Pong에 그대로 돌려줘야 함

### Close 프레임

#### Close 수신 처리

```typescript
else if (opcode === WebSocketOpcode.Close) {
  this.close(); // 연결 종료
}
```

**코드 위치**: `websocket-server.ts:434-435`

#### Close 프레임 전송

```typescript
close(): void {
  const closeFrame = Buffer.from([0x88, 0x00]);
  // 0x88 = FIN=1, Opcode=8 (Close)
  // 0x00 = Payload length = 0
  this.socket.write(closeFrame);
  this.socket.end();
}
```

**코드 위치**: `websocket-server.ts:526-530`

#### Close Status Codes

| Code | 이름             | 설명                              |
| ---- | ---------------- | --------------------------------- |
| 1000 | Normal Closure   | 정상 종료                         |
| 1001 | Going Away       | 브라우저 탭 닫기 등               |
| 1002 | Protocol Error   | 프로토콜 오류                     |
| 1003 | Unsupported Data | 지원하지 않는 데이터 타입         |
| 1006 | Abnormal Closure | 비정상 종료 (코드 없이 연결 끊김) |
| 1007 | Invalid Payload  | 잘못된 페이로드 데이터            |
| 1008 | Policy Violation | 정책 위반                         |
| 1009 | Message Too Big  | 메시지가 너무 큼                  |
| 1011 | Internal Error   | 서버 내부 오류                    |

**Close 프레임 구조** (선택적 페이로드):

```
[2바이트 Status Code] + [UTF-8 이유 문자열]

예시:
buffer = [0x03, 0xE8, 0x47, 0x6F, 0x6F, 0x64, 0x62, 0x79, 0x65]
         |--------| |----------------------------------------|
         1000 (정상)  "Goodbye" (UTF-8)
```

---

## 전체 흐름 요약

```
[클라이언트] "Hello" 전송
     ↓
[브라우저] 자동 마스킹 + 프레임 생성
     ↓
[네트워크] 바이너리 데이터 전송
     [0x81, 0x85, mask[0], mask[1], mask[2], mask[3], masked_data...]
     ↓
[서버 - handleData] 프레임 파싱
  1. FIN bit 확인 (단일 프레임인가?)
  2. Opcode 확인 (Text? Binary? Close? Ping?)
  3. Payload length 추출 (1/2/8 바이트)
  4. Masking key 추출 (4바이트)
  5. Payload 추출
  6. XOR 언마스킹
     ↓
[서버 - handleCompleteMessage] 메시지 처리
  - Text: UTF-8 디코딩
  - Binary: 바이너리 데이터 그대로
     ↓
[서버] "Echo: Hello" 응답 전송
  1. Buffer.from("Echo: Hello")
  2. 프레임 생성 (마스킹 없음)
     - frame[0] = 0x81 (FIN=1, Opcode=Text)
     - frame[1] = length
     - payload 복사
  3. socket.write(frame)
     ↓
[네트워크] 바이너리 데이터 전송
     ↓
[브라우저] 자동 파싱 후 ws.onmessage 호출
     ↓
[클라이언트] event.data로 메시지 수신
```

---

## 핵심 포인트

1. **바이트 레벨 프로토콜**: HTTP처럼 텍스트 기반이 아니라 비트 단위로 데이터를 분해하고 조합
2. **마스킹 비대칭**: 클라이언트→서버는 필수, 서버→클라이언트는 금지
3. **프레임 단위 처리**: 모든 메시지는 프레임으로 캡슐화되어 전송
4. **상태 관리**: 단편화된 메시지를 조립하기 위해 상태(fragmentedMessage, fragmentedOpcode) 유지
5. **제어 프레임**: Ping/Pong으로 연결 유지, Close로 정상 종료

---

## 참고 자료

- [RFC 6455 - The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- 코드 구현: `apps/socket-server/src/websocket-server.ts`
