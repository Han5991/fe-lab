/**
 * dev 전용 미리보기 배너의 라벨 규칙.
 *
 * 이 배너는 admin 배지와 반대로 **status 원문**을 보여줍니다(발행 의도 확인용).
 * 다만 공개 시각은 `scheduledDate ?? date`로 폴백해야 합니다 — scheduledDate는
 * 시각까지 지정할 때만 쓰는 선택 필드라, 폴백이 없으면 date만 가진 예약 글이
 * 전부 "날짜 없음"으로 표시됩니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewBanner } from './PreviewBanner';

const bannerText = () => screen.getByRole('status').textContent ?? '';

describe('PreviewBanner', () => {
  test('draft는 비공개 배너를 보여준다', () => {
    render(<PreviewBanner status="draft" />);
    expect(bannerText()).toContain('Draft Preview');
  });

  test('published는 발행 배너를 보여준다', () => {
    render(<PreviewBanner status="published" date="2026-03-03" />);
    expect(bannerText()).toContain('Published Preview');
  });

  test('scheduled: scheduledDate가 있으면 그 값을 공개 시각으로 보여준다', () => {
    render(
      <PreviewBanner
        status="scheduled"
        scheduledDate="2026-05-24T09:00:00+09:00"
      />,
    );
    expect(bannerText()).toContain('예약 발행 (2026-05-24T09:00:00+09:00)');
  });

  test('scheduled(회귀): scheduledDate가 없으면 date로 폴백한다', () => {
    // 이 폴백이 없으면 date만 가진 예약 글이 전부 "날짜 없음"으로 뜬다.
    render(<PreviewBanner status="scheduled" date="2026-03-03" />);
    expect(bannerText()).toContain('예약 발행 (2026-03-03)');
    expect(bannerText()).not.toContain('날짜 없음');
  });

  test('scheduled: scheduledDate가 date보다 우선한다', () => {
    render(
      <PreviewBanner
        status="scheduled"
        scheduledDate="2026-05-24"
        date="2020-01-01"
      />,
    );
    expect(bannerText()).toContain('예약 발행 (2026-05-24)');
    expect(bannerText()).not.toContain('2020-01-01');
  });

  test('scheduled: 공개 시각이 아예 없으면 날짜 없음', () => {
    render(<PreviewBanner status="scheduled" date={null} />);
    expect(bannerText()).toContain('날짜 없음');
  });
});
