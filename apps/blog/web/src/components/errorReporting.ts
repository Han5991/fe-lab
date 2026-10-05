import { sendGAEvent } from '@next/third-parties/google';

/** GA4 이벤트 매개변수 값은 100자까지만 담긴다. */
const MAX_PARAM = 100;
/** 탭을 새로고침하기 전까지 보낼 비치명 오류 최대 건수 — 루프 속 에러가 수집을 뒤덮지 않게(클라이언트 이동으로는 초기화되지 않는다). */
const MAX_PER_LOAD = 5;

export interface ExceptionEvent {
  description: string;
  fatal: boolean;
  /** 이 사이트 스크립트의 첫 스택 프레임(`chunks/<해시>.js:줄:열`) — 함께 배포된 소스맵으로 원래 위치를 찾는다. */
  frame?: string;
}

export type ReportError = (thrown: unknown, fatal: boolean) => void;

/** 스택 한 줄의 `URL:줄:열` — V8(`at f (url:1:2)`)과 Firefox·Safari(`f@url:1:2`) 공통. */
const FRAME = /(https?:\/\/[^\s()]+):(\d+):(\d+)/;

/**
 * 스택에서 `origin`이 낸 첫 프레임. 확장 프로그램 프레임(`chrome-extension://`)은 FRAME이 http(s)만
 * 잡아 빠지고, GTM 프레임과 닮은 주소는 origin 비교로 건너뛴다.
 */
export function firstOwnFrame(
  stack: string,
  origin: string,
): string | undefined {
  for (const line of stack.split('\n')) {
    const [, url, row, col] = FRAME.exec(line) ?? [];
    if (url === undefined) continue;
    try {
      const parsed = new URL(url);
      if (parsed.origin !== origin) continue;
      const path = parsed.pathname.replace(/^\/_next\/static\//, '');
      // 줄:열이 끝에 있으니 넘치면 앞(경로)을 깎는다.
      return `${path}:${row}:${col}`.slice(-MAX_PARAM);
    } catch {
      continue;
    }
  }
  return undefined;
}

/** 던져진 값을 GA4 `exception` 매개변수로 — 스택 전체 대신 자기 출처의 첫 프레임 하나만 싣는다. */
export function toExceptionEvent(
  thrown: unknown,
  fatal: boolean,
  origin?: string,
): ExceptionEvent {
  const text =
    thrown instanceof Error
      ? `${thrown.name}: ${thrown.message}`
      : String(thrown);
  const event: ExceptionEvent = {
    description: text.slice(0, MAX_PARAM),
    fatal,
  };
  const frame =
    origin !== undefined && thrown instanceof Error && thrown.stack
      ? firstOwnFrame(thrown.stack, origin)
      : undefined;
  if (frame !== undefined) event.frame = frame;
  return event;
}

/** 같은 설명은 한 번만 넘긴다. 비치명 오류는 `MAX_PER_LOAD`건까지 — 에러 경계의 치명 오류는 그 잡음 뒤에 와도 버리지 않는다. */
export function createErrorReporter(
  send: (event: ExceptionEvent) => void,
): ReportError {
  const seen = new Set<string>();
  let nonFatalSent = 0;
  return (thrown, fatal) => {
    // origin은 보고 시점에 읽는다 — 이 모듈은 서버 렌더에서도 평가된다.
    const origin =
      typeof window === 'undefined' ? undefined : window.location.origin;
    const event = toExceptionEvent(thrown, fatal, origin);
    if (seen.has(event.description)) return;
    if (!fatal) {
      if (nonFatalSent >= MAX_PER_LOAD) return;
      nonFatalSent += 1;
    }
    seen.add(event.description);
    send(event);
  };
}

/** GA가 실리는 프로덕션에서만 보낸다. */
export const reportError = createErrorReporter(event => {
  if (process.env.NODE_ENV === 'production') {
    sendGAEvent('event', 'exception', event);
  }
});
