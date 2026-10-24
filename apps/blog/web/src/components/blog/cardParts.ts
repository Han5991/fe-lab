import { css, cx } from '@blog/styled-system/css';

// 글 카드(`PostCard`)와 썸네일 행(`PostThumbRow`)이 함께 쓰는 조각 — "카드 전체가 링크 하나"인 구조와
// 커버 틀. 라운드처럼 자리마다 다른 값은 쓰는 쪽이 `css(조각, { … })`로 병합한다(`cx`는 충돌하는 원자
// 클래스를 병합하지 않는다 — postRow.ts와 같은 규칙).
//
// 링크가 하나인 이유: 커버와 제목에 링크를 따로 걸면(승인 목업이 그렇다) 탭 정지점이 둘, 스크린리더가
// 읽는 같은 곳 링크도 둘이 된다. 그래서 제목만 링크이고, 그 링크의 덮개(::after)가 카드 뿌리 전체를
// 덮어 커버·발췌·메타 어디를 눌러도 그 링크다. 커버 `<img>`는 `alt=""` — 바로 옆 제목이 이름이다.

/**
 * 카드 뿌리에 다는 클래스. 제목 링크의 덮개가 이 상자를 기준으로 퍼지고(`position: relative`), 커버
 * hover 틴트가 이 상자의 hover를 본다(`group`). 둘을 한 클래스로 묶어 둔다 — 틴트만 따로 빠뜨리면
 * 조용히 꺼지지만, 이 클래스를 빠뜨리면 덮개가 카드 밖으로 퍼져 바로 드러난다. 배치(flex·gap)는 쓰는
 * 쪽이 `cx`로 더한다 — 겹치는 속성이 없어 원자 클래스가 겨루지 않는다.
 */
export const cardRoot = cx('group', css({ pos: 'relative' }));

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
 * 제목 밑줄 대신 커버로 반응한다(승인 목업).
 */
export const coverFrameRaw = css.raw({
  pos: 'relative',
  flexShrink: '0',
  overflow: 'hidden',
  aspectRatio: 'wide',
  bg: 'paper.100',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'ink.border',
  _after: {
    content: '""',
    pos: 'absolute',
    inset: '0',
    bg: 'accent.muted',
    opacity: '0',
    transition: 'opacity',
  },
  _groupHover: { _after: { opacity: '1' } },
});

/** 틀을 채우는 이미지. 정사각 썸네일은 가운데가 남고 위아래가 잘린다(카드는 크롭을 받아들인다). */
export const coverImage = css({
  display: 'block',
  w: 'full',
  h: 'full',
  objectFit: 'cover',
});
