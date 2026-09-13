import type { DowDistribution, HourlyDistribution } from '@blog/analytics';
import type { Point } from './charts/geometry.ts';

/**
 * 분포 RPC의 **빈칸을 채운다.**
 *
 * `get_post_hourly_distribution`·`get_post_dow_distribution`은 `group by`라
 * **행이 있는 구간만** 돌려준다. 그걸 그대로 그리면 축이 접힌다 — 3시 막대
 * 옆에 17시 막대가 같은 폭으로 서고, 자리가 아무 뜻도 갖지 않는다. 조회수가
 * 적을수록 빈 구간이 많으므로 이 화면이 실제로 쓰이는 상황에서 더 자주 틀린다.
 *
 * React 판(`PostDetailClient.tsx`)이 같은 이유로 같은 일을 한다. 여기 떼어 둔
 * 이유는 테스트다 — 눈으로는 "이 시간대에 조회가 없나 보다"와 구분되지 않는다.
 */

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 요일 순서는 **월요일부터**다. RPC의 `dow`는 0=일이라 그대로 쓰면 일요일이 앞에 온다. */
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** 0~23시 24칸. 없는 시간대는 0. */
export function hourlyPoints(rows: HourlyDistribution[]): Point[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    label: `${hour}`,
    value: rows.find(row => row.hour === hour)?.view_count ?? 0,
  }));
}

/** 월~일 7칸. 없는 요일은 0. */
export function dowPoints(rows: DowDistribution[]): Point[] {
  return DOW_ORDER.map(dow => ({
    // DOW_ORDER의 값이 전부 0~6이라 인덱스 접근이 항상 맞는다 — 리터럴 튜플이라
    // 컴파일러도 그걸 안다(그래서 `??` 폴백이 죽은 코드로 잡힌다).
    label: DOW_LABELS[dow],
    value: rows.find(row => row.dow === dow)?.view_count ?? 0,
  }));
}
