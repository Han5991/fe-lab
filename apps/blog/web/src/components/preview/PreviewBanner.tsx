import { css } from '@design-system/ui-lib/css';
import type { PostStatus } from '@/domain/post/types';

interface Props {
  status: PostStatus;
  scheduledDate?: string;
  date?: string | null;
}

/**
 * 이 배너는 admin 배지와 달리 **status(발행 의도)를 그대로** 보여줍니다.
 * `/preview`는 "아직 안 나간 글이 어떻게 보이는지" 확인하는 dev 전용 화면이라,
 * 파일에 뭐라고 적혀 있는지가 궁금한 정보이기 때문입니다.
 * "지금 공개인가"를 보여주는 쪽은 `resolvePostState`를 쓰는 admin 배지입니다.
 */
export function PreviewBanner({ status, scheduledDate, date }: Props) {
  // scheduledDate는 시각까지 지정할 때만 쓰는 선택 필드라 대부분의 예약 글에는
  // 없습니다. 폴백 없이 scheduledDate만 보면 그 글들이 전부 "날짜 없음"이 됩니다.
  const publishAt = scheduledDate ?? date;
  const label =
    status === 'draft'
      ? 'Draft Preview — 비공개 (status: draft)'
      : status === 'scheduled'
        ? `Scheduled Preview — 예약 발행 (${publishAt ?? '날짜 없음'})`
        : 'Published Preview';

  return (
    <div
      role="status"
      className={css({
        position: 'sticky',
        top: '0',
        zIndex: 100,
        bg: 'marker.600',
        color: 'paper.50',
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
