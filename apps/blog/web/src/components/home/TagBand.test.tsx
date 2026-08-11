/**
 * 홈의 "태그로 읽기" 면.
 *
 * 태그 이름에는 공백이 들어갈 수 있어서(`디자인 시스템`) 링크에 인코딩이
 * 필요합니다. 칩의 접근 가능한 이름은 태그와 글 수가 함께 읽히므로,
 * 이름으로 찾을 때 숫자까지 포함해야 합니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { hasHomeTags, TagBand } from './TagBand';

// 밴드 머리는 목록 밖에 있어서, 목록이 비어 `null`을 내도 헤더만 남는다.
// 호출부(page.tsx)가 면 전체를 걷어낼 때 쓰는 판정이라 목록과 같은 문턱을
// 봐야 한다 — 어긋나면 헤더만 뜨거나 반대로 면이 통째로 사라진다.
describe('hasHomeTags', () => {
  test('문턱을 넘는 태그가 하나라도 있으면 참', () => {
    expect(
      hasHomeTags([
        { id: 'build', count: 1 },
        { id: 'bundler', count: 2 },
      ]),
    ).toBe(true);
  });

  test('전부 문턱 미만이면 거짓 — TagBand가 렌더하지 않는 것과 같은 판정', () => {
    expect(hasHomeTags([{ id: 'build', count: 1 }])).toBe(false);
  });

  test('빈 배열이면 거짓', () => {
    expect(hasHomeTags([])).toBe(false);
  });

  test('문턱을 낮추면 판정도 따라 내려간다', () => {
    expect(hasHomeTags([{ id: 'build', count: 1 }], 1)).toBe(true);
  });
});

describe('TagBand', () => {
  test('태그와 글 수를 함께 보여준다', () => {
    render(
      <TagBand
        tags={[{ id: 'TypeScript', count: 11 }]}
        labelledBy="band-tags"
      />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('TypeScript');
    expect(link).toHaveTextContent('11');
  });

  test('태그를 인코딩해 아카이브 필터로 건다', () => {
    render(
      <TagBand
        tags={[{ id: '디자인 시스템', count: 5 }]}
        labelledBy="band-tags"
      />,
    );
    // next/link가 테스트 환경에서 경로의 후행 슬래시를 떼므로 쿼리만 비교합니다.
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    expect(href.startsWith('/posts')).toBe(true);
    expect(href).toContain(`tag=${encodeURIComponent('디자인 시스템')}`);
  });

  test('limit을 넘는 태그는 자른다', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `tag-${i}`,
      count: 20 - i,
    }));
    render(<TagBand tags={many} labelledBy="band-tags" limit={5} />);
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  test('태그가 없으면 목록 자체를 렌더하지 않는다', () => {
    const { container } = render(<TagBand tags={[]} labelledBy="band-tags" />);
    expect(container.firstChild).toBeNull();
  });

  // 한 번만 쓰인 태그는 눌러도 글 한 편짜리 목록이라 축이 되지 못한다.
  // 문턱이 없으면 지금 분포에서는 이 면의 절반이 그런 값으로 찬다.
  test('글 수가 문턱 미만인 태그는 세우지 않는다', () => {
    render(
      <TagBand
        tags={[
          { id: 'bundler', count: 5 },
          { id: 'build', count: 1 },
          { id: 'baseUrl', count: 1 },
        ]}
        labelledBy="band-tags"
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveTextContent('bundler');
  });

  test('문턱을 넘기는 태그가 없으면 목록을 렌더하지 않는다', () => {
    const { container } = render(
      <TagBand tags={[{ id: 'build', count: 1 }]} labelledBy="band-tags" />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('minCount를 낮추면 1편짜리도 나온다', () => {
    render(
      <TagBand
        tags={[{ id: 'build', count: 1 }]}
        labelledBy="band-tags"
        minCount={1}
      />,
    );
    expect(screen.getByRole('link')).toHaveTextContent('build');
  });

  test('목록이 밴드 라벨로 이름을 얻는다', () => {
    render(
      <TagBand tags={[{ id: 'react', count: 9 }]} labelledBy="band-tags" />,
    );
    expect(screen.getByRole('list')).toHaveAttribute(
      'aria-labelledby',
      'band-tags',
    );
  });
});
