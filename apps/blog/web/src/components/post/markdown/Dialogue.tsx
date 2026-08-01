import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

import { markdownChildren } from './signatureProps';

/**
 * `<dialogue>` / `<msg>` — 도입부 슬랙·구두 대화 재현.
 *
 * 본문에서는 raw HTML 커스텀 태그로 쓴다:
 *
 * ```html
 * <dialogue>
 * <msg from="PM">배포하다 서비스 죽으면 어떡해요?</msg>
 * <msg from="me">아니요, 점심에 합니다.</msg>
 * </dialogue>
 * ```
 */

// from="me" 판정. 글에서 한글로 쓰는 경우까지 흡수한다 — 마크다운 저자가
// 매번 영어 키워드를 기억하게 만들 이유가 없다.
const ME_ALIASES = new Set(['me', 'i', '나', '저']);

function isMine(from: string | undefined): boolean {
  return from !== undefined && ME_ALIASES.has(from.trim().toLowerCase());
}

/**
 * 아바타 이니셜.
 *
 * 레퍼런스 화면의 아바타는 "PM"처럼 두 글자다. 사람 이름("한상욱", "Alice")은 첫
 * 글자만 쓰는 게 자연스럽지만 PM·QA·CTO 같은 대문자 약어는 통째로 보여야 읽히므로,
 * "짧은 라틴 대문자 약어"만 예외로 원문을 유지한다.
 */
function avatarInitial(from: string | undefined): string {
  const name = (from ?? '').trim();
  if (name.length === 0) return '?';
  if (isMine(from)) return '나';
  if (name.length <= 3 && /^[A-Z]+$/.test(name)) return name;
  // 서로게이트 페어(이모지 등)가 반 토막 나지 않도록 코드포인트 단위로 자른다.
  return Array.from(name)[0];
}

const row = css({
  display: 'flex',
  gap: '2.5',
  alignItems: 'flex-start',
  mb: '2.5',
  // 마지막 말풍선 아래 여백은 컨테이너가 책임진다(레퍼런스 두 번째 행에는 mb 없음).
  _last: { mb: '0' },
});

const rowMine = css({ flexDirection: 'row-reverse' });

const avatarBase = css({
  boxSize: '[30px]',
  rounded: 'pill',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '[12px]',
  fontWeight: 'semibold',
  lineHeight: 'flat',
  flexShrink: '0',
});

const avatarOther = css({ bg: 'warn.bg', color: 'warn.text' });
// 포인트 틸을 "글자"로 쓰므로 AA 확보를 위해 accent.600(스펙 §3)을 쓴다.
const avatarMine = css({ bg: 'accent.50', color: 'accent.600' });

const bubbleBase = css({
  // 12px = radii.card. 레퍼런스 말풍선 라운드가 카드와 같은 값이라 토큰을 재사용한다.
  rounded: 'card',
  px: '3',
  py: '2',
  fontSize: '[13px]',
  lineHeight: 'relaxed',
  maxW: '[420px]',
  minW: '0',
  // 본문 스타일(`& p { margin-bottom }`)이 말풍선 안까지 내려오므로 마지막 블록만 끈다.
  '& > *:last-child': { mb: '0' },
});

const bubbleOther = css({ bg: 'paper.100', color: 'ink.900' });
const bubbleMine = css({ bg: 'accent.50', color: 'accent.600' });

interface MsgProps {
  from?: string;
  children?: ReactNode;
}

export function Msg({ from, children }: MsgProps) {
  const mine = isMine(from);

  return (
    // data-speaker: 정렬·색이 전부 이 분기에서 갈리므로 DOM에도 드러낸다(디버깅·테스트용).
    <div
      data-speaker={mine ? 'me' : 'other'}
      className={mine ? `${row} ${rowMine}` : row}
    >
      <span
        // 이니셜은 장식이고 화자 정보는 aria-label이 전달한다(스크린리더가 "ㅍ" 하나를
        // 읽어봐야 의미가 없다).
        aria-label={from ? `${from} 발언` : undefined}
        role={from ? 'img' : undefined}
        className={`${avatarBase} ${mine ? avatarMine : avatarOther}`}
      >
        {avatarInitial(from)}
      </span>
      {/* 레퍼런스는 말풍선이 <span>이지만, 마크다운 본문이 들어오면 안에 <p>가 생길 수
          있어 <div>로 둔다(span > p는 무효 중첩 → hydration 불일치). */}
      <div className={`${bubbleBase} ${mine ? bubbleMine : bubbleOther}`}>
        {children}
      </div>
    </div>
  );
}

interface DialogueProps {
  children?: ReactNode;
}

export function Dialogue({ children }: DialogueProps) {
  return (
    <div
      className={css({
        borderLeftWidth: '[2px]',
        borderLeftColor: 'ink.border',
        pl: '4',
        py: '1',
        mb: '[22px]',
        fontFamily: 'sans',
      })}
    >
      {markdownChildren(children)}
    </div>
  );
}
