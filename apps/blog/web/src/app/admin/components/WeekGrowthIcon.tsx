import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { css, cx } from '@design-system/ui-lib/css';

interface WeekGrowthIconProps {
  /** 7일 증감률(정수 %). null은 직전 주 조회가 0이라 비교할 수 없다는 뜻이다. */
  rate: number | null;
  size: number;
}

// 색은 가지마다 리터럴 css() 호출로 둔다 — Panda는 정적 추출이라 변수로 넘긴
// 값은 클래스를 만들지 못할 수 있다.
const TONES = {
  up: { Icon: TrendingUp, label: '증가', color: css({ color: 'moss.600' }) },
  down: {
    Icon: TrendingDown,
    label: '감소',
    color: css({ color: 'spot.600' }),
  },
  none: { Icon: Minus, label: '비교 불가', color: css({ color: 'ink.500' }) },
};

const wrapper = css({ display: 'inline-flex' });

/** 7일 증감률의 방향 아이콘 — null은 하락이 아니라 비교 불가다(`domain/analytics/delta.ts`). */
export function WeekGrowthIcon({ rate, size }: WeekGrowthIconProps) {
  const tone = rate === null ? TONES.none : rate >= 0 ? TONES.up : TONES.down;
  const { Icon } = tone;

  return (
    <span
      role="img"
      aria-label={tone.label}
      className={cx(wrapper, tone.color)}
    >
      <Icon size={size} aria-hidden />
    </span>
  );
}
