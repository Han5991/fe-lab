import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// vitest 4.1부터 expect()가 반환하는 Assertion은 '@vitest/expect' 모듈에 선언된다
// (vitest는 이를 re-export만 함). 그래서 @testing-library/jest-dom의
// `declare module 'vitest'` 보강(jest-dom/vitest)이 더 이상 매처를 붙이지 못한다.
// 실제 인터페이스가 사는 '@vitest/expect'를 직접 보강해 globals 모드의 expect에도
// jest-dom 매처 타입이 적용되도록 한다.
declare module '@vitest/expect' {
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<
    any,
    any
  > {}
}
