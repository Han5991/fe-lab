import { Http } from '@package/core';

// 같은 출처로 — 박아 두면 Vite가 다른 포트로 뜰 때 교차 출처가 되어 MSW가 못 가로챈다
export const instance = new Http(window.location.origin);
