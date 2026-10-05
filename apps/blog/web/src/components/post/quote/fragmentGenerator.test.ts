/**
 * 실제 생성기(text-fragments-polyfill)를 jsdom에서 돌린다 — 같은 문장이 위에
 * 또 있으면 앞뒤 문맥을 붙여 **선택한 쪽**을 가리켜야 한다. 이게 라이브러리를
 * 쓰는 이유라 대표 사례 하나를 잠근다(브라우저가 실제로 그 문장으로 가는지는
 * 빌드 산출물을 Chromium으로 열어 확인했다).
 */
import { setTimeout as setGenerationTimeout } from 'text-fragments-polyfill/dist/fragment-generation-utils.js';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { loadFragmentGenerator } from './fragmentGenerator';

// 라이브러리는 생성에 500ms 상한을 두고 넘으면 TIMEOUT을 낸다 — 바쁜 러너에서 이 테스트가
// 조각 대신 null을 받아 흔들렸다. 판정 규칙을 보는 테스트라 시간 상한은 끈다.
beforeAll(() => setGenerationTimeout(null));

afterEach(() => {
  document.body.innerHTML = '';
});

const rangeOver = (node: Node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range;
};

describe('loadFragmentGenerator', () => {
  test('유일한 문장은 그 문장만으로 조각을 만든다', async () => {
    document.body.innerHTML = `
      <p>로컬 테스트 시간은 오히려 늘었다.</p>
      <p id="target">CI에서는 매 실행 25초씩 줄었다.</p>
    `;
    const generate = await loadFragmentGenerator();
    const target = document.getElementById('target');

    const fragment = target && generate(rangeOver(target));

    expect(fragment?.textStart).toContain('25초씩');
    expect(fragment?.prefix).toBeUndefined();
  });

  test('같은 문장이 위에 또 있으면 문맥을 붙여 선택한 쪽을 가리킨다', async () => {
    document.body.innerHTML = `
      <p>첫 실험: 숫자가 반대로 나왔다. 그래서 다시 쟀다.</p>
      <p>둘째 실험: <span id="target">숫자가 반대로 나왔다.</span> 이번엔 원인을 찾았다.</p>
    `;
    const generate = await loadFragmentGenerator();
    const target = document.getElementById('target');

    const fragment = target && generate(rangeOver(target));

    expect(fragment?.textStart).toContain('숫자가 반대로');
    // 첫 문단과 갈라 주는 문맥이 붙는다.
    expect(Boolean(fragment?.prefix ?? fragment?.suffix)).toBe(true);
  });

  test('한글은 자모로 쪼개지 않고 완성형(NFC)으로 싣는다', async () => {
    document.body.innerHTML = `<p id="target">CI에서는 매 실행 25초씩 줄었다.</p>`;
    const generate = await loadFragmentGenerator();
    const target = document.getElementById('target');

    const textStart = (target && generate(rangeOver(target)))?.textStart ?? '';

    // 라이브러리는 비교용으로 NFKD 분해한 글자를 돌려준다 — 되돌리지 않으면
    // 길이가 두 배가 되고 '25초씩'이 들어 있지 않다(자모 열이라서).
    expect(textStart).toBe(textStart.normalize('NFC'));
    expect(textStart).toBe('ci에서는 매 실행 25초씩 줄었다.');
  });

  test('구두점·공백뿐인 선택은 조각을 만들지 않는다', async () => {
    document.body.innerHTML = `<p>문장. <span id="target"> ... </span></p>`;
    const generate = await loadFragmentGenerator();
    const target = document.getElementById('target');

    expect(target && generate(rangeOver(target))).toBeNull();
  });
});
