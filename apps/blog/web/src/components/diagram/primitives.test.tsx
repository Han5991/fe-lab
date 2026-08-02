/**
 * 다이어그램 프리미티브 — 핸드오프 §4 문법이 코드로 강제되는지 확인한다.
 *
 * 색은 Panda 토큰 클래스로 나가므로 여기서 검증할 수 없다(생성된 CSS가 없는 환경).
 * 대신 **문법이 갈리는 지점**(회색/틸, 실선/점선, 장식/의미)을 DOM으로 확인한다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  DeployPipeline,
  DiagramEdge,
  DiagramFrame,
  DiagramLabel,
  DiagramNode,
  ParallelThumb,
} from './index';

describe('DiagramFrame', () => {
  test('label이 있으면 의미 있는 이미지로 노출한다', () => {
    render(
      <DiagramFrame viewBox="0 0 10 10" label="배포 파이프라인">
        <g />
      </DiagramFrame>,
    );
    expect(
      screen.getByRole('img', { name: '배포 파이프라인' }),
    ).toHaveAttribute('viewBox', '0 0 10 10');
  });

  test('label이 없으면 장식으로 보고 접근성 트리에서 감춘다', () => {
    const { container } = render(
      <DiagramFrame viewBox="0 0 10 10">
        <g />
      </DiagramFrame>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });
});

describe('DiagramNode', () => {
  test('기본 라운드는 rx=8이고 tone은 회색이다', () => {
    const { container } = render(
      <svg>
        <DiagramNode x={0} y={0} width={100} height={50} />
      </svg>,
    );
    const rect = container.querySelector('rect');
    expect(rect).toHaveAttribute('rx', '8');
    expect(rect).toHaveAttribute('data-tone', 'gray');
  });

  test('tone="accent"로 핵심 노드를 구분한다', () => {
    const { container } = render(
      <svg>
        <DiagramNode x={0} y={0} width={100} height={50} tone="accent" />
      </svg>,
    );
    expect(container.querySelector('rect')).toHaveAttribute(
      'data-tone',
      'accent',
    );
  });

  test('제목과 부제를 노드 중앙 기준으로 나눠 배치한다', () => {
    const { container } = render(
      <svg>
        <DiagramNode
          x={24}
          y={27}
          width={108}
          height={50}
          title="git push"
          subtitle="main 병합"
        />
      </svg>,
    );

    const texts = Array.from(container.querySelectorAll('text'));
    expect(texts.map(t => t.textContent)).toEqual(['git push', 'main 병합']);
    // 레퍼런스 SVG 좌표(제목 y=49, 부제 y=66)와 일치해야 한다.
    expect(texts[0]).toHaveAttribute('x', '78');
    expect(texts[0]).toHaveAttribute('y', '49');
    expect(texts[1]).toHaveAttribute('y', '66');
  });

  test('제목만 있으면 세로 중앙에 한 줄로 놓는다', () => {
    const { container } = render(
      <svg>
        <DiagramNode x={0} y={0} width={100} height={50} title="ECR" />
      </svg>,
    );
    const texts = container.querySelectorAll('text');
    expect(texts).toHaveLength(1);
    expect(texts[0]).toHaveAttribute('y', '29');
  });
});

describe('DiagramEdge', () => {
  test('기본은 동기 실선 + 화살촉', () => {
    const { container } = render(
      <svg>
        <DiagramEdge x1={0} y1={0} x2={10} y2={0} />
      </svg>,
    );

    expect(container.querySelector('g')).toHaveAttribute('data-flow', 'sync');
    expect(container.querySelector('line')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  test('flow="async"는 비동기/데이터 흐름으로 표시한다', () => {
    const { container } = render(
      <svg>
        <DiagramEdge x1={0} y1={0} x2={10} y2={0} flow="async" />
      </svg>,
    );
    expect(container.querySelector('g')).toHaveAttribute('data-flow', 'async');
  });

  test('emphasis는 핵심 경로 표시로 갈린다', () => {
    const { container } = render(
      <svg>
        <DiagramEdge x1={0} y1={0} x2={10} y2={0} emphasis />
      </svg>,
    );
    expect(container.querySelector('g')).toHaveAttribute(
      'data-emphasis',
      'true',
    );
  });

  test('arrow={false}면 화살촉을 그리지 않는다', () => {
    const { container } = render(
      <svg>
        <DiagramEdge x1={0} y1={0} x2={10} y2={0} arrow={false} />
      </svg>,
    );
    expect(container.querySelector('path')).toBeNull();
  });

  test('화살촉은 선 끝에서 진행 방향으로 회전한다', () => {
    const { container } = render(
      <svg>
        <DiagramEdge x1={0} y1={0} x2={0} y2={20} />
      </svg>,
    );
    // 아래로 향하는 선이므로 90도. marker/context-stroke 없이 좌표로만 계산한다.
    expect(container.querySelector('path')).toHaveAttribute(
      'transform',
      'translate(0 20) rotate(90)',
    );
  });
});

describe('DiagramLabel', () => {
  test('좌표와 정렬을 그대로 전달한다', () => {
    const { container } = render(
      <svg>
        <DiagramLabel x={530} y={104}>
          ↻ 실패 시 자동 롤백
        </DiagramLabel>
      </svg>,
    );
    const text = container.querySelector('text');
    expect(text).toHaveTextContent('↻ 실패 시 자동 롤백');
    expect(text).toHaveAttribute('text-anchor', 'middle');
  });
});

describe('구체 다이어그램', () => {
  // label 없이 쓰이는 자리가 "썸네일 없는 글의 폴백"이라, 예전 기본 label은
  // 어떤 글이 와도 같은 설명을 낭독했다. 이제는 장식이 기본이다.
  test('ParallelThumb는 label이 없으면 장식으로 감춘다', () => {
    const { container } = render(<ParallelThumb />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 150 92');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  test('ParallelThumb는 label을 주면 의미 있는 이미지로 노출한다', () => {
    render(<ParallelThumb label="병렬 처리 구조" />);
    expect(
      screen.getByRole('img', { name: '병렬 처리 구조' }),
    ).toBeInTheDocument();
  });

  test('DeployPipeline은 마지막 구간만 핵심 경로로 강조한다', () => {
    const { container } = render(<DeployPipeline />);

    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 640 122',
    );
    const emphasis = Array.from(
      container.querySelectorAll('[data-emphasis]'),
    ).map(el => el.getAttribute('data-emphasis'));
    expect(emphasis).toEqual(['false', 'false', 'true']);
  });

  test('DeployPipeline은 파이프라인 단계와 롤백 캡션을 모두 그린다', () => {
    const { container } = render(<DeployPipeline />);
    const texts = Array.from(container.querySelectorAll('text')).map(
      t => t.textContent,
    );

    expect(texts).toContain('git push');
    expect(texts).toContain('Actions');
    expect(texts).toContain('ECR');
    expect(texts).toContain('ECS 배포');
    expect(texts).toContain('↻ 실패 시 자동 롤백');
  });
});
