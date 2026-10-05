/**
 * 모든 spec이 쓰는 `test` — 기본 픽스처에 두 가지를 얹는다.
 *
 * 1. 컨텍스트를 만들자마자 네트워크를 봉인한다(`network.ts`).
 * 2. 잡히지 않은 예외(`weberror`)·콘솔 에러·목록 밖 요청을 모아 두었다가, 테스트가
 *    끝날 때 **셋 다 비어 있어야** 통과시킨다. 테스트 본문이 따로 단언하지 않아도
 *    모든 페이지 방문이 이 검사를 지난다.
 *
 * 모으는 범위는 테스트가 끝날 때까지다. 페이지 검사(`pages.spec.ts`)는 관찰 창
 * (`dom.ts`의 `OBSERVE_MS`, 내비게이션부터 5초)을 기다린 뒤 끝나므로 그 창 안의
 * 늦은 에러까지 결정적으로 잡힌다. 창을 기다리지 않는 상호작용 테스트는 그 테스트가
 * 끝날 때까지만 본다.
 */
import { expect, test as base } from '@playwright/test';
import { sealNetwork } from './network';

/** 테스트가 `test.use()`로 켜는 옵션. */
export interface RuntimeGuardOptions {
  /**
   * 이 테스트에서 **나야 정상인** 콘솔 에러 — 기록되는 문자열(`페이지 URL → 문구 (출처)`,
   * 로컬 서버 출처는 뗀다)과 정확히 같아야 빠진다. 패턴이 아니라 문자열이라 다른 에러는
   * 그대로 실패한다.
   */
  expectedConsoleErrors: string[];
}

interface RuntimeGuard {
  consoleErrors: string[];
  pageErrors: string[];
  unexpectedRequests: string[];
}

// 픽스처 콜백의 두 번째 인자는 관례상 `use`지만 `provide`로 부른다 — react-hooks
// 린트가 `use`를 React 훅으로 오인한다(이름만 다를 뿐 Playwright 계약은 같다).
export const test = base.extend<RuntimeGuardOptions>({
  expectedConsoleErrors: [[], { option: true }],
  context: async ({ context, baseURL, expectedConsoleErrors }, provide) => {
    if (!baseURL) throw new Error('playwright.config.ts에 baseURL이 없습니다');
    const guard: RuntimeGuard = {
      consoleErrors: [],
      pageErrors: [],
      unexpectedRequests: [],
    };
    await sealNetwork(context, baseURL, guard.unexpectedRequests);
    context.on('console', msg => {
      // 거르는 문구는 없다 — 봉인(`network.ts`)이 서드파티 소음을 원천에서 막는다.
      if (msg.type() !== 'error') return;
      const where = msg.location().url;
      guard.consoleErrors.push(
        `${msg.page()?.url() ?? '?'} → ${msg.text()}${where ? ` (${where})` : ''}`,
      );
    });
    context.on('weberror', err => {
      guard.pageErrors.push(
        `${err.page()?.url() ?? '?'} → ${err.error().stack ?? err.error().message}`,
      );
    });

    await provide(context);

    expect(guard.pageErrors, '잡히지 않은 예외(pageerror)').toEqual([]);
    expect(
      guard.consoleErrors.filter(
        e => !expectedConsoleErrors.includes(e.replaceAll(baseURL, '')),
      ),
      '콘솔 에러',
    ).toEqual([]);
    expect(guard.unexpectedRequests, '봉인 목록 밖의 외부 요청').toEqual([]);
  },
});

export { expect };
