import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// @testing-library/jest-dom 매처(toBeInTheDocument 등)를 vitest expect에 등록.
import '@testing-library/jest-dom/vitest';

// RTL은 전역 afterEach가 있을 때만 cleanup을 자동 등록한다(globals:false라 수동 연결).
// 테스트 간 마운트된 훅/컴포넌트가 unmount되도록 명시적으로 cleanup을 건다.
afterEach(cleanup);
