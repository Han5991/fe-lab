/**
 * 공유 카드는 페이지 여섯이 함께 쓴다 — 고치면 여섯 페이지의 og·twitter가 한꺼번에 바뀐다.
 * check-seo는 og 태그가 있는지만 보므로, 카드의 계약(절대 이미지 URL·og와 twitter의 일치·
 * 설정의 og 규격)을 여기서 잠근다.
 */
import { expect, test } from 'vitest';
import contentConfig from '@/content.config.mts';
import { defaultShareCard } from './seoDefaults';

const { site: SITE, og: OG } = contentConfig;

const card = defaultShareCard({
  title: '제목',
  description: '설명',
  url: `${SITE.url}/somewhere/`,
  imageAlt: '대체 텍스트',
});

test('이미지는 사이트 기본 이미지의 절대 URL이고 og와 twitter가 같은 이미지를 쓴다', () => {
  const [image] = card.openGraph.images;
  expect(image?.url).toBe(`${SITE.url}${SITE.ogDefaultImage}`);
  expect(card.twitter.images).toStrictEqual([image?.url]);
});

test('이미지 크기·locale·사이트 이름은 설정에서 온다', () => {
  expect(card.openGraph.images[0]).toMatchObject({
    width: OG.width,
    height: OG.height,
    alt: '대체 텍스트',
  });
  expect(card.openGraph.locale).toBe(SITE.locale);
  expect(card.openGraph.siteName).toBe(SITE.name);
});

test('og와 twitter의 제목·설명이 같다', () => {
  expect(card.twitter.title).toBe(card.openGraph.title);
  expect(card.twitter.description).toBe(card.openGraph.description);
  expect(card.twitter.card).toBe('summary_large_image');
});
