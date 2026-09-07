import { expect, test } from 'vitest';
import { renderMarkdown } from './index.ts';

/**
 * `<diagram>` 변환 계약.
 *
 * **좌표는 여기서 검증하지 않는다.** 계산은 `@blog/diagram`의 일이고 그쪽에
 * 테스트 21개가 있다. 여기서 보는 것은 **선언을 어떻게 읽는가**다 — 속성이
 * 스펙으로 옮겨지는가, 오타가 기본값으로 떨어지는가, 접근성 계약이 지켜지는가.
 *
 * 실제 원고 3편이 이 태그를 쓰므로, 산출물 대조로도 확인할 수 있는 드문
 * 태그다(두 빌드의 viewBox·노드 좌표·엣지 선이 픽셀 단위로 같다).
 */

const render = (md: string) => renderMarkdown(md, 'post');

const diagram = (attrs: string, body: string) =>
  render(`<diagram ${attrs}>\n${body}\n</diagram>`);

const NODES = [
  '<diagram-node id="a" title="가" desc="첫 단계"></diagram-node>',
  '<diagram-node id="b" title="나" desc="둘째" tone="accent"></diagram-node>',
].join('\n');

test('노드 선언이 SVG 도형과 글자가 된다', () => {
  const html = diagram('label="흐름"', NODES);
  expect(html).toContain('<svg');
  expect(html).toContain('data-tone="gray"');
  expect(html).toContain('data-tone="accent"');
  expect(html).toContain('가');
  expect(html).toContain('첫 단계');
});

test('label이 있으면 role=img, 없으면 접근성 트리에서 감춘다', () => {
  // `blog-components` 스킬의 계약이다 — label 없는 그림은 장식이다.
  const labeled = diagram('label="배포 파이프라인"', NODES);
  expect(labeled).toContain('role="img"');
  expect(labeled).toContain('aria-label="배포 파이프라인"');
  expect(labeled).not.toContain('aria-hidden');

  const bare = diagram('', NODES);
  expect(bare).toContain('aria-hidden="true"');
  expect(bare).not.toContain('role="img"');
});

test('caption은 SVG 안 텍스트로 들어가고 높이를 넓힌다', () => {
  const withCaption = diagram('label="l" caption="↻ 실패 시 롤백"', NODES);
  const without = diagram('label="l"', NODES);
  expect(withCaption).toContain('↻ 실패 시 롤백');

  const height = (html: string) =>
    Number(/viewBox="0 0 \d+ (\d+)"/.exec(html)?.[1]);
  expect(height(withCaption)).toBeGreaterThan(height(without));
});

test('엣지를 하나라도 쓰면 자동 연결이 꺼진다', () => {
  // 스킬이 "가장 헷갈리는 규칙"으로 적어 둔 것이다. 노드 셋에 엣지 하나만
  // 명시하면 나머지 선은 사라진다.
  const auto = diagram(
    'label="l"',
    [
      '<diagram-node id="a" title="가"></diagram-node>',
      '<diagram-node id="b" title="나"></diagram-node>',
      '<diagram-node id="c" title="다"></diagram-node>',
    ].join('\n'),
  );
  const explicit = diagram(
    'label="l"',
    [
      '<diagram-node id="a" title="가"></diagram-node>',
      '<diagram-node id="b" title="나"></diagram-node>',
      '<diagram-node id="c" title="다"></diagram-node>',
      '<diagram-edge from="a" to="b"></diagram-edge>',
    ].join('\n'),
  );
  const lineCount = (html: string) => (html.match(/<line/g) ?? []).length;
  expect(lineCount(auto)).toBe(2);
  expect(lineCount(explicit)).toBe(1);
});

test('id 오타로 엣지가 전부 버려지면 자동 연결로 되돌아간다', () => {
  // 명시 엣지가 전부 해석 불가일 때 자동 연결까지 꺼지면, 노드가 통째로
  // 분리된 그림이 조용히 나간다. 안 적은 것과 같게 취급한다.
  const html = diagram(
    'label="l"',
    [
      '<diagram-node id="a" title="가"></diagram-node>',
      '<diagram-node id="b" title="나"></diagram-node>',
      '<diagram-edge from="typo" to="also-typo"></diagram-edge>',
    ].join('\n'),
  );
  expect((html.match(/<line/g) ?? []).length).toBe(1);
});

test('emphasis는 값 없는 속성도 참으로 읽는다', () => {
  // raw HTML이라 `emphasis="true"`도 `emphasis`도 온다.
  const quoted = diagram(
    'label="l"',
    `${NODES}\n<diagram-edge from="a" to="b" emphasis="true"></diagram-edge>`,
  );
  const bare = diagram(
    'label="l"',
    `${NODES}\n<diagram-edge from="a" to="b" emphasis></diagram-edge>`,
  );
  expect(quoted).toContain('data-emphasis="true"');
  expect(bare).toContain('data-emphasis="true"');
});

test('async 엣지는 점선이지만 화살촉은 실선이다', () => {
  const html = diagram(
    'label="l"',
    `${NODES}\n<diagram-edge from="a" to="b" flow="async"></diagram-edge>`,
  );
  expect(html).toContain('data-flow="async"');
  // 점선 클래스는 <line>에만 붙는다 — 화살촉까지 끊기면 모양이 뭉개진다.
  const line = /<line[^>]*>/.exec(html)?.[0] ?? '';
  const arrow = /<path[^>]*>/.exec(html)?.[0] ?? '';
  expect(line).toContain('class=');
  expect(arrow).not.toContain('class=');
});

test('arrow="false"면 화살촉을 그리지 않는다', () => {
  const html = diagram(
    'label="l"',
    `${NODES}\n<diagram-edge from="a" to="b" arrow="false"></diagram-edge>`,
  );
  expect(html).not.toContain('<path');
});

test('화살촉은 고정 path를 끝점으로 옮겨 돌린다 — React 판과 같은 모양', () => {
  // 처음에는 삼각함수로 좌표를 직접 풀어 <polyline>을 그렸다. 결과는 그럴듯해
  // 보였지만 두 산출물이 화살촉에서 어긋났고, "같은 그림"이라는 주장이 거기서
  // 깨졌다. 모양과 회전 방식까지 맞춘 것이 계약이다.
  const html = diagram(
    'label="l"',
    `${NODES}\n<diagram-edge from="a" to="b"></diagram-edge>`,
  );
  expect(html).toContain('d="M -4 -2.6 L 0 0 L -4 2.6"');
  expect(html).toMatch(
    /transform="translate\([\d.]+ [\d.]+\) rotate\(-?[\d.]+\)"/,
  );
});

test('스트로크는 그룹에 걸어 선과 화살촉이 색을 함께 받는다', () => {
  // 개별 요소에 걸면 둘이 갈라질 수 있다 — React 판의 sva root 슬롯과 같은 구조.
  const html = diagram(
    'label="l"',
    `${NODES}\n<diagram-edge from="a" to="b" emphasis="true"></diagram-edge>`,
  );
  const group = /<g data-flow[^>]*>/.exec(html)?.[0] ?? '';
  expect(group).toContain('class=');
});

test('모르는 tone·flow·direction은 기본값으로 떨어진다', () => {
  const html = diagram(
    'label="l" direction="나선형"',
    [
      '<diagram-node id="a" title="가" tone="보라"></diagram-node>',
      '<diagram-node id="b" title="나"></diagram-node>',
      '<diagram-edge from="a" to="b" flow="텔레파시"></diagram-edge>',
    ].join('\n'),
  );
  expect(html).toContain('data-tone="gray"');
  expect(html).toContain('data-flow="sync"');
});

test('옛 tone="teal"은 accent 별칭으로 받아준다', () => {
  // 포인트색을 틸에서 cyan으로 바꾸기 전 이름이다. 옛 원고가 깨지면 안 된다.
  const html = diagram(
    'label="l"',
    '<diagram-node id="a" title="가" tone="teal"></diagram-node>',
  );
  expect(html).toContain('data-tone="accent"');
});

test('노드가 없으면 자리를 비우지 않고 왜 안 나왔는지 남긴다', () => {
  const html = diagram('label="l"', '');
  expect(html).toContain('diagram-node');
});
