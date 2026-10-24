/**
 * 히어로 슬롯의 우선순위.
 *
 * 선택 기준은 예전의 slug 매핑이 아니라 frontmatter `hero` 이름입니다 —
 * slug를 바꿔도 히어로가 사라지지 않고, 코드를 고치지 않아도 글이 붙일 수 있습니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostHero } from './PostHero';
import { DIAGRAM_NAMES } from '@/src/components/diagram/registry';

const SLUG = 'next-js-ecs-deploy';
const REGISTERED_HERO = DIAGRAM_NAMES[0];

describe('PostHero', () => {
  test('레지스트리에 있는 hero 이름은 썸네일보다 먼저 그린다', () => {
    const { container } = render(
      <PostHero
        title="무중단 배포"
        hero={REGISTERED_HERO}
        thumbnailUrl={`/og/${SLUG}.png`}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  test('hero가 없으면 기존 썸네일 이미지로 폴백한다', () => {
    render(
      <PostHero
        title="도커라이징"
        thumbnailUrl="/og/turborepo-next.js-docker.png"
      />,
    );
    const img = screen.getByRole('img', { name: '도커라이징' });
    expect(img).toHaveAttribute('src', '/og/turborepo-next.js-docker.png');
  });

  test('등록되지 않은 hero 이름은 글을 죽이지 않고 썸네일로 폴백한다', () => {
    // 오타 하나로 렌더가 터지면 안 된다. 오타 자체는 lint:posts가 잡는다.
    render(
      <PostHero
        title="무중단 배포"
        hero="deploy-pipelnie"
        thumbnailUrl={`/og/${SLUG}.png`}
      />,
    );
    expect(
      screen.getByRole('img', { name: '무중단 배포' }),
    ).toBeInTheDocument();
  });

  test('다이어그램도 썸네일도 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<PostHero title="도커라이징" />);
    expect(container).toBeEmptyDOMElement();
  });
});
