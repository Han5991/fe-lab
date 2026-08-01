/**
 * 히어로 슬롯의 우선순위와 페이지 전환 키.
 *
 * 다이어그램이 썸네일을 밀어내면서 `data-hero-enter-key`까지 같이 사라지면
 * 목록 카드(`data-hero-exit-key`)와 짝이 어긋나 hero 모핑이 죽습니다.
 * 그 회귀를 잡는 게 이 파일의 목적입니다.
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
        slug={SLUG}
        title="무중단 배포"
        hero={REGISTERED_HERO}
        thumbnailUrl={`/og/${SLUG}.png`}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  test('(회귀) 다이어그램으로 바뀌어도 썸네일 보유 글의 전환 키는 남는다', () => {
    const { container } = render(
      <PostHero
        slug={SLUG}
        title="무중단 배포"
        hero={REGISTERED_HERO}
        thumbnailUrl={`/og/${SLUG}.png`}
      />,
    );
    expect(
      container.querySelector(`[data-hero-enter-key="post-${SLUG}"]`),
    ).not.toBeNull();
  });

  test('썸네일이 없는 글은 fade 폴백이라 전환 키를 붙이지 않는다', () => {
    const { container } = render(
      <PostHero slug={SLUG} title="무중단 배포" hero={REGISTERED_HERO} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('[data-hero-enter-key]')).toBeNull();
  });

  test('hero가 없으면 기존 썸네일 이미지로 폴백한다', () => {
    render(
      <PostHero
        slug="turborepo-next.js-docker"
        title="도커라이징"
        thumbnailUrl="/og/turborepo-next.js-docker.png"
      />,
    );
    const img = screen.getByRole('img', { name: '도커라이징' });
    expect(img).toHaveAttribute('src', '/og/turborepo-next.js-docker.png');
    expect(img).toHaveAttribute(
      'data-hero-enter-key',
      'post-turborepo-next.js-docker',
    );
  });

  test('등록되지 않은 hero 이름은 글을 죽이지 않고 썸네일로 폴백한다', () => {
    // 오타 하나로 렌더가 터지면 안 된다. 오타 자체는 lint:posts가 잡는다.
    render(
      <PostHero
        slug={SLUG}
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
    const { container } = render(
      <PostHero slug="turborepo-next.js-docker" title="도커라이징" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
