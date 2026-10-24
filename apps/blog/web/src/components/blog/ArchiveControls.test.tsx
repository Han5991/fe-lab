/**
 * 글 목록 컨트롤 — 네이티브 radio·select·label이라 이름·역할·순서와 바뀐 값을 넘기는지만 본다. 화살표
 * 이동·선택은 브라우저 기본 동작이라 jsdom에서 검사하지 않는다. 켜짐·hover·"지우기" 숨김은 CSS라
 * (jsdom에 Panda CSS가 없다) 여기서 보지 않는다.
 */
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ARCHIVE_SORT_KEYS } from '@blog/content/client';

import { ArchiveSearchBox } from './ArchiveSearchBox';
import { SeriesChips } from './SeriesChips';
import { SORT_LABEL, SortSelect } from './SortSelect';
import { ViewToggle } from './ViewToggle';

// 실제 사이트의 시리즈와 다른 값이다.
const SERIES = [
  { id: 'fixture-bundler', title: '번들러', count: 5 },
  { id: '[픽스처 연재]', title: '[픽스처 연재]', count: 2 },
];

// 켜지면 semibold가 되는 면은 굵은 폭을 CSS(`steadyLabel`의 `::after`)로 미리 잡는다 — 그 사본의 글자는
// 면의 `data-label`이다. 글자와 어긋나거나 빠지면 폭 예약이 조용히 틀어지므로 radio마다 짝을 본다.
const faceLabels = (group: HTMLElement) =>
  within(group)
    .getAllByRole('radio')
    .map(radio => {
      const face = radio.nextElementSibling;
      return [face?.textContent, face?.getAttribute('data-label')];
    });

describe('SeriesChips', () => {
  test('"시리즈" radio 묶음이고 전체가 맨 앞이며, 칩 면은 자기 글자를 data-label로도 든다', () => {
    render(
      <SeriesChips series={SERIES} total={9} value={null} onChange={vi.fn()} />,
    );

    const group = screen.getByRole('radiogroup', { name: '시리즈' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map(r => r.getAttribute('value')),
    ).toEqual(['', 'fixture-bundler', '[픽스처 연재]']);
    expect(screen.getByRole('radio', { name: '전체 (9)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '번들러 (5)' })).not.toBeChecked();
    expect(faceLabels(group)).toEqual([
      ['전체 (9)', '전체 (9)'],
      ['번들러 (5)', '번들러 (5)'],
      ['[픽스처 연재] (2)', '[픽스처 연재] (2)'],
    ]);
  });

  test('시리즈를 고르면 그 id를, 전체를 고르면 null을 넘긴다', () => {
    const onChange = vi.fn();
    render(
      <SeriesChips
        series={SERIES}
        total={9}
        value="fixture-bundler"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: '[픽스처 연재] (2)' }));
    fireEvent.click(screen.getByRole('radio', { name: '전체 (9)' }));

    expect(onChange.mock.calls).toEqual([['[픽스처 연재]'], [null]]);
  });
});

describe('SortSelect', () => {
  test('"정렬" 콤보박스이고 선택지는 패키지 정렬 키 순서와 라벨이다', () => {
    render(<SortSelect value="shortest" onChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: '정렬' });
    expect(select).toHaveValue('shortest');
    expect(
      within(select)
        .getAllByRole('option')
        .map(o => [o.getAttribute('value'), o.textContent]),
    ).toEqual(ARCHIVE_SORT_KEYS.map(key => [key, SORT_LABEL[key]]));
  });

  test('고른 정렬 키를 넘긴다', () => {
    const onChange = vi.fn();
    render(<SortSelect value="recent" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: '정렬' }), {
      target: { value: 'popular' },
    });

    expect(onChange).toHaveBeenCalledWith('popular');
  });
});

describe('ViewToggle', () => {
  test('"뷰" radio 묶음이고 탭 역할이 없으며, 칸은 카드·리스트 순서이고 자기 글자를 data-label로도 든다', () => {
    render(<ViewToggle value="cards" onChange={vi.fn()} />);

    const group = screen.getByRole('radiogroup', { name: '뷰' });
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(
      within(group)
        .getAllByRole('radio')
        .map(r => r.getAttribute('value')),
    ).toEqual(['cards', 'list']);
    expect(screen.getByRole('radio', { name: '카드' })).toBeChecked();
    expect(faceLabels(group)).toEqual([
      ['카드', '카드'],
      ['리스트', '리스트'],
    ]);
  });

  test('다른 보기를 고르면 그 값을 넘긴다', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="cards" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: '리스트' }));

    expect(onChange).toHaveBeenCalledWith('list');
  });

  // 켜진 면은 칸이 아니라 트랙에 하나 있고, 자리는 트랙의 style 변수에서 CSS가 계산한다.
  test('켜진 면은 접근성 트리 밖이라 묶음·칸 이름에 섞이지 않는다', () => {
    render(<ViewToggle value="cards" onChange={vi.fn()} />);

    const group = screen.getByRole('radiogroup', { name: '뷰' });
    const faces = group.querySelectorAll(':scope > [aria-hidden="true"]');
    expect(faces).toHaveLength(1);
    expect(faces[0]?.textContent).toBe('');
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: '카드' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '리스트' })).not.toBeChecked();
  });

  test('고른 칸의 순서를 트랙의 --segment-index로 내보낸다', () => {
    const { rerender } = render(
      <ViewToggle value="cards" onChange={vi.fn()} />,
    );
    const group = screen.getByRole('radiogroup', { name: '뷰' });
    expect(group.style.getPropertyValue('--segment-index')).toBe('0');

    rerender(<ViewToggle value="list" onChange={vi.fn()} />);
    expect(group.style.getPropertyValue('--segment-index')).toBe('1');
  });
});

describe('ArchiveSearchBox', () => {
  const renderBox = () => {
    const handlers = { onChange: vi.fn(), onClear: vi.fn(), onBlur: vi.fn() };
    render(<ArchiveSearchBox value="vite" inputRef={null} {...handlers} />);
    const input = screen.getByRole('searchbox', { name: '글 검색' });
    const label = input.closest('label');
    if (!label) throw new Error('검색 상자의 뿌리가 label이 아니다');
    return { handlers, input, label };
  };

  // 상자 전체가 label이라 아이콘·여백을 누르면 입력이 활성화된다(브라우저는 초점을 옮긴다 — jsdom은
  // 활성화 클릭만 흉내 내므로 그 클릭과 label의 연결 컨트롤을 본다).
  test('상자의 아이콘 쪽을 누르면 입력이 활성화되고, 지우기 버튼은 입력을 활성화하지 않는다', () => {
    const { input, label } = renderBox();
    const inputClicks = vi.fn();
    input.addEventListener('click', inputClicks);

    expect(label.control).toBe(input);
    const icon = label.querySelector('svg');
    if (!icon) throw new Error('검색 아이콘이 없다');
    fireEvent.click(icon);
    expect(inputClicks).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '지우기' }));
    expect(inputClicks).toHaveBeenCalledTimes(1);
  });

  test('글자는 onChange로, 지우기는 onClear로, 떠나면 onBlur로 알린다', () => {
    const { handlers, input } = renderBox();

    fireEvent.change(input, { target: { value: 'vitest' } });
    fireEvent.click(screen.getByRole('button', { name: '지우기' }));
    fireEvent.blur(input);

    expect(handlers.onChange).toHaveBeenCalledWith('vitest');
    expect(handlers.onClear).toHaveBeenCalledOnce();
    expect(handlers.onBlur).toHaveBeenCalledOnce();
  });
});
