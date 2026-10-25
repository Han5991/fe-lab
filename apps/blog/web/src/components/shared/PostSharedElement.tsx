'use client';

import {
  useEffect,
  useSyncExternalStore,
  ViewTransition,
  type ReactElement,
} from 'react';
import {
  POST_OPEN_TRANSITION_TYPE,
  POST_SHARED,
  POST_SHARED_RESCALED,
  POST_SHARED_SIDE,
  postSharedName,
  type PostSharedPart,
  type PostSharedSide,
} from '@/src/shared/viewTransitions';

// ── 지금 열린 글 ──────────────────────────────────────────────────────────────
// 글 상세의 공유 요소가 마운트돼 있는 동안 그 글의 slug를 적는다. 상세에서 링크로 목록에 돌아갈
// 때 목록이 렌더되는 순간에는 상세가 아직 마운트돼 있으므로(지우기는 커밋 뒤 정리), 새 목록의 그
// 글 카드가 이 값을 보고 짝이 된다. 링크마다 type을 달지 않아도 상세를 떠나는 모든 링크(헤더 내비·
// 워드마크·태그·시리즈 목록)가 같은 규칙을 따른다.
let openSlug: string | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getOpenSlug = () => openSlug;
const getServerOpenSlug = () => null;

function setOpenSlug(slug: string | null) {
  if (openSlug === slug) return;
  openSlug = slug;
  for (const listener of listeners) listener();
}

interface PostSharedElementProps {
  part: PostSharedPart;
  slug: string;
  /**
   * 이름을 받을 요소 **하나**. React는 `<ViewTransition>` 아래 DOM 요소마다 이름을 붙이고 둘째부터
   * `_1`·`_2`를 덧붙이므로, 요소가 둘이면 짝의 이름이 어긋난다.
   */
  children: ReactElement;
  /**
   * 커버만 — 이 글의 카드 커버와 상세 히어로가 서로 다른 배율로 그려지는가(가로형이 아닌 자기 썸네일 글,
   * `!isWideThumbnail`). 참이면 짝의 클래스에 `POST_SHARED_RESCALED`가 붙어 겹치지 않고 차례로 바뀐다.
   * 카드와 상세가 **같은 값**을 줘야 한다 — 짝은 들어오는 쪽의 클래스만 받는다.
   */
  rescaled?: boolean | undefined;
}

const shareClass = (
  part: PostSharedPart,
  side: PostSharedSide,
  rescaled: boolean,
) =>
  `${POST_SHARED[part]} ${POST_SHARED_SIDE[side]}${rescaled ? ` ${POST_SHARED_RESCALED}` : ''}`;

/**
 * 글 카드와 글 상세에 걸쳐 이어지는 **공유 요소** — 카드의 커버·제목(`PostCardShared`)과 상세의
 * 히어로 이미지·h1(`PostDetailShared`)이 같은 `part`·`slug`로 감싸면, 그 사이의 내비게이션에서
 * 브라우저가 둘을 한 요소로 보고 자리·크기를 잇는다. 움직임의 모양은 `panda.config.ts` globalCss의
 * `::view-transition-*(.post-*)`.
 *
 * - `share`와 `default="none"`은 한 짝이다. `default="none"`이 없으면 이름 붙은 요소가 상관없는
 *   전환(다른 페이지로 가는 이동)마다 따로 찍혀 제 크로스페이드를 돌고, `share` 없이
 *   `default="none"`만 있으면 짝이 조용히 모핑을 멈춘다(Next view-transitions 가이드).
 * - 짝은 양쪽이 **화면 안에** 있을 때만 생긴다(React가 뷰포트 밖 요소의 이름을 거둔다) — 스크롤된
 *   목록에서 화면 밖 카드로 돌아가면 나가는 쪽만 남아 페이지와 함께 사라진다.
 * - 브라우저 뒤로·앞으로 가기에는 돌지 않는다 — React가 popstate의 전환을 동기로 끝내
 *   (스크롤 복원을 위해) View Transition을 열지 않는다. 링크 이동만 짝을 잇는다.
 * - **한 페이지에 같은 글의 카드는 하나다** — 이름은 `part`·`slug`로만 정해져, 같은 글의 카드가 둘이면
 *   짝이 될 때 같은 `view-transition-name`이 둘 생기고 브라우저가 그 전환을 통째로 건너뛴다(페이지
 *   전환까지 사라진다). 같은 글을 다시 그리는 섹션(추천 글 등)은 공유 요소 없이 그린다.
 */
export const PostCardShared = ({
  part,
  slug,
  children,
  rescaled = false,
}: PostSharedElementProps) => {
  const open = useSyncExternalStore(subscribe, getOpenSlug, getServerOpenSlug);
  const className = shareClass(part, 'card', rescaled);
  return (
    <ViewTransition
      name={postSharedName(part, slug)}
      // 이 카드를 눌러 글을 열 때(링크의 type)와, 이 글의 상세에서 떠나 올 때(열린 글)만 짝이 된다.
      share={
        open === slug
          ? className
          : { [POST_OPEN_TRANSITION_TYPE]: className, default: 'none' }
      }
      default="none"
    >
      {children}
    </ViewTransition>
  );
};

/** 글 상세 쪽 공유 요소 — 언제나 짝이 될 수 있고, 마운트돼 있는 동안 이 글을 "열린 글"로 적는다. */
export const PostDetailShared = ({
  part,
  slug,
  children,
  rescaled = false,
}: PostSharedElementProps) => {
  useEffect(() => {
    setOpenSlug(slug);
    return () => {
      if (openSlug === slug) setOpenSlug(null);
    };
  }, [slug]);
  return (
    <ViewTransition
      name={postSharedName(part, slug)}
      share={shareClass(part, 'detail', rescaled)}
      default="none"
    >
      {children}
    </ViewTransition>
  );
};
