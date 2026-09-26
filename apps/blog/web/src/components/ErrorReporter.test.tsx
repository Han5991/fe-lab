/** 런타임 예외 수집 — 무엇을 보내고 무엇을 거르는가. */
import { expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorReporter } from './ErrorReporter';
import {
  createErrorReporter,
  toExceptionEvent,
  type ExceptionEvent,
  type ReportError,
} from './errorReporting';

test('설명은 "이름: 메시지"를 GA4 한도(100자)로 자르고, Error가 아닌 값은 문자열로 싣는다', () => {
  expect(toExceptionEvent(new TypeError('x'.repeat(200)), true)).toStrictEqual({
    description: `TypeError: ${'x'.repeat(89)}`,
    fatal: true,
  });
  expect(toExceptionEvent('boom', false)).toStrictEqual({
    description: 'boom',
    fatal: false,
  });
});

test('같은 설명은 한 번만, 비치명 오류는 5건까지만 보내고 치명 오류는 그 뒤에도 보낸다', () => {
  const send = vi.fn<(event: ExceptionEvent) => void>();
  const report = createErrorReporter(send);

  for (const message of ['a', 'a', 'b', 'c', 'd', 'e', 'f']) {
    report(new Error(message), false);
  }
  report(new Error('crash'), true);

  expect(send.mock.calls.map(([event]) => event.description)).toStrictEqual([
    'Error: a',
    'Error: b',
    'Error: c',
    'Error: d',
    'Error: e',
    'Error: crash',
  ]);
});

test('이 사이트 스크립트의 에러와 Error로 거절된 promise만 보낸다', () => {
  const report = vi.fn<ReportError>();
  render(<ErrorReporter report={report} />);
  const rejection = (reason: unknown) =>
    Object.assign(new Event('unhandledrejection'), { reason });

  window.dispatchEvent(
    new ErrorEvent('error', {
      error: new Error('own'),
      filename: `${window.location.origin}/_next/static/chunks/a.js`,
    }),
  );
  window.dispatchEvent(
    new ErrorEvent('error', {
      error: new Error('extension'),
      filename: 'chrome-extension://abc/content.js',
    }),
  );
  window.dispatchEvent(
    new ErrorEvent('error', {
      error: new Error('lookalike'),
      filename: `${window.location.origin}.attacker.example/mal.js`,
    }),
  );
  window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }));
  window.dispatchEvent(rejection(new Error('async')));
  window.dispatchEvent(rejection('not an error'));

  expect(
    report.mock.calls.map(([thrown, fatal]) => [
      (thrown as Error).message,
      fatal,
    ]),
  ).toStrictEqual([
    ['own', false],
    ['async', false],
  ]);
});
