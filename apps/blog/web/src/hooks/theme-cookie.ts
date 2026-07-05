// FOUC 방지 인라인 스크립트(app/layout.tsx)와 useTheme의 readCookie()가 공유하는
// 테마 쿠키 단일 소스. 정규식을 한 곳에 두어 한쪽만 바뀌어 초기 테마가 어긋나는
// (= 막으려던 FOUC 재발) 위험을 없앤다. 인라인 스크립트는 pre-hydration이라 이
// 모듈을 import하진 못하지만, layout.tsx(서버 컴포넌트)가 빌드 시 이 소스 문자열을
// 스크립트에 주입하므로 실질적으로 단일 소스가 된다. ('use client' 없는 순수
// 모듈이라 서버/클라 양쪽에서 import 가능.)
export const THEME_COOKIE = 'theme';

// `new RegExp(THEME_COOKIE_MATCH)` 로 사용. (dark|light) 캡처 그룹 포함.
export const THEME_COOKIE_MATCH = '(?:^|;\\s*)theme=(dark|light)';
