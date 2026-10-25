import { css, cx } from '@blog/styled-system/css';
import { pressCard } from '@/src/components/interaction';

// 글 카드(`PostCard`)와 썸네일 행(`PostThumbRow`)이 함께 쓰는 조각 — "카드 전체가 링크 하나"인 구조와
// 커버 틀. 라운드처럼 자리마다 다른 값은 쓰는 쪽이 `css(조각, { … })`로 병합한다(`cx`는 충돌하는 원자
// 클래스를 병합하지 않는다 — postRow.ts와 같은 규칙).
//
// 링크가 하나인 이유: 커버와 제목에 링크를 따로 걸면(승인 목업이 그렇다) 탭 정지점이 둘, 스크린리더가
// 읽는 같은 곳 링크도 둘이 된다. 그래서 제목만 링크이고, 그 링크의 덮개(::after)가 카드 뿌리 전체를
// 덮어 커버·발췌·메타 어디를 눌러도 그 링크다. 커버 `<img>`는 `alt=""` — 바로 옆 제목이 이름이다.

/**
 * 카드 뿌리에 다는 클래스. 제목 링크의 덮개가 이 상자를 기준으로 퍼지고(`position: relative`), 커버
 * hover 틴트가 이 상자의 hover를 본다(`group`). 마우스로 누르는 동안 카드가 99%로 줄어든다(`pressCard`).
 * 둘을 한 클래스로 묶어 둔다 — 틴트만 따로 빠뜨리면 조용히 꺼지지만, 이 클래스를 빠뜨리면 덮개가 카드 밖으로 퍼져 바로 드러난다. 배치(flex·gap)는 쓰는
 * 쪽이 `cx`로 더한다 — 겹치는 속성이 없어 원자 클래스가 겨루지 않는다.
 */
export const cardRoot = cx('group', css(pressCard, { pos: 'relative' }));

/**
 * 제목 링크. 쓰는 쪽이 블록으로 만든다 — 줄 수를 자르면 `lineClamp`(블록 상자를 낸다), 자르지 않으면
 * `display: 'block'`. 둘을 한 요소에 같이 주면 display 원자 클래스 둘이 겨룬다. 블록이라 키보드 초점
 * 링(globalCss `:focus-visible`)이 제목 상자를 두른다. 줄 수 제한을 부모 h3에 걸면 h3의
 * `overflow: hidden`이 그 초점 링을 자른다 — 링크 자신에 걸면 자기 outline은 잘리지 않는다. 덮개는 카드
 * 뿌리가 containing block이라 링크의 `overflow: hidden`에도 잘리지 않는다.
 */
export const cardLinkRaw = css.raw({
  color: 'ink.950',
  _after: { content: '""', pos: 'absolute', inset: '0' },
});

/**
 * 커버 틀 — 16:9 고정, hairline, 이미지가 늦게 와도 자리를 지키는 `paper.100` 면. 비율을 틀이 정하므로
 * 이미지가 오기 전후로 높이가 같다(CLS 0). hover에는 잉크 틴트(`accent.muted`)가 덮인다 — 카드 링크는
 * 제목 밑줄 대신 커버로 반응한다(승인 목업). 누르는 동안에는 틴트에 hairline이 한 단계 진해진다
 * (`ink.borderStrong`) — 터치에서는 hover가 곧 누름이라 틴트가, hairline은 `_groupPress`가 모든 포인터에
 * 더한다.
 *
 * hairline은 틀의 보더가 아니라 이미지 **위에** 그린 선이다(`_before`) — 이미지가 틀 가장자리까지
 * 찬다. 틀은 글 상세 히어로로 이어지는 공유 요소라(`PostCardShared`), 전환 중 카드 스냅샷과 히어로
 * 스냅샷이 원본의 같은 부분을 같은 배율로 그리려면 둘 다 이미지가 스냅샷 끝까지 차 있어야 한다
 * (panda.config.ts globalCss의 커버 규칙). 진짜 보더는 이미지를 사방 1px 안으로 밀어 이미지 상자가
 * 16:9에서 벗어나고, 겹친 두 스냅샷이 최대 4px 어긋나 이미지 속 글자가 두 겹으로 보였다(실측).
 */
export const coverFrameRaw = css.raw({
  pos: 'relative',
  flexShrink: '0',
  overflow: 'hidden',
  aspectRatio: 'wide',
  bg: 'paper.100',
  _before: {
    content: '""',
    pos: 'absolute',
    inset: '0',
    // 틀의 라운드를 따라 돈다 — 틀의 자르기는 직사각 선의 모서리를 곡선 밖에서 끊을 뿐이다.
    rounded: 'inherit',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    pointerEvents: 'none',
    transition: 'colors',
  },
  _after: {
    content: '""',
    pos: 'absolute',
    inset: '0',
    bg: 'accent.muted',
    opacity: '0',
    transition: 'opacity',
  },
  _groupHover: { _after: { opacity: '1' } },
  _groupPress: { _before: { borderColor: 'ink.borderStrong' } },
});

/** 틀을 채우는 이미지. 정사각 썸네일은 가운데가 남고 위아래가 잘린다(카드는 크롭을 받아들인다). */
export const coverImage = css({
  display: 'block',
  w: 'full',
  h: 'full',
  objectFit: 'cover',
});
