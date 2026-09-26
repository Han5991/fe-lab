import { sendGAEvent } from '@next/third-parties/google';

/** GA4 이벤트 매개변수 값은 100자까지만 담긴다. */
const MAX_DESCRIPTION = 100;
/** 한 번 로드한 탭에서 보낼 최대 건수 — 루프 속 에러가 수집을 뒤덮지 않게. */
const MAX_PER_LOAD = 5;

export interface ExceptionEvent {
  description: string;
  fatal: boolean;
}

export type ReportError = (thrown: unknown, fatal: boolean) => void;

/** 던져진 값을 GA4 `exception` 매개변수로 — 스택은 싣지 않는다(청크 URL이 대부분이고 길이 제한을 넘는다). */
export function toExceptionEvent(
  thrown: unknown,
  fatal: boolean,
): ExceptionEvent {
  const text =
    thrown instanceof Error
      ? `${thrown.name}: ${thrown.message}`
      : String(thrown);
  return { description: text.slice(0, MAX_DESCRIPTION), fatal };
}

/** 같은 설명은 한 번만, 전체는 `MAX_PER_LOAD`건까지만 `send`로 넘긴다. */
export function createErrorReporter(
  send: (event: ExceptionEvent) => void,
): ReportError {
  const seen = new Set<string>();
  return (thrown, fatal) => {
    const event = toExceptionEvent(thrown, fatal);
    if (seen.has(event.description) || seen.size >= MAX_PER_LOAD) return;
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
