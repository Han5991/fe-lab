<script lang="ts">
  import { css } from '../../../styled-system/css';
  import { RSS_PATH } from '@blog/content/client';
  import { AUTHOR_GITHUB } from '@blog/site-values';

  /** 히어로 pill — 이름 아래 외부 채널. */
  const pill = css({
    fontFamily: 'mono',
    fontWeight: 'normal',
    fontSize: '[12px]',
    color: 'ink.600',
    textDecoration: 'none',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    rounded: 'pill',
    px: '[11px]',
    py: '[3px]',
    transition: '[color 0.15s, border-color 0.15s]',
    _hover: { color: 'ink.950', borderColor: 'ink.borderStrong' },
  });

  // RSS는 같은 도메인의 정적 파일이라 새 탭으로 열지 않는다.
  const PILLS = [
    { href: AUTHOR_GITHUB, label: 'github', external: true },
    { href: RSS_PATH, label: 'rss', external: false },
  ] as const;
</script>

<!-- <header>로 감싸면 브라우저가 main 안에서도 banner 랜드마크로 노출해 사이트
     헤더와 banner가 둘이 된다(axe: no-duplicate-banner). 그냥 div. -->
<div class={css({ mb: '[30px]' })}>
  <h1
    class={css({
      fontSize: '[21px]',
      fontWeight: 'bold',
      // 페이지 최상위 제목에만 액센트를 준다. 아래 소개 문단과 pill, 섹션
      // 라벨은 전부 무채색으로 남아야 "제목 > 그 외" 위계가 색으로 읽힌다.
      color: 'accent.900',
      mb: '[8px]',
    })}
  >
    한상욱
  </h1>
  <p class={css({ fontSize: '[14px]', color: 'ink.600' })}>
    구조를 그려서 문제를 푸는 프론트엔드 엔지니어.
    <br />
    디자인 시스템, 모노레포, 배포 파이프라인을 다룹니다.
  </p>
  <div
    class={css({ display: 'flex', flexWrap: 'wrap', gap: '[8px]', mt: '[14px]' })}
  >
    {#each PILLS as item (item.label)}
      <a
        href={item.href}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noopener noreferrer' : undefined}
        class={pill}>{item.label}</a
      >
    {/each}
  </div>
</div>
