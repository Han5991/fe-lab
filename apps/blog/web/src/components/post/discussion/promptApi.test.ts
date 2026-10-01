/**
 * 내장 모델 감지 — 한국어 힌트를 먼저 묻고, 안 되면 힌트 없이 다시 묻는다.
 * 어느 쪽으로 열렸는지가 프리뷰에서 확인할 값이라 그 분기를 잠근다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  probeModel,
  readLanguageModel,
  readUsage,
  type Availability,
  type LanguageModelApi,
  type LanguageOptions,
  type ModelSession,
} from './promptApi';

const apiAnswering = (
  answer: (options?: LanguageOptions) => Availability | Promise<Availability>,
): LanguageModelApi => ({
  availability: vi.fn(async (options?: LanguageOptions) => answer(options)),
  create: vi.fn(),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('probeModel', () => {
  test('한국어 힌트로 열리면 그 힌트를 그대로 create()에 넘긴다', async () => {
    const probe = await probeModel(apiAnswering(() => 'available'));

    expect(probe.korean).toBe(true);
    expect(probe.availability).toBe('available');
    expect(probe.languages.expectedOutputs?.[0]?.languages).toEqual(['ko']);
  });

  test('한국어를 지원하지 않으면 힌트 없이 다시 묻는다', async () => {
    const probe = await probeModel(
      apiAnswering(options =>
        options?.expectedInputs ? 'unavailable' : 'downloadable',
      ),
    );

    expect(probe).toEqual({
      availability: 'downloadable',
      languages: {},
      korean: false,
    });
  });

  test('묻다가 던지면 쓸 수 없는 것으로 본다', async () => {
    const probe = await probeModel(
      apiAnswering(() => Promise.reject(new Error('boom'))),
    );

    expect(probe.availability).toBe('unavailable');
  });
});

describe('readLanguageModel', () => {
  test('전역에 없으면 undefined', () => {
    expect(readLanguageModel()).toBeUndefined();
  });

  test('availability·create가 있는 전역만 받는다', () => {
    vi.stubGlobal('LanguageModel', { availability: 1 });
    expect(readLanguageModel()).toBeUndefined();

    const api = apiAnswering(() => 'available');
    vi.stubGlobal('LanguageModel', api);
    expect(readLanguageModel()).toBe(api);
  });
});

describe('readUsage', () => {
  const session = (fields: Partial<ModelSession>): ModelSession => ({
    promptStreaming: vi.fn(),
    destroy: vi.fn(),
    ...fields,
  });

  test('새 이름(contextUsage/contextWindow)을 읽는다', () => {
    expect(
      readUsage(session({ contextUsage: 10, contextWindow: 100 })),
    ).toEqual({ used: 10, total: 100 });
  });

  test('새 이름이 없으면 옛 이름(inputUsage/inputQuota)을 읽는다', () => {
    expect(readUsage(session({ inputUsage: 7, inputQuota: 70 }))).toEqual({
      used: 7,
      total: 70,
    });
  });

  test('둘 다 없으면 null', () => {
    expect(readUsage(session({}))).toBeNull();
  });
});
