import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { THEME_COOKIE_MATCH, readThemeCookie } from '../shared/theme.ts';

/**
 * pre-paint 인라인 스크립트와 모듈이 **같은 쿠키 규칙**을 쓰는지 잠근다.
 *
 * 스크립트는 hydration 전에 돌아야 해서 모듈을 import할 수 없다. 그래서 정규식이
 * 두 곳에 있고, 한쪽만 바뀌면 초기 테마가 어긋난다 — 그게 정확히 이 스크립트가
 * 막으려던 FOUC다. React 판은 서버 컴포넌트가 빌드 시 문자열을 주입해 이 문제를
 * 없앴지만, 여기서는 `app.html`이 정적 파일이라 그럴 수 없다. 대신 대조한다.
 */

const appHtml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../app.html'),
  'utf8',
);

test('app.html의 인라인 스크립트가 모듈과 같은 쿠키 정규식을 쓴다', () => {
  // 스크립트 안에서는 JS 문자열 리터럴이라 백슬래시가 한 번 더 이스케이프된다.
  const inScript = THEME_COOKIE_MATCH.replaceAll('\\', '\\\\');
  expect(appHtml).toContain(inScript);
});

test('app.html이 쿠키 → 시스템 설정 → dark 순으로 떨어진다', () => {
  expect(appHtml).toContain('prefers-color-scheme: dark');
  // 실패해도 화면이 안 뜨면 안 된다 — catch가 있어야 한다.
  expect(appHtml).toMatch(/catch[\s\S]*dataset\.theme = 'dark'/);
});

test('readThemeCookie: 명시 선택만 읽고 나머지는 undefined다', () => {
  // undefined는 "선택 안 함"이고, 그때는 시스템 설정을 따른다.
  expect(readThemeCookie('theme=dark')).toBe('dark');
  expect(readThemeCookie('a=1; theme=light; b=2')).toBe('light');
  expect(readThemeCookie('themex=dark')).toBeUndefined();
  expect(readThemeCookie('theme=purple')).toBeUndefined();
  expect(readThemeCookie('')).toBeUndefined();
});
