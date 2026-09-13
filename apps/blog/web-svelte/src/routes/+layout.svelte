<script lang="ts">
  import type { LayoutProps } from './$types';
  import { css } from '../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import SearchDialog from '$lib/client/SearchDialog.svelte';
  import ThemeToggle from '$lib/client/ThemeToggle.svelte';
  import NavLinks from '$lib/components/NavLinks.svelte';
  import { RSS_PATH } from '@blog/content/client';
  import { AUTHOR_GITHUB, AUTHOR_LINKEDIN } from '@blog/site-values';
  import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH } from '$lib/shared/routes';
  // 화면 웹폰트. React 판 `layout.tsx`와 **같은 배포판·같은 서브셋 CSS**다.
  //
  // 이 줄이 없어서 사이트 전체가 시스템 폴백으로 렌더되고 있었다. 한글 폴백이
  // 얼핏 비슷해 보여서 눈으로는 안 잡혔는데, 같은 문자열의 폭이 244px 대
  // 281px(15% 넓음)로 갈려 차례 항목의 줄바꿈이 어긋나면서 드러났다.
  // `content.config.mts`가 드는 정적 OTF는 OG 카드(satori)용이라 이것과 별개다.
  import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
  // 모노 웹폰트. React 판은 `next/font/google`이 같은 얼굴을 받아
  // `--font-jetbrains`에 꽂는데, 이 앱에는 그 대응물이 없어 토큰의 폴백
  // 리터럴(`'JetBrains Mono'`)만 남아 있었다 — 설치돼 있지 않은 기계에서는
  // 시스템 모노로 떨어진다. 폭은 둘 다 0.6em 고정폭이라 레이아웃이 흔들리지
  // 않아 눈에 안 띄었고, 글자 모양만 달랐다.
  import '@fontsource-variable/jetbrains-mono';
  import '../styles/globals.css';

  const { children }: LayoutProps = $props();

  const FOOTER_LINKS = [
    { href: ABOUT_PATH, label: 'About' },
    { href: PRIVACY_PATH, label: '개인정보' },
    { href: AUTHOR_GITHUB, label: 'GitHub' },
    { href: AUTHOR_LINKEDIN, label: 'LinkedIn' },
    { href: RSS_PATH, label: 'RSS' },
  ] as const;

  const footerLink = css({
    fontFamily: 'mono',
    fontSize: '[12px]',
    color: 'ink.500',
    textDecoration: 'none',
    transition: '[color 0.15s]',
    _hover: { color: 'ink.950' },
  });

  /**
   * 페이지 셸 — 본문이 짧아도 푸터가 화면 아래에 붙는다.
   * `apps/blog/web/src/components/Layout.tsx`와 같은 값이다.
   */
  const shell = css({
    minH: '[100vh]',
    bg: 'paper.50',
    color: 'ink.950',
    display: 'flex',
    flexDir: 'column',
  });

  /**
   * sticky 헤더. 아래로 본문이 지나가므로 반투명하게 둬서 헤더가 지면 위에 떠
   * 있다는 걸 드러낸다 — 불투명하면 스크롤 중에 본문이 헤더 경계에서 뚝 잘려
   * 보인다.
   *
   * **Panda에서 흐림은 `backdropFilter: 'auto'` + `backdropBlur` 조합이다.**
   * `backdropFilter: '[blur(12px)]'`처럼 임의값으로 주면 클래스만 생기고 규칙이
   * 안 나간다 — React 판 주석에 같은 함정이 적혀 있다.
   */
  const header = css({
    borderBottomWidth: 'hairline',
    borderBottomStyle: 'solid',
    borderColor: 'ink.border',
    pos: 'sticky',
    top: '0',
    bg: 'paper.50/80',
    backdropFilter: 'auto',
    backdropBlur: '[12px]',
    zIndex: '10',
  });

  /** 저작권 연도는 빌드 시각이 아니라 렌더 시각이다 — React 판과 같다. */
  const year = new Date().getFullYear();
</script>

<div class={shell}>
  <header class={header}>
    <Rail width="wide">
      <div
        class={css({
          h: '[52px]',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { base: '[10px]', md: '[16px]' },
        })}
      >
        <!-- 로고 표기만 sangwook.dev. metadata·JSON-LD의 사이트명(Frontend Lab)은
             검색 색인 보호를 위해 그대로 둔다 — 둘은 일부러 다르다. 예전에는
             여기가 `data.site.name`이라 헤더에 "Frontend Lab"이 찍혔다. -->
        <a
          href={HOME_PATH}
          class={css({
            fontFamily: 'mono',
            fontWeight: 'medium',
            fontSize: '[15px]',
            color: 'ink.950',
            textDecoration: 'none',
            transition: '[opacity 0.15s]',
            _hover: { opacity: '0.7' },
          })}>sangwook.dev</a
        >

        <div
          class={css({
            display: 'flex',
            alignItems: 'center',
            gap: { base: '[10px]', md: '[16px]' },
          })}
        >
          <NavLinks />
          <div class={css({ display: 'flex', alignItems: 'center', gap: '[4px]' })}>
            <SearchDialog />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </Rail>
  </header>

  <main class={css({ flex: '1', w: 'full' })}>
    {@render children()}
  </main>

  <footer
    class={css({
      borderTopWidth: 'hairline',
      borderTopStyle: 'solid',
      borderColor: 'ink.border',
      mt: '[64px]',
      py: '[20px]',
    })}
  >
    <Rail
      width="wide"
      class={css({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '[12px]',
      })}
    >
      <span class={css({ fontFamily: 'mono', fontSize: '[12px]', color: 'ink.500' })}>
        © {year} 한상욱
      </span>
      <div
        class={css({
          display: 'flex',
          gap: '[16px]',
          flexWrap: 'wrap',
          alignItems: 'center',
        })}
      >
        {#each FOOTER_LINKS as link (link.label)}
          <a
            href={link.href}
            target={link.href.startsWith('http') ? '_blank' : undefined}
            rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            class={footerLink}>{link.label}</a
          >
        {/each}
      </div>
    </Rail>
  </footer>
</div>
