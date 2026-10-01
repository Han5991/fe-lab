/**
 * 브라우저 내장 언어 모델(Prompt API — Chrome의 Gemini Nano, Edge의 Phi-4-mini)을
 * 이 기능이 쓰는 만큼만 적은 구조 타입과 감지.
 *
 * 타입 패키지(`@types/dom-chromium-ai`)를 들이지 않는다. 쓰는 면이 몇 개뿐이고,
 * API가 막 정식이 돼 이름이 바뀌는 중이라(`inputQuota` → `contextWindow`) 두
 * 이름을 함께 받는 일을 이 파일 한 곳에 두는 편이 낫다. 화면은 이 인터페이스만
 * 알고, 테스트는 같은 모양의 가짜를 주입한다.
 */

export type Availability =
  'unavailable' | 'downloadable' | 'downloading' | 'available';

interface ExpectedText {
  type: 'text';
  languages?: string[];
}

export interface LanguageOptions {
  expectedInputs?: ExpectedText[];
  expectedOutputs?: ExpectedText[];
}

export interface DownloadMonitor {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: { loaded: number }) => void,
  ): void;
}

export interface InitialPrompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CreateOptions extends LanguageOptions {
  initialPrompts?: InitialPrompt[];
  monitor?: (monitor: DownloadMonitor) => void;
  signal?: AbortSignal;
}

export interface ModelSession {
  promptStreaming(
    input: string,
    options?: { signal?: AbortSignal },
  ): ReadableStream<string>;
  destroy(): void;
  readonly contextUsage?: number;
  readonly contextWindow?: number;
  /** Chrome 148 이전 이름 — 같은 값이다. */
  readonly inputUsage?: number;
  readonly inputQuota?: number;
}

export interface LanguageModelApi {
  availability(options?: LanguageOptions): Promise<Availability>;
  create(options?: CreateOptions): Promise<ModelSession>;
}

function isLanguageModelApi(value: unknown): value is LanguageModelApi {
  return (
    (typeof value === 'function' || typeof value === 'object') &&
    value !== null &&
    'availability' in value &&
    typeof value.availability === 'function' &&
    'create' in value &&
    typeof value.create === 'function'
  );
}

/** 전역 `LanguageModel`. 없으면(모바일·Safari·Firefox, 서버) undefined. */
export function readLanguageModel(): LanguageModelApi | undefined {
  const value: unknown = Reflect.get(globalThis, 'LanguageModel');
  return isLanguageModelApi(value) ? value : undefined;
}

const KOREAN: LanguageOptions = {
  expectedInputs: [{ type: 'text', languages: ['ko'] }],
  expectedOutputs: [{ type: 'text', languages: ['ko'] }],
};

export interface ModelProbe {
  availability: Availability;
  /** `create()`에 그대로 넘길 언어 힌트. */
  languages: LanguageOptions;
  /** 한국어 힌트로 열 수 있는가. 아니면 힌트 없이 연다(한국어 품질 미보장). */
  korean: boolean;
}

const UNAVAILABLE: ModelProbe = {
  availability: 'unavailable',
  languages: {},
  korean: false,
};

/**
 * 모델을 쓸 수 있는지 본다. 한국어 힌트를 먼저 묻고, 그 언어를 지원하지 않는
 * 빌드면 힌트 없이 다시 묻는다 — 한국어가 최적화 언어(영·스·일) 밖이라 둘 중
 * 어느 쪽으로 열리는지가 프리뷰에서 확인할 것 중 하나다.
 */
export async function probeModel(api: LanguageModelApi): Promise<ModelProbe> {
  try {
    const ko = await api.availability(KOREAN);
    if (ko !== 'unavailable') {
      return { availability: ko, languages: KOREAN, korean: true };
    }
    const any = await api.availability();
    return { availability: any, languages: {}, korean: false };
  } catch {
    return UNAVAILABLE;
  }
}

export interface ContextUsage {
  used: number;
  total: number;
}

/** 세션의 컨텍스트 사용량 — 새 이름이 없으면 옛 이름을 읽는다. */
export function readUsage(session: ModelSession): ContextUsage | null {
  const used = session.contextUsage ?? session.inputUsage;
  const total = session.contextWindow ?? session.inputQuota;
  return used !== undefined && total !== undefined ? { used, total } : null;
}
