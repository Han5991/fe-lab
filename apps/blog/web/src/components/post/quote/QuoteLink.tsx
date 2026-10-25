'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';
import { css } from '@blog/styled-system/css';
import { SITE_HEADER_HEIGHT } from '../../siteHeader';
import { MorphSwap } from '../MorphSwap';
import {
  loadFragmentGenerator,
  type FragmentGenerator,
} from './fragmentGenerator';
import { headingBefore, quoteUrl, sectionUrl } from './textFragment';

/** 본문 DOM 계약 — PostBody의 `#post-content`(TOC와 같다). */
const CONTENT_ID = 'post-content';
/** 버튼 높이(px). 아래 CSS의 h(9 / 11)와 같은 값이어야 위치가 맞는다. */
const HEIGHT = { fine: 36, coarse: 44 } as const;
/** 선택과 버튼 사이 간격 */
const GAP = 8;
/** 이보다 위로는 버튼을 올리지 않는다 — 사이트 헤더 아래에서 GAP만큼. */
const TOP_LIMIT = SITE_HEADER_HEIGHT + GAP;
/** 버튼과 화면 좌우 끝 사이의 최소 여백 */
const MARGIN = 8;
/**
 * 버튼을 누른 직후 선택이 풀려도 버튼을 거두지 않는 시간(ms). 터치 화면은 탭이
 * 선택을 먼저 풀고 click이 뒤따르는데, 그 사이에 버튼이 사라지면 탭이 허공을 친다.
 */
const PRESS_GRACE_MS = 800;
/** 복사 결과를 보여 준 뒤 버튼을 거두기까지(ms) */
const SETTLE_MS = 1600;

/** text: 그 문장 · section: 선택이 속한 섹션의 헤딩 · article: 헤딩보다 앞이라 글 주소 · failed: 복사 실패 */
const COPIED = ['text', 'section', 'article', 'failed'] as const;
type Copied = (typeof COPIED)[number];
/** 실제로 복사한 링크의 종류(실패 전) — GA4 `quote_link_copy`의 kind이기도 하다. */
type CopiedLink = Exclude<Copied, 'failed'>;

/**
 * 버튼이 보여 주는 라벨의 종류 — 아직 누르지 않았거나(idle) 복사 결과. 라벨 집합은 고정이고(폭 보간
 * `labelTrack`이 라벨마다 칸을 미리 둔다) 값 목록이 `Face`의 출처라서, 새 결과를 더하면 칸도 함께 는다.
 */
const FACES = ['idle', ...COPIED] as const;
type Face = (typeof FACES)[number];

const LABEL: Record<Face, string> = {
  idle: '링크 복사',
  text: '링크를 복사했어요',
  section: '섹션 링크를 복사했어요',
  article: '글 링크를 복사했어요',
  failed: '복사하지 못했어요',
};

interface Anchor {
  top: number;
  /** 버튼 가운데가 오려는 x — 선택의 가로 중앙 */
  left: number;
  /** fixed 위치의 기준 폭(스크롤바 제외) */
  viewport: number;
}

function sameRange(a: Range, b: Range): boolean {
  return (
    a.compareBoundaryPoints(Range.START_TO_START, b) === 0 &&
    a.compareBoundaryPoints(Range.END_TO_END, b) === 0
  );
}

/** 선택이 `#post-content` 안에 있고 글자가 있을 때만 그 범위를 돌려준다. */
function readSelection(): Range | null {
  const selection = document.getSelection();
  const content = document.getElementById(CONTENT_ID);
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  if (!content) return null;
  const range = selection.getRangeAt(0);
  if (!content.contains(range.commonAncestorContainer)) return null;
  return range.toString().trim().length >= 2 ? range : null;
}

/**
 * 선택 위(터치 화면은 아래)에 버튼을 놓을 자리. 터치 화면은 OS의 선택 메뉴가
 * 선택 위에 뜨므로 그 반대로 간다. 자리가 없으면 뒤집는다.
 */
function placeFor(range: Range, coarse: boolean): Anchor | null {
  if (typeof range.getBoundingClientRect !== 'function') return null;
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const height = coarse ? HEIGHT.coarse : HEIGHT.fine;
  const above = rect.top - GAP - height;
  const below = rect.bottom + GAP;
  const fitsAbove = above >= TOP_LIMIT;
  const fitsBelow = below + height <= window.innerHeight - GAP;
  const top = coarse
    ? fitsBelow || !fitsAbove
      ? below
      : above
    : fitsAbove || !fitsBelow
      ? above
      : below;

  return {
    top,
    left: rect.left + rect.width / 2,
    viewport: document.documentElement.clientWidth,
  };
}

/**
 * 버튼을 `left`에 가운데 맞추되(-50%) 양 끝이 화면 여백 안에 들게 민다. 버튼
 * 폭은 라벨마다(복사하면 길어진다), 글꼴 크기 설정마다 달라서 픽셀 상수로는
 * 못 막는다 — translate의 %는 버튼 자신의 폭이라 브라우저가 실제 폭으로 계산한다.
 */
const centerWithin = ({ left, viewport }: Anchor) =>
  `translateX(clamp(${MARGIN - left}px, -50%, calc(${viewport - MARGIN - left}px - 100%)))`;

/**
 * 지금 주 입력이 터치인가. 마운트 때 한 번만 보지 않고 쓸 때마다 다시 본다 —
 * 터치·마우스 겸용 기기(터치스크린 노트북)는 입력이 바뀐다(matchMedia 한 번이라 싸다).
 */
const isCoarsePointer = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

/**
 * 알약 폭 보간 — 라벨이 바뀌면 폭이 새 라벨 길이로 미끄러진다. JS로 재지 않는다.
 *
 * 라벨마다 **칸 하나**(grid `0fr ↔ 1fr`)를 두고 보이지 않는 줄(`labelSizer`)에 나란히 놓는다. 켜진
 * 라벨의 칸만 1fr이라 줄의 폭이 그 라벨의 폭이고, 칸마다 같은 시간·곡선이 돌아 폭이 선형으로 오간다.
 * 보이는 라벨(`labelFace`)은 줄에 겹쳐 시작 가장자리에 붙고 opacity로 교차한다.
 *
 * 한 grid에 칸을 여럿 두면 안 된다(`1fr 0fr … ↔ 0fr 1fr …`) — 0이 아닌 fr이 둘 이상인 중간값에서
 * fr 하나의 크기가 가장 긴 라벨로 정해져 첫 프레임에 최대 폭으로 뛴다. 그래서 칸마다 grid가 따로다.
 *
 * 늘 때(복사 결과)는 fastMax, 줄 때(처음 라벨로)는 fast다 — 전환 시간은 바뀐 뒤의 스타일에서 읽히므로
 * 같은 순간에 바뀌는 칸들이 같은 값을 탄다. 움직임 줄이기는 두 토큰이 0.01ms가 되며 끈다.
 * 지원은 grid-template-columns 보간(Chrome 107·Safari 16·Firefox 66)이고, 그 아래는 폭이 즉시 바뀐다.
 */
const labelTrack = css({
  display: 'grid',
  gridTemplateColumns: '0fr',
  transitionProperty: 'grid-template-columns',
  transitionDuration: 'fastMax',
  transitionTimingFunction: 'standard',
  '[data-copied="idle"] &': { transitionDuration: 'fast' },
  '&[data-on]': { gridTemplateColumns: '1fr' },
  // 0fr 칸의 최소 크기는 auto라서 안쪽이 min-width: 0이 아니면 글자 폭 아래로 접히지 않는다.
  '& > *': { minW: '0', overflow: 'hidden' },
});

/** 보이지 않는 크기 재기 줄 — 칸들이 폭을 만들고 자신은 그려지지도 읽히지도 않는다. */
const labelSizer = css({ display: 'flex', visibility: 'hidden' });

/**
 * 보이는 라벨 — 줄에 겹쳐 시작 가장자리에 붙는다. 숨은 라벨은 `visibility`로 접근성 트리와 페이지 내
 * 찾기에서 빠지고(전환 중에는 visible로 보간돼 나가는 라벨이 끝에서 숨는다), 들어오는 라벨은
 * visibility를 전환 목록에서 빼 즉시 보이게 한다 — 안 그러면 전환 첫 순간에 두 라벨이 모두 hidden이라
 * 버튼 이름이 비는 틈이 생긴다.
 */
const labelFace = css({
  pos: 'absolute',
  insetInlineStart: '0',
  top: '0',
  opacity: '0',
  visibility: 'hidden',
  transitionProperty: 'opacity, visibility',
  transitionDuration: 'fast',
  transitionTimingFunction: 'standard',
  '&[data-on]': {
    opacity: '1',
    visibility: 'visible',
    transitionProperty: 'opacity',
  },
});

interface QuoteLinkProps {
  /** 텍스트 조각 생성기를 받는다. 테스트가 가짜를 주입하는 자리다. */
  loadGenerator?: () => Promise<FragmentGenerator>;
  /** 클립보드에 쓴다. 테스트가 가짜를 주입하는 자리다. */
  writeClipboard?: (text: string) => Promise<void>;
}

const writeToClipboard = (text: string) => navigator.clipboard.writeText(text);

/**
 * 문장 공유 링크 — 글에서 문장을 선택하면 버튼이 떠서, 누르면 그 문장으로
 * 바로 열리는 링크(`#:~:text=`)를 복사한다. 받은 사람의 브라우저가 그 문장으로
 * 스크롤하고 칠한다(`::target-text`, panda.config.ts globalCss). 서버도 저장도
 * 없다 — 링크 자체가 위치다.
 *
 * 조각을 유일하게 만들 수 없는 선택이면 그 섹션의 헤딩 링크를 대신 복사하고,
 * 버튼에 그렇다고 적는다.
 */
export function QuoteLink({
  loadGenerator = loadFragmentGenerator,
  writeClipboard = writeToClipboard,
}: QuoteLinkProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [copied, setCopied] = useState<Copied | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const generatorRef = useRef<FragmentGenerator | null>(null);
  const loadingRef = useRef<Promise<FragmentGenerator> | null>(null);
  /** 마지막으로 복사를 시작한 시각 — 누른 뒤 click이 왔는지 가린다. */
  const copyStartedAtRef = useRef(-Infinity);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** 키보드로 버튼에 오기 전에 포커스를 쥐고 있던 곳 — 버튼이 사라지면 돌려준다. */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  /**
   * 버튼이 포커스를 쥔 채 사라지면 포커스가 body로 떨어져 키보드·보조기기
   * 사용자가 자리를 잃는다. 버튼으로 오기 전 자리로 돌려준다(마우스·터치로 누르면
   * mousedown을 막아 버튼이 포커스를 받지 않으니 해당 없다).
   */
  const restoreFocus = useCallback(() => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (document.activeElement !== buttonRef.current) return;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, []);

  /** 생성기를 한 번만 받는다. 실패하면 다음 선택 때 다시 시도한다. */
  const ensureGenerator = useCallback(() => {
    loadingRef.current ??= loadGenerator().then(
      generate => {
        generatorRef.current = generate;
        return generate;
      },
      (error: unknown) => {
        loadingRef.current = null;
        throw error;
      },
    );
    return loadingRef.current;
  }, [loadGenerator]);

  useEffect(() => {
    let timer = 0;
    let frame = 0;
    let mouseDown = false;
    let pressedAt = -Infinity;
    let pressTimer = 0;

    const hide = () => {
      restoreFocus();
      rangeRef.current = null;
      setAnchor(null);
    };

    const evaluate = () => {
      const range = readSelection();
      if (!range) {
        hide();
        return;
      }
      const previous = rangeRef.current;
      if (!previous || !sameRange(previous, range)) setCopied(null);
      rangeRef.current = range.cloneRange();
      // 누르기 전에 받아 둔다 — 클립보드 쓰기는 클릭 안에서 동기로 해야
      // Safari가 허락한다(받는 걸 기다리면 사용자 동작이 끊긴다).
      ensureGenerator().catch(() => undefined);
      setAnchor(placeFor(range, isCoarsePointer()));
    };

    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(evaluate, delay);
    };

    const onSelectionChange = () => {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed) {
        // 버튼을 누르느라(터치) 또는 버튼으로 포커스를 옮기느라(키보드) 풀린
        // 선택이면 거두지 않는다 — 범위는 복제해 뒀다.
        if (performance.now() - pressedAt < PRESS_GRACE_MS) return;
        if (buttonRef.current && document.activeElement === buttonRef.current) {
          return;
        }
        window.clearTimeout(timer);
        hide();
        return;
      }
      // 마우스로 끄는 중에는 띄우지 않는다 — 놓을 때(pointerup) 한 번 본다.
      // 터치는 선택 손잡이를 끄는 동안 문서에 포인터 이벤트가 오지 않아
      // 변화가 멎은 뒤에 본다.
      if (!mouseDown) schedule(isCoarsePointer() ? 400 : 150);
    };

    const isOwnTarget = (target: EventTarget | null) =>
      target instanceof Node && buttonRef.current?.contains(target) === true;

    const onPointerDown = (e: PointerEvent) => {
      if (isOwnTarget(e.target)) {
        const at = performance.now();
        pressedAt = at;
        // 누르다 취소하면(손가락이 밀려나 click이 안 오면) 유예 동안 무시한
        // 선택 해제를 다시 봐 줄 이벤트가 없다 — 유예가 끝나면 한 번 본다.
        window.clearTimeout(pressTimer);
        pressTimer = window.setTimeout(() => {
          if (copyStartedAtRef.current >= at) return;
          if (readSelection()) return;
          if (document.activeElement === buttonRef.current) return;
          hide();
        }, PRESS_GRACE_MS);
        return;
      }
      if (e.pointerType === 'mouse') mouseDown = true;
    };
    const onPointerUp = () => {
      if (!mouseDown) return;
      mouseDown = false;
      schedule(0);
    };

    // 스크롤하면 선택도 화면에서 움직인다 — 버튼을 따라 옮긴다.
    const onViewportChange = () => {
      if (!rangeRef.current || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const range = rangeRef.current;
        if (range) setAnchor(placeFor(range, isCoarsePointer()));
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && rangeRef.current) hide();
    };

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onViewportChange, { passive: true });
    window.addEventListener('resize', onViewportChange);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(pressTimer);
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [ensureGenerator, restoreFocus]);

  // 결과를 잠깐 보여 준 뒤 버튼을 거둔다(선택은 그대로 둔다).
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => {
      restoreFocus();
      rangeRef.current = null;
      setAnchor(null);
      setCopied(null);
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [copied, restoreFocus]);

  const copy = () => {
    const range = rangeRef.current;
    const content = document.getElementById(CONTENT_ID);
    if (!range || !content) return;
    copyStartedAtRef.current = performance.now();

    const run = (generate: FragmentGenerator | null) => {
      const fragment = generate?.(range) ?? null;
      // 조각을 못 만들면 섹션 헤딩으로 물러나고, 헤딩보다 앞(도입부)이면 글
      // 주소로 물러난다 — 버튼 문구가 실제로 복사한 것과 맞아야 한다.
      const headingId = fragment
        ? null
        : headingBefore(content, range.startContainer);
      const kind: CopiedLink = fragment
        ? 'text'
        : headingId
          ? 'section'
          : 'article';
      const url = fragment
        ? quoteUrl(window.location, fragment)
        : sectionUrl(window.location, headingId);
      writeClipboard(url).then(
        () => {
          setCopied(kind);
          if (process.env.NODE_ENV === 'production') {
            sendGAEvent('event', 'quote_link_copy', { kind });
          }
        },
        () => setCopied('failed'),
      );
    };

    const generate = generatorRef.current;
    if (generate) {
      run(generate);
    } else {
      // 선택하자마자 눌러 아직 못 받았다 — 받은 뒤 쓴다(Safari는 이때 거절할
      // 수 있고, 그러면 "복사하지 못했어요"가 뜬다).
      ensureGenerator().then(run, () => run(null));
    }
  };

  const message = copied ? LABEL[copied] : '';
  const shown: Face = copied ?? 'idle';

  return (
    <>
      {/* 복사 결과를 스크린리더에 알린다. 미리 비워 둔 채로 있어야 바뀐 내용이 읽힌다. */}
      <p aria-live="polite" className={css({ srOnly: true })}>
        {message}
      </p>
      {anchor && (
        <button
          ref={buttonRef}
          type="button"
          onClick={copy}
          // 누르는 순간 선택이 풀리지 않게 한다(풀려도 범위는 복제해 둬서
          // 링크는 만들 수 있지만, 선택이 남아 있어야 무엇을 공유했는지 보인다).
          onMouseDown={e => e.preventDefault()}
          onFocus={e => {
            returnFocusRef.current =
              e.relatedTarget instanceof HTMLElement ? e.relatedTarget : null;
          }}
          // 포커스가 있는 동안은 선택이 풀려도 남겨 뒀다(위 selectionchange).
          // 복사하지 않고 떠나면 그때 거둔다 — 복사했으면 결과 표시 뒤에 거둔다.
          onBlur={() => {
            if (copied || readSelection()) return;
            returnFocusRef.current = null;
            rangeRef.current = null;
            setAnchor(null);
          }}
          data-copied={shown}
          style={{
            top: anchor.top,
            left: anchor.left,
            transform: centerWithin(anchor),
          }}
          className={css({
            pos: 'fixed',
            // 라벨 칸이 0fr까지 접히면 min-content가 0이라, left만 준 fixed 버튼이 shrink-to-fit에서
            // `화면 폭 − left`로 줄어든다(오른쪽 끝 선택에서 라벨이 잘린다) — 내용 폭을 고정한다.
            w: 'max',
            // 떠 있는 버튼(맨 위로·필터, 40) 위. 페이지에서 그것들보다 DOM이
            // 앞이라 같은 값이면 겹친 자리에서 가려진다.
            zIndex: '41',
            // 위 인라인 clamp를 못 읽는 브라우저의 폴백(가운데 맞춤만)
            transform: '[translateX(-50%)]',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5',
            h: '9',
            px: '3',
            rounded: 'full',
            // 본문 위에 뜨는 작은 도구 — 그림자 대신 지면과 반대 톤으로 띄운다.
            bg: 'ink.950',
            color: 'paper.50',
            fontFamily: 'sans',
            fontSize: 'sm',
            fontWeight: 'medium',
            whiteSpace: 'nowrap',
            // 길게 눌러도 버튼 글자가 선택되지 않게 한다(본문 선택이 바뀐다).
            userSelect: 'none',
            cursor: 'pointer',
            _hover: { bg: 'ink.800' },
            '@media (pointer: coarse)': { h: '11', px: '4' },
          })}
        >
          <MorphSwap
            on={copied !== null && copied !== 'failed'}
            before={<Link2 size={14} />}
            after={<Check size={14} />}
          />
          <span className={css({ pos: 'relative', display: 'flex' })}>
            <span className={labelSizer} aria-hidden>
              {FACES.map(face => (
                <span
                  key={face}
                  className={labelTrack}
                  data-on={face === shown ? '' : undefined}
                >
                  <span>{LABEL[face]}</span>
                </span>
              ))}
            </span>
            {FACES.map(face => (
              <span
                key={face}
                className={labelFace}
                data-on={face === shown ? '' : undefined}
                aria-hidden={face === shown ? undefined : true}
              >
                {LABEL[face]}
              </span>
            ))}
          </span>
        </button>
      )}
    </>
  );
}
