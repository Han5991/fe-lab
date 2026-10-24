/**
 * 홈 글 섹션 — 섹션의 이름(region 랜드마크)은 제목에서 오고, 제목은 h2다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeSection } from './HomeSection';

describe('HomeSection', () => {
  test('섹션 이름은 h2 제목이고 "더 보기" 링크가 붙는다', () => {
    render(
      <HomeSection
        id="test-section"
        title="섹션 제목"
        more={{ href: '/posts/', label: '모두 보기' }}
      >
        <p>내용</p>
      </HomeSection>,
    );
    const region = screen.getByRole('region', { name: '섹션 제목' });
    expect(region).toContainElement(
      screen.getByRole('heading', { level: 2, name: '섹션 제목' }),
    );
    expect(screen.getByRole('link', { name: '모두 보기' })).toHaveAttribute(
      'href',
      '/posts/',
    );
  });
});
