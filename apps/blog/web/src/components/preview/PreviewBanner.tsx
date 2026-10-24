import { css } from '@blog/styled-system/css';
import { publishAtOf, type PostSummary } from '@blog/content/client';
import { siteHeaderStyle } from '../siteHeader';

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
 * dev 서버가 아직 안 나간 글을 실제 라우트로 열어줄 때 얹는 배너라,
 * 파일에 뭐라고 적혀 있는지가 궁금한 정보이기 때문입니다.
 * "지금 공개인가"를 보여주는 쪽은 `resolvePostState`를 쓰는 admin 배지입니다.
 */
export function PreviewBanner({ post }: Props) {
  const { status } = post;
  const publishAt = publishAtOf(post);
  const label =
    status === 'draft'
      ? 'Draft Preview — 비공개 (status: draft)'
      : status === 'scheduled'
        ? `Scheduled Preview — 예약 발행 (${publishAt ?? '날짜 없음'})`
        : 'Published Preview';

  return (
    <div
      role="status"
      style={siteHeaderStyle}
      className={css({
        // 사이트 헤더 아래에 붙는다 — 이 배너는 헤더보다 낮은 stacking context 안이라
        // top 0이면 헤더에 덮인다.
        position: 'sticky',
        top: '[var(--site-header-height)]',
        zIndex: 100,
        bg: 'accent.solid',
        color: 'accent.onSolid',
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
