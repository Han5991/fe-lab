'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';
import { css } from '@blog/styled-system/css';
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
/** 이보다 위로는 버튼을 올리지 않는다 — 사이트 헤더(56px) 아래에서 8px. */
const TOP_LIMIT = 64;
/** 버튼과 화면 좌우 끝 사이의 최소 여백 */
const MARGIN = 8;
/**
 * 버튼을 누른 직후 선택이 풀려도 버튼을 거두지 않는 시간(ms). 터치 화면은 탭이
 * 선택을 먼저 풀고 click이 뒤따르는데, 그 사이에 버튼이 사라지면 탭이 허공을 친다.
 */
const PRESS_GRACE_MS = 800;
/** 복사 결과를 보여 준 뒤 버튼을 거두기까지(ms) */
const SETTLE_MS = 1600;

/** text: 그 문장 · section: 선택이 속한 섹션의 헤딩 · article: 헤딩보다 앞이라 글 주소 */
type Copied = 'text' | 'section' | 'article' | 'failed';
/** 실제로 복사한 링크의 종류(실패 전) — GA4 `quote_link_copy`의 kind이기도 하다. */
type CopiedLink = Exclude<Copied, 'failed'>;

const LABEL: Record<Copied | 'idle', string> = {
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
          style={{
            top: anchor.top,
            left: anchor.left,
            transform: centerWithin(anchor),
          }}
          className={css({
            pos: 'fixed',
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
          {copied && copied !== 'failed' ? (
            <Check size={14} aria-hidden />
          ) : (
            <Link2 size={14} aria-hidden />
          )}
          {copied ? LABEL[copied] : LABEL.idle}
        </button>
      )}
    </>
  );
}
