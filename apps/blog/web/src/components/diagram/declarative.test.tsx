/**
 * 선언형 다이어그램 — 마크다운에서 온 **문자열 prop**과 **지저분한 children**을
 * 견디는지 본다.
 *
 * 좌표 계산 자체는 `layout.test.ts`가 숫자로 검증하므로, 여기서는 파싱과 렌더의
 * 접합부(잘못된 값 폴백, 공백 노드, 미등록 이름, 실제 마크다운 왕복)만 확인한다.
 */
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';

import { Diagram, DiagramEdgeTag, DiagramNodeTag } from './declarative';

const rects = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('rect'));
const lines = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('line'));

describe('Diagram — 접근성', () => {
  test('label이 있으면 의미 있는 이미지로 노출한다', () => {
    render(
      <Diagram label="배포 파이프라인">
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
      </Diagram>,
    );
    expect(screen.getByRole('img', { name: '배포 파이프라인' })).toBeVisible();
  });

  test('label이 없으면 장식으로 보고 접근성 트리에서 감춘다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" />
      </Diagram>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden');
  });

  test('노드가 하나도 없으면 빈 프레임 대신 아무것도 그리지 않는다', () => {
    const { container } = render(<Diagram label="빈 그림" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Diagram — 문자열 prop 파싱', () => {
  test('tone="teal"만 핵심 경로로 받고 알 수 없는 값은 gray로 떨어진다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" tone="teal" />
        <DiagramNodeTag id="b" title="B" tone="rainbow" />
        <DiagramNodeTag id="c" title="C" />
      </Diagram>,
    );
    expect(rects(container).map(r => r.getAttribute('data-tone'))).toEqual([
      'teal',
      'gray',
      'gray',
    ]);
  });

  test('shape="pill"은 rx를 높이의 절반으로 바꾼다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" shape="pill" />
        <DiagramNodeTag id="b" title="B" shape="hexagon" />
      </Diagram>,
    );
    expect(rects(container).map(r => r.getAttribute('rx'))).toEqual([
      '25',
      '8',
    ]);
  });

  test('emphasis는 "true" 문자열과 빈 속성 모두 강조로 읽는다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
        <DiagramNodeTag id="c" title="C" />
        <DiagramEdgeTag from="a" to="b" emphasis="true" />
        <DiagramEdgeTag from="b" to="c" emphasis="" />
      </Diagram>,
    );
    expect(
      Array.from(container.querySelectorAll('[data-emphasis]')).map(el =>
        el.getAttribute('data-emphasis'),
      ),
    ).toEqual(['true', 'true']);
  });

  test('뜻을 알 수 없는 emphasis 값은 강조하지 않는다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
        <DiagramEdgeTag from="a" to="b" emphasis="아마도" />
      </Diagram>,
    );
    expect(container.querySelector('[data-emphasis]')).toHaveAttribute(
      'data-emphasis',
      'false',
    );
  });

  test('flow="async"는 점선(비동기)으로 갈린다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
        <DiagramEdgeTag from="a" to="b" flow="async" />
      </Diagram>,
    );
    expect(container.querySelector('[data-flow]')).toHaveAttribute(
      'data-flow',
      'async',
    );
  });

  test('arrow="false"면 화살촉을 그리지 않는다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
        <DiagramEdgeTag from="a" to="b" arrow="false" />
      </Diagram>,
    );
    expect(container.querySelector('path')).toBeNull();
  });

  test('from/to가 빠진 엣지는 버리고 자동 연결로 되돌아간다', () => {
    const { container } = render(
      <Diagram>
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
        <DiagramEdgeTag from="a" />
      </Diagram>,
    );
    // 유효한 명시 엣지가 0개면 "명시가 있었다"로 치지 않는다.
    expect(lines(container)).toHaveLength(1);
  });
});

describe('Diagram — 지저분한 children', () => {
  test('공백 텍스트 노드와 <p> 래퍼가 섞여도 노드 수가 맞는다', () => {
    const { container } = render(
      <Diagram label="혼합">
        {'\n  '}
        <DiagramNodeTag id="a" title="A" />
        {'\n  '}
        <p>
          <DiagramNodeTag id="b" title="B" />
          {'\n'}
          <DiagramEdgeTag from="a" to="b" emphasis="true" />
        </p>
        {'\n'}
      </Diagram>,
    );

    expect(rects(container)).toHaveLength(2);
    expect(lines(container)).toHaveLength(1);
  });

  test('id를 빠뜨려도 노드를 버리지 않고 자동 연결에 태운다', () => {
    const { container } = render(
      <Diagram label="id 없음">
        <DiagramNodeTag title="A" />
        <DiagramNodeTag title="B" />
      </Diagram>,
    );
    expect(rects(container)).toHaveLength(2);
    expect(lines(container)).toHaveLength(1);
  });

  /**
   * 노드를 복사해 붙이고 id를 안 고치는 실수. 예전에는 React가 같은 key를 두 번
   * 만나 콘솔 에러를 냈다("Encountered two children with the same key").
   */
  test('id가 겹쳐도 노드를 잃지 않고 React key 경고도 내지 않는다', () => {
    const onError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <Diagram label="중복 id">
        <DiagramNodeTag id="dup" title="첫째" />
        <DiagramNodeTag id="dup" title="둘째" />
        <DiagramNodeTag id="dup" title="셋째" />
      </Diagram>,
    );

    expect(rects(container)).toHaveLength(3);
    expect(lines(container)).toHaveLength(2);
    expect(onError).not.toHaveBeenCalled();

    onError.mockRestore();
  });

  test('겹친 id를 가리키는 엣지는 먼저 선언된 노드에 붙는다', () => {
    const { container } = render(
      <Diagram label="중복 id + 엣지">
        <DiagramNodeTag id="dup" title="첫째" />
        <DiagramNodeTag id="dup" title="둘째" />
        <DiagramNodeTag id="tail" title="셋째" />
        <DiagramEdgeTag from="dup" to="tail" />
      </Diagram>,
    );

    // 첫째 노드의 오른변에서 출발해야 한다(둘째였다면 x1이 더 컸을 것).
    const [first] = rects(container);
    const x1 = Number(container.querySelector('line')?.getAttribute('x1'));
    expect(x1).toBe(
      Number(first.getAttribute('x')) + Number(first.getAttribute('width')),
    );
  });
});

describe('Diagram — 크기', () => {
  /**
   * 자동 레이아웃은 viewBox 폭이 노드 텍스트 길이에 따라 달라진다. 폭을 칼럼에
   * 맞춰 늘려 버리면 노드 둘짜리 그림의 12px 제목이 40px 넘게 확대된다.
   */
  test('고유 크기를 SVG에 실어 칼럼을 상한으로만 쓰게 한다', () => {
    const { container } = render(
      <Diagram label="작은 그림">
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
      </Diagram>,
    );

    const svg = container.querySelector('svg');
    const [, , width, height] = svg?.getAttribute('viewBox')?.split(' ') ?? [];
    expect(svg).toHaveAttribute('width', width);
    expect(svg).toHaveAttribute('height', height);
  });

  test('손으로 그린 다이어그램은 예전처럼 칼럼을 꽉 채운다', () => {
    const { container } = render(<Diagram name="deploy-pipeline" />);
    expect(container.querySelector('svg')).not.toHaveAttribute('width');
  });
});

describe('Diagram — direction', () => {
  test('fan은 첫 노드에서 나머지로 갈라진다', () => {
    const { container } = render(
      <Diagram label="팬아웃" direction="fan">
        <DiagramNodeTag id="src" title="in" />
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
      </Diagram>,
    );
    // 갈래 둘이 같은 x에서 시작한다(세로로 쌓인 열).
    const xs = rects(container).map(r => r.getAttribute('x'));
    expect(xs[1]).toBe(xs[2]);
    expect(lines(container)).toHaveLength(2);
  });

  test('알 수 없는 direction은 row로 떨어진다', () => {
    const { container } = render(
      <Diagram label="오타" direction="diagonal">
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
      </Diagram>,
    );
    const [first, second] = rects(container);
    expect(first.getAttribute('y')).toBe(second.getAttribute('y'));
  });
});

describe('Diagram — caption', () => {
  test('caption을 다이어그램 아래 중앙에 놓는다', () => {
    const { container } = render(
      <Diagram label="파이프라인" caption="↻ 실패 시 자동 롤백">
        <DiagramNodeTag id="a" title="A" />
        <DiagramNodeTag id="b" title="B" />
      </Diagram>,
    );

    const caption = Array.from(container.querySelectorAll('text')).at(-1);
    expect(caption).toHaveTextContent('↻ 실패 시 자동 롤백');
    expect(caption).toHaveAttribute('text-anchor', 'middle');
    // 노드 바닥(77)보다 아래.
    expect(Number(caption?.getAttribute('y'))).toBeGreaterThan(77);
  });
});

describe('Diagram — 이름 레지스트리', () => {
  test('등록된 이름은 손으로 그린 컴포넌트를 그린다', () => {
    const { container } = render(<Diagram name="deploy-pipeline" />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 640 122',
    );
  });

  // 경고 박스는 **개발 환경에서만** 보인다. 예전에는 게이트가 "production이
  // 아니면"이라, vitest의 NODE_ENV='test'에서도 통과해 이 테스트가 우연히
  // 초록이었다. 이제는 두 분기를 각각 stubEnv로 명시해 고정한다.
  test('미등록 이름: dev에서는 경고 박스로 오타를 알린다', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => render(<Diagram name="아직-없는-다이어그램" />)).not.toThrow();
    expect(screen.getByRole('status')).toHaveTextContent(
      '아직-없는-다이어그램',
    );
    vi.unstubAllEnvs();
  });

  test('미등록 이름: dev가 아니면 아무것도 그리지 않는다', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(<Diagram name="아직-없는-다이어그램" />);
    expect(container).toBeEmptyDOMElement();
    vi.unstubAllEnvs();
  });

  test('name이 있으면 children은 무시한다', () => {
    const { container } = render(
      <Diagram name="deploy-pipeline">
        <DiagramNodeTag id="a" title="무시됨" />
      </Diagram>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.textContent).not.toContain('무시됨');
  });
});

describe('마크다운 왕복', () => {
  /** PostClient의 플러그인·컴포넌트 구성을 그대로 흉내 낸다. */
  function renderMarkdown(markdown: string) {
    return render(
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={
          {
            diagram: Diagram,
            'diagram-node': DiagramNodeTag,
            'diagram-edge': DiagramEdgeTag,
          } as ComponentProps<typeof ReactMarkdown>['components']
        }
      >
        {markdown}
      </ReactMarkdown>,
    );
  }

  test('본문에 쓴 <diagram> 태그가 SVG로 나온다', () => {
    const { container } = renderMarkdown(
      [
        '# 제목',
        '',
        '<diagram label="배포 파이프라인" caption="↻ 실패 시 자동 롤백">',
        '  <diagram-node id="push" title="git push" desc="main 병합"></diagram-node>',
        '  <diagram-node id="actions" title="Actions" desc="Docker 빌드"></diagram-node>',
        '  <diagram-node id="ecr" title="ECR" desc="이미지 푸시"></diagram-node>',
        '  <diagram-node id="ecs" title="ECS 배포" desc="blue/green 전환" tone="teal"></diagram-node>',
        '  <diagram-edge from="ecr" to="ecs" emphasis="true"></diagram-edge>',
        '</diagram>',
        '',
        '본문 문단.',
      ].join('\n'),
    );

    const svg = screen.getByRole('img', { name: '배포 파이프라인' });
    expect(svg).toBeInTheDocument();

    // 노드 4개 + 명시 엣지 1개(자동 체인은 눌린다).
    expect(rects(container)).toHaveLength(4);
    expect(lines(container)).toHaveLength(1);
    expect(container.querySelector('[data-emphasis]')).toHaveAttribute(
      'data-emphasis',
      'true',
    );

    const texts = Array.from(container.querySelectorAll('text')).map(
      t => t.textContent,
    );
    expect(texts).toContain('ECS 배포');
    expect(texts).toContain('↻ 실패 시 자동 롤백');

    // 앞뒤 마크다운이 멀쩡히 살아 있어야 한다.
    expect(screen.getByRole('heading', { name: '제목' })).toBeInTheDocument();
    expect(screen.getByText('본문 문단.')).toBeInTheDocument();
  });

  test('본문에서 name으로 등록된 다이어그램을 부른다', () => {
    const { container } = renderMarkdown(
      '<diagram name="deploy-pipeline"></diagram>',
    );
    expect(container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 640 122',
    );
  });

  test('direction="fan"도 본문에서 동작한다', () => {
    const { container } = renderMarkdown(
      [
        '<diagram label="팬아웃" direction="fan">',
        '  <diagram-node id="src" title="입력"></diagram-node>',
        '  <diagram-node id="a" title="A"></diagram-node>',
        '  <diagram-node id="b" title="B"></diagram-node>',
        '</diagram>',
      ].join('\n'),
    );

    expect(lines(container)).toHaveLength(2);
    const ys = rects(container).map(r => Number(r.getAttribute('y')));
    // 갈래는 세로로 쌓이므로 y가 서로 다르다.
    expect(ys[1]).not.toBe(ys[2]);
  });
});
