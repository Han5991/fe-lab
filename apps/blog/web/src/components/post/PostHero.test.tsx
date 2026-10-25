/**
 * 히어로 슬롯의 우선순위.
 *
 * 선택 기준은 예전의 slug 매핑이 아니라 frontmatter `hero` 이름입니다 —
 * slug를 바꿔도 히어로가 사라지지 않고, 코드를 고치지 않아도 글이 붙일 수 있습니다.
 */
import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';
import { PostHero } from './PostHero';
import { DIAGRAM_NAMES } from '@/src/components/diagram/registry';

const SLUG = 'next-js-ecs-deploy';
const SQUARE = { src: '/thumbs/cover.webp', wide: false };
const OG_CARD = { src: `/og/${SLUG}.png`, wide: true };
const REGISTERED_HERO = DIAGRAM_NAMES[0];

describe('PostHero', () => {
  test('레지스트리에 있는 hero 이름은 썸네일보다 먼저 그린다', () => {
    const { container } = render(
      <PostHero slug={SLUG} hero={REGISTERED_HERO} thumbnail={OG_CARD} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  test('hero가 없으면 썸네일 이미지로 폴백한다', () => {
    const { container } = render(<PostHero slug={SLUG} thumbnail={SQUARE} />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/thumbs/cover.webp',
    );
  });

  // 바로 위 h1이 이 글의 이름이다. 그림에 제목을 다시 이름으로 달면 스크린리더가 같은 말을 두 번 읽는다.
  test('커버는 장식이다 — 이름이 없고 첫 화면의 큰 이미지라 높은 우선순위로 받는다', () => {
    const { container } = render(<PostHero slug={SLUG} thumbnail={SQUARE} />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img).not.toHaveAttribute('loading', 'lazy');
  });

  // lazy가 아닌 img는 React가 RSC 페이로드에 preload 힌트로 싣고, 목록 페이지가 글을 프리페치하면 그 힌트로
  // 글마다 히어로를 받았다. `<picture>` 안의 img에는 힌트를 만들지 않는다(cardParts의 noPreloadPicture).
  test('커버 img는 picture 안이라 프리페치한 페이지에 preload 힌트를 남기지 않는다', () => {
    const { container } = render(<PostHero slug={SLUG} thumbnail={SQUARE} />);

    expect(container.querySelector('img')?.parentElement?.tagName).toBe(
      'PICTURE',
    );
  });

  test('16:9 비율 힌트를 단다', () => {
    const { container } = render(<PostHero slug={SLUG} thumbnail={SQUARE} />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('width', '1200');
    expect(img).toHaveAttribute('height', '675');
  });

  test('등록되지 않은 hero 이름은 글을 죽이지 않고 썸네일로 폴백한다', () => {
    // 오타 하나로 렌더가 터지면 안 된다. 오타 자체는 lint:posts가 잡는다.
    const { container } = render(
      <PostHero slug={SLUG} hero="deploy-pipelnie" thumbnail={SQUARE} />,
    );

    expect(container.querySelector('img')).not.toBeNull();
  });

  test('다이어그램도 썸네일도 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<PostHero slug={SLUG} />);

    expect(container).toBeEmptyDOMElement();
  });
});
