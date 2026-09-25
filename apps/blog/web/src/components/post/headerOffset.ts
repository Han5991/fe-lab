/**
 * 화면 맨 위에서 **고정 헤더가 덮는 높이.**
 *
 * 헤더는 `position: sticky; top: 0`으로 지면 위에 떠 있어서, 뷰포트 좌표로
 * 0에 가까운 헤딩은 화면 안에 있어도 실제로는 가려져 안 보인다. 세 곳이 이 값을
 * 같이 써야 서로 어긋나지 않는다.
 *
 *   - 앵커로 이동할 때 이만큼 더 올려 주는 값(`scrollToId`의 headerOffset)
 *   - 활성 구간을 셀 때 "여기부터가 진짜 보이는 곳"으로 삼는 값(`useTocHook`)
 *   - 본문 헤딩의 `scroll-margin-top`(PostBody) — 주소의 `#해시`로 바로 들어오거나
 *     브라우저 기본 앵커 이동을 탈 때 쓰인다
 *
 * `'use client'`가 없는 평범한 모듈에 두는 이유: 서버 컴포넌트(PostBody)가
 * 클라이언트 모듈(`tocHooks.tsx`)의 export를 가져오면 값이 아니라 클라이언트
 * 참조가 온다. 여기 두면 서버·클라이언트가 같은 숫자를 읽는다.
 */
export const HEADER_OFFSET = 100;
