import { Http } from '@package/core';

// 페이지와 같은 출처로 요청한다. 출처를 박아 두면 Vite가 5173 대신 5174로 뜰 때 요청이
// 교차 출처가 되고, 상대 경로로 등록한 MSW 핸들러가 가로채지 못한다.
export const instance = new Http(window.location.origin);
