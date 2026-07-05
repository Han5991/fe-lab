import { css } from '@design-system/ui-lib/css';
import type { PostStatus } from '@/domain/post/types';

interface Props {
  status: PostStatus;
  scheduledDate?: string;
}

export function PreviewBanner({ status, scheduledDate }: Props) {
  const label =
    status === 'draft'
      ? 'Draft Preview — 비공개 (status: draft)'
      : status === 'scheduled'
        ? `Scheduled Preview — 예약 발행 (${scheduledDate ?? '날짜 없음'})`
        : 'Published Preview';

  return (
    <div
      role="status"
      className={css({
        position: 'sticky',
        top: '0',
        zIndex: 100,
        bg: 'marker.600',
        color: '[#0d1117]',
        textAlign: 'center',
        py: '2',
        px: '4',
        fontSize: 'sm',
        fontWeight: 'semibold',
        boxShadow: 'sm',
      })}
    >
      🔒 {label} — 이 페이지는 dev 환경에서만 노출됩니다
    </div>
  );
}
