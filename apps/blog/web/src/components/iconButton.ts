import { css, cva } from '@blog/styled-system/css';
import { pressButton } from './interaction';

/** 두 크기의 상자(28 · 32) — size 변형과 헤더의 반응형 크기(`headerIconButton`)가 함께 읽는다. */
const BOX_SIZE = { sm: '7', md: '8' } as const;

/**
 * 아이콘만 있는 버튼·링크 — Astryx IconButton(원형, padding 0)의 블로그 판. 아이콘은 장식이라
 * (lucide는 기본이 `aria-hidden`) 접근 이름은 쓰는 쪽이 `aria-label`로 준다. 글리프 크기는 쓰는 쪽이
 * 아이콘의 `size`로 고른다(헤더 18 · 푸터 16).
 *
 * - tone `ghost` — 면 없음, 글리프는 본문 잉크. hover에 지면 한 단계(paper.100)가 깔린다. 헤더.
 * - tone `neutral` — paper.200 면에 보조 잉크(ink.700). Astryx secondary 버튼과 같은 자리. 푸터 소셜.
 * - size `sm` 28 · `md` 32 — Astryx IconButton의 두 크기.
 *
 * 보더가 없다 — 강제 색상 모드(Windows 고대비)에서 면은 지워져도 글리프가 남아 버튼이 읽힌다.
 * 글자 버튼은 글자만 남으면 링크처럼 보여 투명 보더를 둔다(`actionButton`).
 */
export const iconButton = cva({
  base: {
    ...pressButton,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    p: '0',
    rounded: 'full',
    cursor: 'pointer',
  },
  variants: {
    tone: {
      ghost: {
        bg: 'transparent',
        color: 'ink.950',
        _hover: { bg: 'paper.100' },
      },
      neutral: {
        bg: 'paper.200',
        color: 'ink.700',
        _hover: { bg: 'paper.300', color: 'ink.950' },
      },
    },
    size: {
      sm: { boxSize: BOX_SIZE.sm },
      md: { boxSize: BOX_SIZE.md },
    },
  },
  defaultVariants: { tone: 'ghost', size: 'md' },
});

/**
 * 사이트 헤더 오른쪽 슬롯의 아이콘 버튼(검색·테마·GitHub·RSS) — ghost에 크기만 반응형이다.
 * md(768px) 미만은 28(sm), 이상은 32(md): 360px 기기(거터를 빼면 320px)에서도 워드마크·내비·아이콘이
 * 한 줄에 들어가게 한다(Layout의 헤더 주석). cva 변형은 반응형 값을 받지 않아(런타임이 문자열 키만
 * 고른다) 크기를 `BOX_SIZE`에서 직접 읽는다. 검색·테마 버튼은 각자의 모듈에 있어 여기서 나눠 쓴다.
 * 클래스 문자열이라 다른 스타일과 합치지 않는다(`cx`는 충돌하는 원자 클래스를 병합하지 않는다) —
 * 보이기·숨기기 같은 배치는 감싸는 요소가 맡는다.
 */
export const headerIconButton = css(
  iconButton.raw({ tone: 'ghost', size: 'md' }),
  { boxSize: { base: BOX_SIZE.sm, md: BOX_SIZE.md } },
);
