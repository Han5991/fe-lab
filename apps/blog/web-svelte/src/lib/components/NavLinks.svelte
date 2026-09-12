<script lang="ts">
  import { page } from '$app/state';
  import { css } from '../../../styled-system/css';
  import { POSTS_PATH } from '@blog/content/client';
  import { ABOUT_PATH, SERIES_PATH } from '$lib/shared/routes';

  /**
   * 헤더 네비게이션. `apps/blog/web/src/components/shared/NavLinks.tsx`의 이식이다.
   *
   * 활성 판정 규칙 둘을 그대로 옮긴다:
   * - `trailingSlash: 'always'`라 pathname도 `/posts/` 형태다. 글 상세
   *   (`/posts/foo/`)에서도 "글"이 켜져 있어야 하므로 **prefix로 판정한다** —
   *   정확히 일치로 보면 글을 읽는 동안 네비가 통째로 비활성처럼 보인다.
   * - **홈은 예외로 "글"을 켠다.** 홈 자체가 대표 글 + 글 목록을 얹은 글
   *   허브라서다. prefix 판정만으로는 홈에서 아무것도 안 켜진다.
   */
  const NAV_ITEMS = [
    { href: POSTS_PATH, label: '글' },
    { href: SERIES_PATH, label: '시리즈' },
    { href: ABOUT_PATH, label: 'About' },
  ] as const;

  /**
   * 터치 타겟은 의사요소로 넓힌다 — 여백(px/py)으로 넓히면 링크 사이 간격이
   * 벌어져 배치가 달라진다. 가장 좁은 링크("글")가 좌우 7px씩 확장돼 25px가
   * 되고(WCAG 2.5.8의 24px 초과), 세로는 36px다.
   */
  const linkStyle = css.raw({
    pos: 'relative',
    fontSize: '[13px]',
    color: 'ink.600',
    textDecoration: 'none',
    transition: '[color 0.15s]',
    _hover: { color: 'ink.950' },
    _after: {
      content: '""',
      pos: 'absolute',
      insetBlock: '[-8px]',
      insetInline: '[-7px]',
    },
  });

  /**
   * 현재 위치는 포인트색으로 표시한다 — 무채색 굵기만으로는 13px 링크 셋 중
   * 어디에 있는지 눈에 안 들어온다.
   *
   * **`cx`가 아니라 `css(raw, raw)`로 합친다.** `cx`는 클래스 문자열을 이어
   * 붙이기만 해서 충돌하는 원자 클래스를 병합하지 않는다 — 활성 링크에
   * `c_ink.600`과 `c_accent.600`이 둘 다 붙고, 승자는 클래스 순서가 아니라
   * 스타일시트 순서가 정한다. React 판이 실제로 그래서 활성 표시가 굵기로만
   * 남아 있었다. `css()`는 객체 단계에서 병합해 color 클래스를 하나만 낸다.
   */
  const activeStyle = css.raw({
    color: 'accent.600',
    fontWeight: 'semibold',
    _hover: { color: 'accent.700' },
  });

  const isActive = (href: string): boolean =>
    page.url.pathname === '/'
      ? href === POSTS_PATH
      : page.url.pathname.startsWith(href);
</script>

<nav
  aria-label="주요 메뉴"
  class={css({
    display: 'flex',
    alignItems: 'center',
    gap: { base: '[14px]', md: '[20px]' },
  })}
>
  {#each NAV_ITEMS as item (item.href)}
    {@const active = isActive(item.href)}
    <a
      href={item.href}
      aria-current={active ? 'page' : undefined}
      class={css(linkStyle, active ? activeStyle : undefined)}
    >
      {item.label}
    </a>
  {/each}
</nav>
