import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post/types';

/**
 * 공개 시각 판정에 필요한 필드를 **한 덩어리로** 받습니다.
 * 필드를 낱개로 받으면 호출부에서 하나를 빠뜨려도 타입이 통과합니다 —
 * 실제로 `date`를 안 넘기는 호출부가 있어 예약 글 배너가 "날짜 없음"으로 떴습니다.
 * (`HiddenPostBadge`도 같은 이유로 post를 통째로 받습니다)
 */
interface Props {
  post: Pick<PostSummary, 'status' | 'scheduledDate' | 'date'>;
}

/**
 * 이 배너는 admin 배지와 달리 **status(발행 의도)를 그대로** 보여줍니다.
 * `/preview`는 "아직 안 나간 글이 어떻게 보이는지" 확인하는 dev 전용 화면이라,
 * 파일에 뭐라고 적혀 있는지가 궁금한 정보이기 때문입니다.
 * "지금 공개인가"를 보여주는 쪽은 `resolvePostState`를 쓰는 admin 배지입니다.
 */
export function PreviewBanner({ post }: Props) {
  const { status } = post;
  // scheduledDate는 시각까지 지정할 때만 쓰는 선택 필드라 대부분의 예약 글에는
  // 없습니다. 폴백 없이 scheduledDate만 보면 그 글들이 전부 "날짜 없음"이 됩니다.
  const publishAt = post.scheduledDate ?? post.date;
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
        borderBottomWidth: 'hairline',
        borderColor: 'ink.border',
      })}
    >
      🔒 {label} — 이 페이지는 dev 환경에서만 노출됩니다
    </div>
  );
}
