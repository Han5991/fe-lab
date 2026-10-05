/**
 * GoogleChromeLabs/text-fragments-polyfill의 모듈 선언 — 패키지가 타입을 싣지 않는다.
 *
 * **쓰는 만큼만 적는다**(eslint-plugins.d.ts와 같은 원칙). 문장 공유 링크가 여는
 * 것은 선택 범위로 텍스트 조각(`#:~:text=`)을 만드는 생성기 하나뿐이다.
 *
 * 테스트 프로그램(tsconfig.test.json)도 이 파일을 include한다 — 생성기를 지연
 * 로드하는 모듈이 컴포넌트를 거쳐 테스트에 끌려 들어오기 때문이다.
 */
declare module 'text-fragments-polyfill/dist/fragment-generation-utils.js' {
  export interface TextFragment {
    textStart: string;
    textEnd?: string;
    prefix?: string;
    suffix?: string;
  }

  /** SUCCESS 0, INVALID_SELECTION 1, AMBIGUOUS 2, TIMEOUT 3, EXECUTION_FAILED 4 */
  export const GenerateFragmentStatus: {
    readonly SUCCESS: 0;
    readonly INVALID_SELECTION: 1;
    readonly AMBIGUOUS: 2;
    readonly TIMEOUT: 3;
    readonly EXECUTION_FAILED: 4;
  };

  export interface GenerateFragmentResult {
    status: 0 | 1 | 2 | 3 | 4;
    fragment?: TextFragment;
  }

  export function generateFragmentFromRange(
    range: Range,
    startTime?: number,
  ): GenerateFragmentResult;

  export function isValidRangeForFragmentGeneration(range: Range): boolean;

  /** 생성 시간 상한(ms, 기본 500). null이면 상한 없음 — 테스트만 쓴다. */
  export function setTimeout(timeoutMs: number | null): void;
}
