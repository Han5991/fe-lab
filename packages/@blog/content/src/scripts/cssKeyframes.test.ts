import { expect, test } from 'vitest';
import { checkKeyframes, collectKeyframeUsage } from './cssKeyframes.ts';

/** 실제 블로그 out/ CSS와 같은 모양(Next가 줄인 Panda 출력) */
const PANDA_CSS = [
  '@layer tokens{:where(:root,:host){--animations-spin:spin 1s linear infinite;',
  '--animations-pulse:pulse 2s cubic-bezier(.4,0,.6,1) infinite;--durations-fast:.15s}',
  '@keyframes pulse{50%{opacity:.5}}@keyframes reading-progress-fill{to{transform:scaleX(1)}}}',
  '@layer utilities{.anim_pulse{animation:var(--animations-pulse)}',
  '.anim-n_reading-progress-fill{animation-name:reading-progress-fill}',
  '.\\[\\@supports_not_\\(animation-timeline\\:_scroll\\(\\)\\)\\]\\:d_none{display:none}',
  '.anim_none{animation:none}.anim-dur{animation-duration:.26s}',
  '@supports not (animation-timeline:scroll()){.x{animation:none}}}',
].join('');

const sorted = (set: ReadonlySet<string>) => [...set].sort();

test('collectKeyframeUsage: Panda 출력에서 정의와 부르는 이름을 가른다 — 아무도 안 부르는 변수의 이름은 세지 않는다', () => {
  const usage = collectKeyframeUsage(PANDA_CSS);
  expect(sorted(usage.defined)).toEqual(['pulse', 'reading-progress-fill']);
  // spin은 --animations-spin에만 있고 그 변수를 부르는 선언이 없다.
  expect(sorted(usage.referenced)).toEqual(['pulse', 'reading-progress-fill']);
});

test('collectKeyframeUsage: 단축 속성 목록에서 시간·키워드·함수를 빼고 이름만 뽑는다', () => {
  const usage = collectKeyframeUsage(
    '.a{animation:fade-in .2s cubic-bezier(.4,0,.6,1) infinite both,slide 1s steps(4,jump-end) alternate paused!important}' +
      // 줄이지 않은 CSS — 함수 인자의 키워드가 따로 떨어져도 이름이 아니다.
      '.b{animation: blink 1s steps( 2 , start ) }' +
      // 접두사 선언도 부른다 — 정의(`@-webkit-keyframes`)와 대칭.
      '.c{-webkit-animation-name:wobble}',
  );
  expect(sorted(usage.referenced)).toEqual([
    'blink',
    'fade-in',
    'slide',
    'wobble',
  ]);
});

test('collectKeyframeUsage: var()는 정의 전부·폴백·중첩까지 풀고, 순환해도 멈춘다', () => {
  const usage = collectKeyframeUsage(
    [
      ':root{--a:var(--b);--b:slide 1s}',
      '[data-theme=dark]{--b:glow 2s}',
      ':root{--loop:var(--loop)}',
      '.x{animation:var(--a)}',
      '.y{animation:var(--undefined, fade 1s ease-in)}',
      '.z{animation:var(--loop)}',
    ].join(''),
  );
  expect(sorted(usage.referenced)).toEqual(['fade', 'glow', 'slide']);
});

test('collectKeyframeUsage: 주석·따옴표 이름·중첩 블록 뒤 선언', () => {
  const usage = collectKeyframeUsage(
    '/* .g{animation:ghost 1s} */@keyframes "quoted"{to{opacity:0}}.a{&:hover{color:red}animation-name:"quoted"}',
  );
  expect(sorted(usage.defined)).toEqual(['quoted']);
  expect(sorted(usage.referenced)).toEqual(['quoted']);
});

const page = (...sheets: string[]) =>
  `<!doctype html><html><head>${sheets
    .map(s => `<link rel="stylesheet" href="/_next/static/css/${s}">`)
    .join('')}</head><body></body></html>`;

const reader =
  (files: Record<string, string>) =>
  (ref: string): string | null =>
    files[ref.replace('/_next/static/css/', '')] ?? null;

test('checkKeyframes: 정의가 없는 이름을 페이지와 함께 보고한다', () => {
  const report = checkKeyframes(
    new Map([
      ['/', page('ok.css')],
      ['/admin/', page('broken.css')],
    ]),
    reader({
      'ok.css': PANDA_CSS,
      // optimize가 pulse를 지운 모양 — 변수와 선언은 남았다.
      'broken.css': PANDA_CSS.replace('@keyframes pulse{50%{opacity:.5}}', ''),
    }),
  );
  expect(report.violations).toHaveLength(1);
  expect(report.violations[0]?.rule).toBe('keyframes-missing');
  expect(report.violations[0]?.message).toContain("'pulse'");
  expect(report.violations[0]?.message).toContain('/admin/');
  expect(report.referenced).toBe(2);
});

test('checkKeyframes: 페이지가 내려받는 CSS 전부를 한 덩어리로 본다 — 정의가 다른 파일에 있어도 함께 받으면 통과', () => {
  const files = reader({
    'use.css': '.a{animation:spin 1s}',
    'def.css': '@keyframes spin{to{transform:rotate(1turn)}}',
  });
  expect(
    checkKeyframes(new Map([['/', page('use.css', 'def.css')]]), files)
      .violations,
  ).toEqual([]);
  expect(
    checkKeyframes(new Map([['/', page('use.css')]]), files).violations.map(
      v => v.rule,
    ),
  ).toEqual(['keyframes-missing']);
});

test('checkKeyframes: 정의됐는데 아무도 부르지 않는 keyframes는 keyframes-unreferenced — 파서가 한 부르는 형태만 놓쳐도 잡는다', () => {
  const report = checkKeyframes(
    new Map([['/', page('part.css')]]),
    reader({
      // reading-progress-fill은 직접 선언으로 보이지만, pulse를 부르는 형태(예: var() 경유)를
      // 파서가 놓쳤다고 가정한 산출물 — 정의만 보인다.
      'part.css':
        '@keyframes pulse{50%{opacity:.5}}@keyframes reading-progress-fill{to{transform:scaleX(1)}}' +
        '.p{animation-name:reading-progress-fill}',
    }),
  );
  expect(report.violations.map(v => v.rule)).toEqual([
    'keyframes-unreferenced',
  ]);
  expect(report.violations[0]?.message).toContain('pulse');
  expect(report.violations[0]?.message).not.toContain('reading-progress-fill');
});

test('checkKeyframes: 페이지가 부르는 CSS를 못 읽으면 keyframes-unread — 전부 못 읽어 빈 CSS로 통과하는 길을 막는다', () => {
  const files = reader({ 'ok.css': PANDA_CSS });
  const partly = checkKeyframes(
    new Map([['/', page('ok.css', 'gone.css')]]),
    files,
  );
  expect(partly.violations.map(v => v.rule)).toEqual(['keyframes-unread']);
  expect(partly.violations[0]?.message).toContain('gone.css');
  expect(
    checkKeyframes(new Map([['/', page('gone.css')]]), files).violations.map(
      v => v.rule,
    ),
  ).toEqual(['keyframes-unread']);
});

test('checkKeyframes: keyframes도 애니메이션도 없는 사이트는 볼 것이 없어 통과한다', () => {
  const report = checkKeyframes(
    new Map([['/', page('plain.css')]]),
    reader({ 'plain.css': '.a{color:red}' }),
  );
  expect(report).toEqual({ violations: [], referenced: 0 });
});
