/**
 * 자동 레이아웃 — 좌표는 이 시스템에서 가장 조용히 틀리는 부분이라 숫자로 못 박는다.
 *
 * 기준값은 `design/design-reference.html` 의 배포 파이프라인 SVG(`0 0 640 122`)다.
 * 폭은 실측이 아니라 추정이라 레퍼런스와 완전히 같을 수 없지만, 비율(노드 4개가
 * 600px대에 들어가고 caption 포함 높이가 122)은 같아야 한다.
 */
import { describe, expect, test } from 'vitest';

import {
  estimateNodeWidth,
  estimateTextWidth,
  layoutDiagram,
  type DiagramEdgeSpec,
  type DiagramNodeSpec,
} from './layout';

function node(
  id: string,
  title?: string,
  desc?: string,
  overrides: Partial<DiagramNodeSpec> = {},
): DiagramNodeSpec {
  return { id, title, desc, tone: 'gray', shape: 'box', ...overrides };
}

function edge(
  from: string,
  to: string,
  overrides: Partial<DiagramEdgeSpec> = {},
): DiagramEdgeSpec {
  return { from, to, flow: 'sync', emphasis: false, arrow: true, ...overrides };
}

/** 레퍼런스 파이프라인과 같은 4단계. 폭 계산의 기준 픽스처. */
const PIPELINE = [
  node('push', 'git push', 'main 병합'),
  node('actions', 'Actions', 'Docker 빌드'),
  node('ecr', 'ECR', '이미지 푸시'),
  node('ecs', 'ECS 배포', 'blue/green 전환', { tone: 'teal' }),
];

describe('estimateTextWidth', () => {
  test('라틴 문자는 자폭의 0.58배로 센다', () => {
    expect(estimateTextWidth('abc', 10)).toBeCloseTo(17.4);
  });

  test('한글은 정사각(자폭 1배)으로 센다', () => {
    expect(estimateTextWidth('가나', 10)).toBeCloseTo(20);
  });

  test('혼합 문자열은 종류별로 나눠 더한다', () => {
    expect(estimateTextWidth('가a', 10)).toBeCloseTo(15.8);
  });

  test('빈 문자열은 0', () => {
    expect(estimateTextWidth('', 12)).toBe(0);
  });
});

describe('estimateNodeWidth', () => {
  test('제목·부제 중 넓은 쪽 + 좌우 패딩 24px씩', () => {
    // 'main 병합'(11px 기준 53.9)보다 'git push'(12px 기준 55.68)가 넓다.
    expect(estimateNodeWidth({ title: 'git push', desc: 'main 병합' })).toBe(
      104,
    );
    // 반대로 부제가 더 넓은 경우.
    expect(estimateNodeWidth({ title: 'ECR', desc: '이미지 푸시' })).toBe(109);
  });

  test('짧은 텍스트는 최소 폭 88로 올린다', () => {
    expect(estimateNodeWidth({ title: 'A' })).toBe(88);
    expect(estimateNodeWidth({})).toBe(88);
  });

  test('긴 텍스트는 최대 폭 200에서 멈춘다', () => {
    expect(estimateNodeWidth({ title: '아주아주긴제목을계속붙여봅니다' })).toBe(
      200,
    );
  });
});

describe('layoutDiagram — row', () => {
  test('좌→우로 gap 28px씩 띄워 같은 baseline에 세운다', () => {
    const { nodes } = layoutDiagram(PIPELINE, []);

    expect(nodes.map(n => [n.x, n.width])).toEqual([
      [24, 104],
      [156, 115],
      [299, 109],
      [436, 140],
    ]);
    expect(nodes.every(n => n.y === 27 && n.height === 50)).toBe(true);
  });

  test('caption이 있으면 레퍼런스와 같은 122 높이가 나온다', () => {
    const withCaption = layoutDiagram(PIPELINE, [], { hasCaption: true });
    expect(withCaption.viewBox).toBe('0 0 600 122');
    // 콘텐츠 바닥(77) 아래 27px 지점 — 레퍼런스의 caption baseline과 같다.
    expect(withCaption.caption).toEqual({ x: 300, y: 104 });

    const withoutCaption = layoutDiagram(PIPELINE, []);
    expect(withoutCaption.viewBox).toBe('0 0 600 104');
    expect(withoutCaption.caption).toBeUndefined();
  });

  test('엣지를 안 적으면 인접 노드를 순서대로 자동 연결한다', () => {
    const { edges } = layoutDiagram(PIPELINE, []);

    expect(edges).toHaveLength(3);
    // 노드 사이 빈 구간만 잇는다(오른변 → 왼변, 세로 중앙).
    expect(edges.map(e => [e.x1, e.y1, e.x2, e.y2])).toEqual([
      [128, 52, 156, 52],
      [271, 52, 299, 52],
      [408, 52, 436, 52],
    ]);
    expect(edges.every(e => e.flow === 'sync' && !e.emphasis)).toBe(true);
  });

  test('엣지를 하나라도 적으면 명시된 것만 그린다', () => {
    const { edges } = layoutDiagram(PIPELINE, [
      edge('ecr', 'ecs', { emphasis: true, flow: 'async' }),
    ]);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      x1: 408,
      x2: 436,
      emphasis: true,
      flow: 'async',
    });
  });

  test('오른쪽 → 왼쪽 엣지는 방향을 뒤집어 잇는다', () => {
    const { edges } = layoutDiagram(PIPELINE, [edge('actions', 'push')]);
    expect(edges[0]).toMatchObject({ x1: 156, x2: 128 });
  });

  test('없는 id를 가리키는 엣지는 조용히 버린다', () => {
    const { edges } = layoutDiagram(PIPELINE, [
      edge('push', '오타'),
      edge('push', 'push'),
      edge('push', 'actions'),
    ]);
    expect(edges).toHaveLength(1);
  });

  test('노드가 없어도 죽지 않는다', () => {
    const layout = layoutDiagram([], []);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.edges).toHaveLength(0);
  });
});

describe('layoutDiagram — fan', () => {
  const fan = [
    node('src', 'in'),
    node('a', 'A'),
    node('b', 'B'),
    node('c', 'C'),
  ];

  test('첫 노드는 좌측 세로 중앙, 나머지는 우측에 gap 7로 쌓는다', () => {
    const { nodes } = layoutDiagram(fan, [], { direction: 'fan' });

    expect(nodes.map(n => [n.x, n.y])).toEqual([
      [24, 84],
      [140, 27],
      [140, 84],
      [140, 141],
    ]);
    // 갈래 폭은 최대값으로 통일한다 — "같은 층위"라는 뜻이 흐려지지 않게.
    expect(new Set(nodes.slice(1).map(n => n.width)).size).toBe(1);
  });

  test('첫 노드에서 각각으로 엣지를 뻗는다', () => {
    const { edges } = layoutDiagram(fan, [], { direction: 'fan' });

    expect(edges.map(e => [e.x1, e.y1, e.x2, e.y2])).toEqual([
      [112, 109, 140, 52],
      [112, 109, 140, 109],
      [112, 109, 140, 166],
    ]);
  });

  test('노드가 하나뿐이면 row와 같게 떨어진다', () => {
    const single = [node('only', '혼자')];
    expect(layoutDiagram(single, [], { direction: 'fan' }).nodes).toEqual(
      layoutDiagram(single, []).nodes,
    );
  });
});

describe('shape', () => {
  test('box는 rx 8, pill은 height의 절반', () => {
    const { nodes } = layoutDiagram(
      [node('a', 'A'), node('b', 'B', undefined, { shape: 'pill' })],
      [],
    );
    expect(nodes.map(n => n.rx)).toEqual([8, 25]);
  });
});

// 리뷰 지적(medium): 자동 연결을 끄는 기준이 "엣지를 적었다"였다. from/to에 오타가
// 나면 명시 엣지가 전부 버려지는데 자동 연결까지 함께 꺼져서, 노드가 통째로 분리된
// 그림이 경고도 lint 에러도 없이 나갔다.
describe('layoutDiagram — 해석 불가능한 엣지', () => {
  test('엣지 id가 전부 오타면 안 적은 것과 같게 보고 자동 연결한다', () => {
    const { edges } = layoutDiagram(PIPELINE, [
      { from: 'typo', to: 'nope', flow: 'sync', emphasis: false, arrow: true },
    ]);

    expect(edges).toHaveLength(PIPELINE.length - 1);
  });

  test('해석되는 엣지가 하나라도 있으면 그것만 그린다', () => {
    const { edges } = layoutDiagram(PIPELINE, [
      {
        from: PIPELINE[0].id,
        to: PIPELINE[1].id,
        flow: 'sync',
        emphasis: false,
        arrow: true,
      },
      { from: 'typo', to: 'nope', flow: 'sync', emphasis: false, arrow: true },
    ]);

    expect(edges).toHaveLength(1);
  });

  test('자기 자신을 가리키는 엣지만 있으면 자동 연결로 돌아간다', () => {
    const { edges } = layoutDiagram(PIPELINE, [
      {
        from: PIPELINE[0].id,
        to: PIPELINE[0].id,
        flow: 'sync',
        emphasis: false,
        arrow: true,
      },
    ]);

    expect(edges).toHaveLength(PIPELINE.length - 1);
  });
});
