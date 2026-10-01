import { sendGAEvent } from '@next/third-parties/google';

/**
 * AI 토론 사용 이벤트(GA4). 질문·답의 **내용은 싣지 않는다** — 세는 것만 한다.
 *
 * 상태를 매개변수가 아니라 **이벤트 이름**에 넣는다(`discussion_probe_available`).
 * GA4 화면에서 맞춤 매개변수를 보려면 맞춤 측정기준을 따로 등록해야 해서,
 * "방문자 중 몇 %가 이 기능을 쓸 수 있나"를 등록 없이 이벤트 보고서 하나로
 * 읽으려는 것이다.
 */
export type DiscussionEventName =
  | 'discussion_probe_none'
  | 'discussion_probe_unavailable'
  | 'discussion_probe_downloadable'
  | 'discussion_probe_downloading'
  | 'discussion_probe_available'
  | 'discussion_open'
  | 'discussion_send'
  | 'discussion_error';

/** GA가 실리는 프로덕션에서만 보낸다(errorReporting.ts와 같은 조건). */
export function trackDiscussion(
  name: DiscussionEventName,
  params: Record<string, string> = {},
): void {
  if (process.env.NODE_ENV === 'production') {
    sendGAEvent('event', name, params);
  }
}
