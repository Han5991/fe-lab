/**
 * `<timeline>` / `<step>` — 시도1 실패 → 시도2 실패 → 시도3 성공 서사.
 *
 * 연결선은 "마지막이 아닌 스텝"에만 붙는다. children으로 받든 JSON으로 받든
 * 이 판정이 같아야 하고, result를 빠뜨린 스텝을 성공으로 그리면 글의 의미가 뒤집힌다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Step, Timeline } from './Timeline';

const results = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-result]')).map(
    el => el.dataset.result,
  );

const rails = () => document.querySelectorAll('[data-timeline-rail]');

const STEPS_JSON = JSON.stringify([
  { title: '시도 1 · pm2 롤링 재시작', desc: '전환 순간 504', result: 'fail' },
  { title: '시도 2 · ECS 롤링 업데이트', desc: '롤백이 수동', result: 'fail' },
  {
    title: '시도 3 · CodeDeploy blue/green',
    desc: '실패 시 자동 롤백',
    result: 'success',
  },
]);

describe('Timeline — steps(JSON 문자열)', () => {
  test('JSON 문자열 props를 스텝으로 파싱한다', () => {
    render(<Timeline steps={STEPS_JSON} />);

    expect(screen.getByText('시도 1 · pm2 롤링 재시작')).toBeInTheDocument();
    expect(screen.getByText('실패 시 자동 롤백')).toBeInTheDocument();
    expect(results()).toEqual(['fail', 'fail', 'success']);
  });

  test('마지막 스텝에만 연결선이 없다', () => {
    render(<Timeline steps={STEPS_JSON} />);
    expect(rails()).toHaveLength(2);
  });

  test('배열 props도 그대로 받는다(JSX 사용처)', () => {
    render(<Timeline steps={[{ title: '시도 1', result: 'fail' }]} />);
    expect(screen.getByText('시도 1')).toBeInTheDocument();
  });
});

describe('Timeline — 폴백', () => {
  test('깨진 JSON이면 throw하지 않고 children으로 렌더한다', () => {
    render(
      <Timeline steps="[{title:">
        <Step title="시도 3" desc="성공" result="success" />
      </Timeline>,
    );

    expect(screen.getByText('시도 3')).toBeInTheDocument();
    expect(results()).toEqual(['success']);
  });

  test('children 중첩 방식에서도 마지막 스텝만 연결선이 없다', () => {
    render(
      <Timeline>
        {'\n'}
        <Step title="시도 1" desc="실패" result="fail" />
        {'\n'}
        <Step title="시도 2" desc="성공" result="success" />
        {'\n'}
      </Timeline>,
    );

    expect(results()).toEqual(['fail', 'success']);
    expect(rails()).toHaveLength(1);
  });
});

describe('Step', () => {
  test('result="fail"은 × 아이콘, result="success"는 ✓ 아이콘', () => {
    render(
      <Timeline>
        <Step title="a" result="fail" />
        <Step title="b" result="success" />
      </Timeline>,
    );

    expect(screen.getByRole('img', { name: '실패' })).toHaveTextContent('×');
    expect(screen.getByRole('img', { name: '성공' })).toHaveTextContent('✓');
  });

  test('result를 빠뜨리면 성공이 아니라 실패로 본다', () => {
    render(<Step title="시도" desc="원인 미상" />);
    expect(results()).toEqual(['fail']);
  });

  test('단독으로 쓰면 연결선을 그리지 않는다', () => {
    render(<Step title="시도" result="fail" />);
    expect(rails()).toHaveLength(0);
  });

  test('desc가 없으면 children을 설명으로 쓴다', () => {
    render(<Step title="시도">커넥션 드레이닝 불가</Step>);
    expect(screen.getByText('커넥션 드레이닝 불가')).toBeInTheDocument();
  });
});
