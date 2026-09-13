<script lang="ts">
  import { css, cx } from '../../../styled-system/css';

  /**
   * 글 하단 이동 카드 한 장. 위계는 그림자 없이 hairline 보더 하나로만 만들고,
   * hover에서 보더만 진해진다.
   */
  const {
    href,
    title,
    label,
    direction,
    clamp,
  }: {
    href: string;
    title: string;
    label: string;
    direction: 'prev' | 'next';
    /** 시리즈 카드는 1줄, 전체 이전/다음은 2줄까지. */
    clamp: 1 | 2;
  } = $props();

  const card = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
    flex: '1',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    rounded: 'card',
    p: '[16px]',
    textDecoration: 'none',
    transition: '[border-color 0.15s]',
    _hover: { borderColor: 'ink.borderStrong' },
  });

  // 다음 글 카드만 우측 정렬. 모바일은 세로 스택이라 좌측 정렬을 유지한다.
  const nextAlign = css({
    alignItems: { base: 'flex-start', md: 'flex-end' },
    textAlign: { base: 'left', md: 'right' },
  });

  const labelStyle = css({
    fontFamily: 'mono',
    fontSize: '[12px]',
    color: 'ink.500',
  });

  // 줄 수는 값이 둘뿐이라 미리 만들어 둔다 — Panda는 정적 추출이라 `lineClamp`에
  // 변수를 넘길 수 없다.
  const titleClamp = {
    1: css({ fontSize: '[14px]', fontWeight: 'medium', color: 'accent.600', lineClamp: 1 }),
    2: css({ fontSize: '[14px]', fontWeight: 'medium', color: 'accent.600', lineClamp: 2 }),
  } as const;
</script>

<a {href} class={direction === 'next' ? cx(card, nextAlign) : card}>
  <span class={labelStyle}>{label}</span>
  <span class={titleClamp[clamp]}>{title}</span>
</a>
