import { RefreshCw } from 'lucide-react';
import { css } from '@blog/styled-system/css';
import { actionButton } from '../actionButton';
import { iconButton } from '../iconButton';

// 받는 동안은 누를 수 없다 — 기다리는 커서와 흐린 면.
const busy = css.raw({ _disabled: { cursor: 'wait', opacity: '0.6' } });

const labelClass = css(actionButton.raw({ tone: 'neutral', size: 'md' }), busy);
const iconClass = css(iconButton.raw({ tone: 'neutral', size: 'md' }), busy);

interface RefreshButtonProps {
  isFetching: boolean;
  onRefresh: () => void;
  /**
   * 글자 없이 아이콘만 — 분석 화면 머리처럼 검색·정렬과 한 줄에 들어야 하는 자리. 접근 이름과 툴팁은
   * 글자 버튼과 같다.
   */
  iconOnly?: boolean;
}

/** admin 데이터 새로고침 — 대시보드 「모든 글」 카드와 분석 화면 머리가 쓴다. */
export function RefreshButton({
  isFetching,
  onRefresh,
  iconOnly = false,
}: RefreshButtonProps) {
  const label = isFetching ? '새로고침 중…' : '새로고침';
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isFetching}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={iconOnly ? iconClass : labelClass}
    >
      <RefreshCw size={16} aria-hidden />
      {!iconOnly && label}
    </button>
  );
}

/** 새로고침이 실패했을 때 머리 설명 줄 아래에 붙는 안내 — 화면은 이전 데이터를 그대로 보인다. */
export function RefreshFailedNote() {
  return (
    <span
      role="status"
      className={css({ display: 'block', color: 'danger.text' })}
    >
      새로고침 실패 — 이전 데이터를 보여 주는 중
    </span>
  );
}
