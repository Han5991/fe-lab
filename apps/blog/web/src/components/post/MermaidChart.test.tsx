/**
 * mermaid.initialize에 넘기는 설정 중 **라이브러리 기본값에 맡기면 안 되는 축**을 잠근다.
 *
 * mermaid 12는 look 기본을 'neo'(노드에 drop-shadow 필터)로, layout 기본을 ELK로
 * 바꿨다. 렌더는 어느 쪽이든 성공하므로 CI는 초록이고, 발행한 도표만 그림자가
 * 붙고 재배치된다(#431). 다음 메이저 업그레이드에서 기본값이 또 움직여도 조용히
 * 지나가지 않도록, 값을 명시해 넘기는지를 호출 인자로 확인한다.
 *
 * 테마가 바뀌면 effect가 initialize를 다시 부르므로(전역 config 캐시) 두 테마를 다 본다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MermaidChart } from './MermaidChart';

// 실제 패키지(raw 1.1MB)는 로드하지 않는다. 여기서 보는 건 컴포넌트가
// initialize에 무엇을 넘기는지뿐이라 호출만 기록한다.
const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(() => Promise.resolve({ svg: '<svg></svg>' })),
}));
vi.mock('mermaid', () => ({ default: mermaid }));

beforeEach(() => {
  mermaid.initialize.mockClear();
  mermaid.render.mockClear();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe.each(['light', 'dark'] as const)('MermaidChart (%s)', theme => {
  test('look·layout을 mermaid 기본값에 맡기지 않는다', async () => {
    document.documentElement.dataset['theme'] = theme;
    render(<MermaidChart chart="flowchart LR; A --> B" />);

    await waitFor(() => expect(mermaid.render).toHaveBeenCalled());
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ look: 'classic', layout: 'dagre' }),
    );
  });
});
