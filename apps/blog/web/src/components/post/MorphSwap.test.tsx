/**
 * 글리프 교차 — 두 면은 늘 DOM에 있고 `on`은 루트의 `data-on` 하나로만 드러난다(교차 자체는 CSS의
 * 전환이라 jsdom이 재지 못한다 — 렌더 결과와 접근성 계약만 본다).
 */
import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';
import { MorphSwap } from './MorphSwap';

const swap = (on: boolean) => (
  <MorphSwap on={on} before={<i>앞</i>} after={<i>뒤</i>} />
);

describe('MorphSwap', () => {
  test('두 면을 모두 그리고, on이 아니면 루트에 data-on이 없다', () => {
    const { container, getByText } = render(swap(false));

    expect(getByText('앞')).toBeInTheDocument();
    expect(getByText('뒤')).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute('data-on');
  });

  test('on이면 루트의 data-on 하나만 켜진다(면을 지우거나 새로 만들지 않는다)', () => {
    const { container, getByText, rerender } = render(swap(false));
    const before = getByText('앞');
    const after = getByText('뒤');

    rerender(swap(true));

    expect(container.firstElementChild).toHaveAttribute('data-on');
    // 같은 노드가 남아야 CSS 전환이 현재 값에서 이어진다(리마운트면 매번 처음부터 돈다).
    expect(getByText('앞')).toBe(before);
    expect(getByText('뒤')).toBe(after);
  });

  test('장식이라 접근성 트리에서 뺀다', () => {
    const { container } = render(swap(true));

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
