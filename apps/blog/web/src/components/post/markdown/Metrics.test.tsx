/**
 * `<metrics>` / `<metric>` — 성과 수치 카드.
 *
 * 저자는 JSON 문자열(raw HTML)과 중첩 태그(children) 중 편한 쪽을 쓴다.
 * 둘 다 같은 결과를 내야 하고, JSON이 깨져도 글이 죽으면 안 된다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Metric, Metrics } from './Metrics';

const tones = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-tone]'));

describe('Metrics — items(JSON 문자열)', () => {
  test('JSON 문자열 props를 카드로 파싱한다', () => {
    render(
      <Metrics items='[{"label":"배포 소요","value":"22분 → 8분"},{"label":"다운타임","value":"0초"}]' />,
    );

    expect(screen.getByText('배포 소요')).toBeInTheDocument();
    expect(screen.getByText('22분 → 8분')).toBeInTheDocument();
    expect(screen.getByText('0초')).toBeInTheDocument();
  });

  test('tone="success"는 성공 색으로 분기한다', () => {
    render(
      <Metrics items='[{"label":"롤백","value":"자동","tone":"success"},{"label":"다운타임","value":"0초"}]' />,
    );
    expect(tones().map(el => el.dataset.tone)).toEqual(['success', 'default']);
  });

  test('배열 props도 그대로 받는다(JSX 사용처)', () => {
    render(<Metrics items={[{ label: '롤백', value: '자동' }]} />);
    expect(screen.getByText('자동')).toBeInTheDocument();
  });
});

describe('Metrics — 폴백', () => {
  test('깨진 JSON이면 throw하지 않고 children으로 렌더한다', () => {
    render(
      <Metrics items="[{label: 배포}">
        <Metric label="다운타임" value="0초" />
      </Metrics>,
    );

    expect(screen.getByText('다운타임')).toBeInTheDocument();
    expect(screen.getByText('0초')).toBeInTheDocument();
  });

  test('items가 없으면 children 중첩 방식이 동작한다', () => {
    const { container } = render(
      <Metrics>
        {'\n'}
        <Metric label="배포 소요" value="22분 → 8분" />
        {'\n'}
        <Metric label="롤백" value="자동" tone="success" />
        {'\n'}
      </Metrics>,
    );

    // 공백 텍스트 노드가 카드로 세어지면 열 수 계산이 어긋난다.
    expect(container.firstElementChild?.children).toHaveLength(2);
    expect(tones().map(el => el.dataset.tone)).toEqual(['default', 'success']);
  });

  test('items도 children도 없으면 빈 그리드만 남고 죽지 않는다', () => {
    const { container } = render(<Metrics />);
    expect(container.firstElementChild?.children).toHaveLength(0);
  });
});

describe('Metric', () => {
  test('value가 없으면 children을 값으로 쓴다', () => {
    render(<Metric label="롤백">자동</Metric>);
    expect(screen.getByText('자동')).toBeInTheDocument();
  });

  test('알 수 없는 tone은 기본값으로 떨어진다', () => {
    render(<Metric label="롤백" value="자동" tone="rainbow" />);
    expect(tones()[0].dataset.tone).toBe('default');
  });
});

// 리뷰 지적(critical): 가드가 "label 또는 value 중 하나가 문자열"만 봐서
// 나머지 필드가 객체여도 통과했다. 그 객체는 그대로 JSX 자식이 되고 React가
// "Objects are not valid as a React child"로 throw해 글 페이지 전체가 죽는다.
describe('Metrics — 필드 타입이 어긋난 JSON', () => {
  test('value가 객체면 크래시 없이 children 폴백으로 떨어진다', () => {
    expect(() =>
      render(
        <Metrics items='[{"label":"배포 소요","value":{"nested":true}}]'>
          <Metric label="폴백" value="0초" />
        </Metrics>,
      ),
    ).not.toThrow();
    expect(screen.getByText('폴백')).toBeInTheDocument();
    expect(screen.getByText('0초')).toBeInTheDocument();
  });

  test('label이 배열이면 그 아이템만 걸러진다', () => {
    render(
      <Metrics items='[{"label":["a"],"value":"x"},{"label":"정상","value":"8분"}]' />,
    );
    expect(screen.getByText('정상')).toBeInTheDocument();
    expect(screen.getByText('8분')).toBeInTheDocument();
  });

  test('tone이 객체여도 크래시하지 않는다', () => {
    expect(() =>
      render(<Metrics items='[{"label":"롤백","value":"자동","tone":{}}]' />),
    ).not.toThrow();
  });
});
