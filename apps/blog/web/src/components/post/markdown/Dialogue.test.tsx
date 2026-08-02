/**
 * `<dialogue>` / `<msg>` — 도입부 대화 재현.
 *
 * 이 컴포넌트는 글 본문에서 raw HTML로 쓰이므로 props가 전부 문자열이고,
 * 태그 사이 개행이 공백 텍스트 노드로 섞여 들어온다. 두 가지가 테스트의 축이다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Dialogue, Msg } from './Dialogue';

const speakers = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-speaker]'));

describe('Msg', () => {
  test('from="me"는 내 발언으로 정렬 분기한다', () => {
    render(<Msg from="me">점심에 합니다</Msg>);
    expect(speakers()[0].dataset.speaker).toBe('me');
  });

  test('한글 "나"도 내 발언으로 본다', () => {
    render(<Msg from="나">점심에 합니다</Msg>);
    expect(speakers()[0].dataset.speaker).toBe('me');
  });

  test('그 외 화자는 상대방 정렬', () => {
    render(<Msg from="PM">새벽에 하실 거죠?</Msg>);
    expect(speakers()[0].dataset.speaker).toBe('other');
  });

  test('대문자 약어 화자는 이니셜을 통째로 보여준다', () => {
    render(<Msg from="PM">질문</Msg>);
    expect(screen.getByRole('img', { name: 'PM 발언' })).toHaveTextContent(
      'PM',
    );
  });

  test('사람 이름은 첫 글자만 쓴다', () => {
    render(<Msg from="한상욱">답변</Msg>);
    expect(screen.getByRole('img', { name: '한상욱 발언' })).toHaveTextContent(
      '한',
    );
  });

  test('from="me"의 아바타는 "나"', () => {
    render(<Msg from="me">답변</Msg>);
    expect(screen.getByRole('img', { name: 'me 발언' })).toHaveTextContent(
      '나',
    );
  });

  test('from이 없어도 렌더는 죽지 않는다', () => {
    render(<Msg>익명</Msg>);
    expect(screen.getByText('익명')).toBeInTheDocument();
    expect(speakers()[0].dataset.speaker).toBe('other');
  });
});

describe('Dialogue', () => {
  test('말풍선 사이 공백 텍스트 노드를 자식으로 세지 않는다', () => {
    // react-markdown이 `<msg>` 사이 개행을 텍스트 노드로 넘겨주는 상황 재현.
    render(
      <Dialogue>
        {'\n'}
        <Msg from="PM">질문</Msg>
        {'\n'}
        <Msg from="me">답변</Msg>
        {'\n'}
      </Dialogue>,
    );

    const container = document.querySelector('[data-speaker]')?.parentElement;
    expect(container?.children).toHaveLength(2);
    // 마지막 자식이 실제로 마지막 말풍선이어야 `:last-child` 여백 규칙이 맞는다.
    expect(container?.lastElementChild).toHaveAttribute('data-speaker', 'me');
  });

  test('화자 순서를 보존한다', () => {
    render(
      <Dialogue>
        <Msg from="PM">질문</Msg>
        <Msg from="me">답변</Msg>
      </Dialogue>,
    );
    expect(speakers().map(el => el.dataset.speaker)).toEqual(['other', 'me']);
  });
});
