/**
 * 홈 발견 면의 머리 줄.
 *
 * 라벨은 목록의 **이름**을 겸합니다 — 목록이 `aria-labelledby`로 이 id를
 * 가리키므로, id가 빠지면 목록이 이름 없는 채로 노출됩니다. 헤딩 레벨도
 * 계약입니다: 홈은 h1(이름) → h2(면 라벨) → h3(글 제목) 순이라, 여기가
 * h2가 아니면 헤딩 탐색에서 면과 글이 같은 깊이로 뭉갭니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscoveryBand } from './DiscoveryBand';

describe('DiscoveryBand', () => {
  test('라벨을 h2로 렌더하고 id를 그대로 단다', () => {
    render(<DiscoveryBand id="band-recent" title="최근 글" />);
    const heading = screen.getByRole('heading', { level: 2, name: '최근 글' });
    expect(heading).toHaveAttribute('id', 'band-recent');
  });

  test('more를 주면 우측 링크가 붙는다', () => {
    render(
      <DiscoveryBand
        id="band-recent"
        title="최근 글"
        more={{ href: '/posts/', label: '전체 43편 →' }}
      />,
    );
    const link = screen.getByRole('link', { name: '전체 43편 →' });
    // next/link가 테스트 환경에서 후행 슬래시를 떼므로 경로만 비교합니다.
    expect(link.getAttribute('href')?.replace(/\/$/, '')).toBe('/posts');
  });

  test('more가 없으면 링크를 만들지 않는다', () => {
    render(<DiscoveryBand id="band-featured" title="대표 글" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
