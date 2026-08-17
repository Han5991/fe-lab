import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import nextConfig from './next.config';

// @testing-library/jest-dom 매처(toBeInTheDocument 등)를 vitest expect에 등록.
import '@testing-library/jest-dom/vitest';

// RTL은 전역 afterEach가 있을 때만 cleanup을 자동 등록한다(globals:false라 수동 연결).
// 테스트 간 마운트된 훅/컴포넌트가 unmount되도록 명시적으로 cleanup을 건다.
afterEach(cleanup);

// next/link는 렌더한 href를 normalizePathTrailingSlash(next/dist/client)에 통과시키고,
// 그 함수는 next.config의 trailingSlash·skipTrailingSlashRedirect를 빌드 시
// DefinePlugin이 심어 준 process.env.__NEXT_TRAILING_SLASH·__NEXT_MANUAL_TRAILING_SLASH로
// 읽는다. 테스트 환경엔 그 치환이 없어 둘 다 undefined → 기본 분기(후행 슬래시 제거)로
// 떨어지고, 그동안 컴포넌트 테스트들이 `.replace(/\/$/, '')`로 이를 우회해 왔다.
// 설정 파일을 그대로 비춰서 테스트의 <Link>가 실제 빌드와 같은 href를 내게 한다 —
// 그래야 "postPath의 후행 슬래시가 HTML까지 살아남는가"를 컴포넌트 테스트가 잠글 수 있다.
process.env.__NEXT_TRAILING_SLASH = nextConfig.trailingSlash ? '1' : '';
process.env.__NEXT_MANUAL_TRAILING_SLASH = nextConfig.skipTrailingSlashRedirect
  ? '1'
  : '';
