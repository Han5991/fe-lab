import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// vitest 4.1부터 expect()가 반환하는 Assertion은 '@vitest/expect' 모듈에 선언된다
// (vitest는 이를 re-export만 함). 그래서 @testing-library/jest-dom의
// `declare module 'vitest'` 보강(jest-dom/vitest)이 더 이상 매처를 붙이지 못한다.
// 실제 인터페이스가 사는 '@vitest/expect'를 직접 보강해 globals 모드의 expect에도
// jest-dom 매처 타입이 적용되도록 한다.
//
// TestingLibraryMatchers<E, R>: E = 매처가 받는 기대값(인자 위치라 unknown이면 어떤
// 값이든 허용), R = 매처 반환 타입. Assertion<T>는 받은 값 T를 R로 돌려 체이닝을 유지한다.
// 빈 인터페이스 확장은 module augmentation에 구조적으로 필수라 그 규칙만 인라인 비활성화한다.
declare module '@vitest/expect' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T> extends TestingLibraryMatchers<unknown, T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<
    unknown,
    unknown
  > {}
}
