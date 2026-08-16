import { css } from '@design-system/ui-lib/css';
import { isPostVisible } from '@blog/content';
import type { PostSummary } from '@blog/content';

interface Props {
  post: Pick<PostSummary, 'status' | 'scheduledDate' | 'date'>;
}

/**
 * dev 서버에서 draft·scheduled 글이 목록에 섞여 나올 때 붙는 표시.
 *
 * 배지가 없으면 발행된 글과 구분이 되지 않아 "이미 나간 줄 알았는데 아니었다"
 * (또는 그 반대)가 생깁니다.
 *
 * `status`가 아니라 **실제 공개 여부**로 판정합니다. 예약일이 지난 scheduled
 * 글은 이미 공개된 상태라 배지가 붙으면 안 되기 때문입니다.
 * (`status`는 발행 의도일 뿐 현재 상태가 아닙니다 — visibility.ts 참고)
 *
 * 프로덕션 목록에는 공개 글만 들어오므로 이 컴포넌트는 아무것도 렌더하지 않지만,
 * 번들에서 완전히 빠지도록 NODE_ENV를 먼저 확인합니다.
 */
export function HiddenPostBadge({ post }: Props) {
  if (process.env.NODE_ENV !== 'development') return null;
  if (isPostVisible(post)) return null;

  const label =
    post.status === 'scheduled'
      ? `예약 ${post.scheduledDate ?? post.date ?? ''}`.trim()
      : 'DRAFT';

  return (
    <span
      className={css({
        display: 'inline-block',
        verticalAlign: 'middle',
        ml: '2',
        px: '1.5',
        py: '0.5',
        borderRadius: 'sm',
        bg: 'marker.600',
        color: 'paper.50',
        fontFamily: 'mono',
        fontSize: '[10px]',
        fontWeight: 'bold',
        letterSpacing: 'mono',
        whiteSpace: 'nowrap',
      })}
    >
      {label}
    </span>
  );
}
