import { css } from '@blog/styled-system/css';
import { archivePath, POSTS_PATH } from '@blog/content/client';
import { TransitionLink } from '@/src/components/shared/TransitionLink';

interface BreadcrumbsProps {
  /** 글이 속한 시리즈 — `id`는 아카이브 필터의 값, `name`은 화면에 찍는 표시명. */
  series: { id: string; name: string };
}

const list = css({
  display: 'flex',
  alignItems: 'center',
  gap: '1',
  py: '1',
  m: '0',
  p: '0',
  listStyleType: 'none',
  textStyle: 'body',
});

const item = css({ display: 'flex', alignItems: 'center', gap: '1' });

const link = css({
  color: 'ink.700',
  transition: 'colors',
  _hover: { color: 'ink.950' },
});

/** 마지막 칸 — 글이 속한 곳이라 본문 잉크에 굵게. 앞 칸(ink.700)과 굵기·색으로 갈린다. */
const lastLink = css({
  color: 'ink.950',
  fontWeight: 'semibold',
  _hover: { textDecorationLine: 'underline' },
});

/**
 * 글 상세의 빵부스러기 — `글 / {시리즈명}`. **시리즈 글에만** 그린다(그 밖의 글은 둘째 칸이 가리킬 페이지가
 * 없다). 두 칸 모두 링크다: `글`은 목록, 시리즈명은 그 시리즈로 거른 목록(`/series`·시리즈 칩과 같은 축)이다.
 * 현재 글의 제목은 이 줄에 없으므로(바로 아래가 h1) 마지막 칸에도 `aria-current`를 달지 않는다.
 *
 * 구분자 `/`는 장식이라 스크린리더에서 숨긴다. 랜드마크 이름은 `위치` — 헤더의 `주요 메뉴`, 차례의
 * `이 글의 차례`, 하단의 `이전·다음 글`, 푸터의 `사이트 링크`와 겹치지 않는다.
 */
export const Breadcrumbs = ({ series }: BreadcrumbsProps) => (
  <nav aria-label="위치">
    <ol className={list}>
      <li className={item}>
        <TransitionLink href={POSTS_PATH} className={link}>
          글
        </TransitionLink>
      </li>
      <li className={item}>
        <span aria-hidden="true" className={css({ color: 'ink.700' })}>
          /
        </span>
        <TransitionLink
          href={archivePath({ series: series.id })}
          className={lastLink}
        >
          {series.name}
        </TransitionLink>
      </li>
    </ol>
  </nav>
);
