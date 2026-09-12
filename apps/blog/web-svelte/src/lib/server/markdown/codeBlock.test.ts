import { expect, test } from 'vitest';
import { PRISM_LANGUAGES, SUPPORTED_FENCE_LABELS } from '@blog/content';
import { parseCodeMeta } from './codeMeta.ts';
import { renderMarkdown } from './index.ts';

/**
 * 코드 블록 계약.
 *
 * 원고에서 가장 많은 것이다(펜스 500개). 여기서 조용히 깨지면 글의 절반이
 * 회색 덩어리가 되는데, 빌드는 성공하고 `check-seo`도 통과한다.
 */

const render = (md: string) => renderMarkdown(md, 'post');
const fence = (info: string, code: string) =>
  render(['```' + info, code, '```'].join('\n'));

test('구문 강조가 붙는다 — 마크업 모양이 React 판과 같다', () => {
  // 마커 `class="token`은 두 앱의 check-bundle 규칙이 함께 보는 문자열이다.
  const html = fence('typescript', 'const a: number = 1;');
  expect(html).toContain('class="token keyword"');
  expect(html).toContain('language-typescript');
});

test('별칭 fence 라벨도 강조된다', () => {
  // `ts`·`js`·`yml` 같은 별칭은 원고에서 실제로 쓰인다.
  expect(fence('ts', 'const a = 1;')).toContain('class="token');
  expect(fence('js', 'const a = 1;')).toContain('class="token');
  expect(fence('yml', 'a: 1')).toContain('class="token');
});

test('js-extras·jsdoc이 typescript보다 먼저 등록된다', () => {
  // typescript는 javascript 문법을 복제해 만들어지므로 순서가 결과를 바꾼다.
  // 이 확장이 빠지면 `Promise` 같은 타입 이름이 known-class-name 토큰을 잃는다.
  const names = Object.keys(PRISM_LANGUAGES);
  expect(names.indexOf('js-extras')).toBeLessThan(names.indexOf('typescript'));
  expect(names.indexOf('jsdoc')).toBeLessThan(names.indexOf('typescript'));
  expect(fence('typescript', 'const p: Promise<void> = x;')).toContain(
    'class="token',
  );
});

test('평문 라벨은 강조하지 않지만 라벨 자체는 바에 나온다', () => {
  // `text`·`console`은 Prism 언어가 아니라 의도적으로 쓰는 라벨이다.
  // 강조는 붙지 않지만 **라벨은 찍는다** — React 판이 fence 라벨을 그대로
  // 내보내므로, 여기서만 감추면 같은 원고가 두 사이트에서 다르게 보인다.
  const html = fence('text', 'just words');
  expect(html).not.toContain('class="token');
  expect(html).toContain('just words');
  expect(html).toContain('>text<');
});

test('라벨이 없어도 바는 선다 — 복사 버튼이 거기 있다', () => {
  const html = fence('', 'bare');
  expect(html).toContain('data-copy-code');
  expect(html).toContain('aria-label="코드 복사"');
});

test('복사 버튼은 코드 본문을 속성으로 한 번 더 싣지 않는다', () => {
  // 대상은 같은 figure 안의 `pre code`라 DOM에서 읽으면 된다. 속성에 넣으면
  // 펜스 500개짜리 원고에서 HTML이 두 배가 된다.
  const html = fence('ts', 'const secret = 1;');
  expect(html).toContain('<figure');
  const button = /<button[^>]*data-copy-code[^>]*>/.exec(html)?.[0] ?? '';
  expect(button).not.toBe('');
  expect(button).not.toContain('secret');
});

test('모르는 라벨은 throw하지 않고 평문으로 떨어진다', () => {
  // 글 하나의 오타난 fence 라벨로 페이지가 죽는 것이 훨씬 나쁘다.
  const html = fence('브레인퍽', 'x');
  expect(html).toContain('x');
  expect(html).not.toContain('class="token');
});

test('언어 라벨이 상단 바에 나온다', () => {
  expect(fence('bash', 'ls')).toContain('>bash<');
});

test('title= 메타가 언어 라벨을 대신한다', () => {
  // 둘은 한 줄을 나눠 쓰지 않는다 — blog-components 스킬의 계약.
  const html = fence('ts title="lib/foo.ts"', 'const a = 1;');
  expect(html).toContain('lib/foo.ts');
  expect(html).not.toContain('>ts<');
});

test('parseCodeMeta: 따옴표 유무와 모르는 키를 모두 견딘다', () => {
  expect(parseCodeMeta('title="lib/a b.ts" tab=npm')).toStrictEqual({
    title: 'lib/a b.ts',
    tab: 'npm',
  });
  expect(parseCodeMeta("tab='pnpm'")).toStrictEqual({ tab: 'pnpm' });
  // 라인 하이라이트 같은 문법이 나중에 들어와도 걸려 넘어지지 않는다.
  expect(parseCodeMeta('{1,3} showLineNumbers')).toStrictEqual({});
  expect(parseCodeMeta('')).toStrictEqual({});
});

test('mermaid 펜스는 코드 블록으로 굽지 않는다', () => {
  // 다른 렌더러의 몫이다 — 여기서 손대면 그림이 코드로 나간다.
  const html = fence('mermaid', 'graph TD; A-->B;');
  expect(html).not.toContain('language-mermaid"><span');
  expect(html).toContain('graph TD');
});

test('강조된 코드가 원문을 한 글자도 잃지 않는다', () => {
  // 토큰으로 쪼개지므로 눈으로는 확인하기 어렵다. 태그를 걷어내고 대조한다.
  const source = 'const a = { b: "c" }; // 주석\nexport default a;';
  const html = fence('typescript', source);
  const body = /<code class="language-typescript">([\s\S]*?)<\/code>/.exec(
    html,
  )?.[1];
  const text = (body ?? '')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&#x26;', '&')
    .replaceAll('&#x3C;', '<')
    .replaceAll('&#x22;', '"');
  expect(text).toBe(source);
});

test('원고가 쓰는 fence 라벨은 전부 패키지 허용 목록 안에 있다', () => {
  // 목록의 단일 출처는 @blog/content다 — validate-posts가 같은 목록으로
  // 등록되지 않은 라벨을 잡는다. 여기서 따로 들면 "lint는 통과하는데 강조가
  // 안 되는" 조합이 생긴다.
  for (const label of ['typescript', 'ts', 'bash', 'yml', 'text', 'mermaid']) {
    expect(SUPPORTED_FENCE_LABELS.has(label), label).toBe(true);
  }
});
