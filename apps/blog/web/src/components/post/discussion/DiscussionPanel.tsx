'use client';

import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Pin, X } from 'lucide-react';
import { css, cx } from '@design-system/ui-lib/css';
import { useTocHook } from '@/src/components/tocHooks';
import { actionButton } from '@/src/components/actionButton';
import type { LanguageModelApi, ModelProbe } from './promptApi';
import {
  MAX_SECTION_CHARS,
  readSection,
  readWholePost,
  WHOLE_POST_ID,
  type Section,
} from './sectionText';
import { useSectionChat, type ChatPhase } from './useSectionChat';

export const PRESETS = [
  { label: '요약', prompt: '이 섹션의 핵심 주장을 세 줄로 요약해 줘.' },
  {
    label: '반론',
    prompt: '이 섹션의 주장에 반론을 제기해 줘. 어떤 조건에서 성립하지 않을까?',
  },
  {
    label: '더 생각할 질문',
    prompt: '이 섹션을 읽고 더 생각해 볼 만한 질문 세 가지를 던져 줘.',
  },
] as const;

interface TocItem {
  id: string;
  level: number;
}

/** 지금 읽는 위치(`activeId`)가 속한 최상위 헤딩. */
function readingSectionId(
  toc: TocItem[],
  activeId: string,
  topLevel: number,
): string | null {
  const index = toc.findIndex(item => item.id === activeId);
  for (let i = index; i >= 0; i -= 1) {
    const item = toc[i];
    if (item && item.level === topLevel) return item.id;
  }
  return toc.find(item => item.level === topLevel)?.id ?? null;
}

function readFromDocument(
  sectionId: string | null,
  postTitle: string,
): Section | null {
  const content = document.getElementById('post-content');
  if (!content) return null;
  if (sectionId === null || sectionId === WHOLE_POST_ID) {
    return readWholePost(content, postTitle);
  }
  return readSection(content, sectionId);
}

interface DiscussionPanelProps {
  id: string;
  api: LanguageModelApi;
  probe: ModelProbe;
  postTitle: string;
  onClose: () => void;
}

/**
 * AI 토론 패널 — 지연 로드된다(`PostDiscussion`이 열릴 때 받는다).
 *
 * 섹션은 **읽는 위치를 따라간다** — 대화 중에도 스크롤하면 바뀌고, 다음 질문은
 * 새 섹션을 근거로 앞선 대화를 이어 간다(useSectionChat). 한 섹션에 머물고
 * 싶으면 고정 버튼을 누른다.
 */
export function DiscussionPanel({
  id,
  api,
  probe,
  postTitle,
  onClose,
}: DiscussionPanelProps) {
  const titleId = useId();
  const inputId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toc, activeId } = useTocHook();
  /** 고정한 섹션. null이면 읽는 위치를 따라간다. */
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const topLevel = toc.length > 0 ? Math.min(...toc.map(i => i.level)) : 0;
  const sectionId = pinnedId ?? readingSectionId(toc, activeId, topLevel);
  const section = useMemo(
    () => readFromDocument(sectionId, postTitle),
    [sectionId, postTitle],
  );

  const { messages, phase, progress, error, usage, send, stop } =
    useSectionChat({
      api,
      languages: probe.languages,
      postTitle,
      section,
    });
  const busy = phase !== 'idle';
  const canAsk = section !== null && !busy;

  // 열리면 질문 칸으로 초점을 옮긴다(키보드로 연 사람이 바로 쓸 수 있게).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Esc는 초점이 패널 안이나 문서 바닥(body)에 있을 때만 닫는다 — 본문 이미지
  // 확대 같은 다른 대화상자는 초점을 자기 안에 쥐므로 그쪽 Esc는 가로채지 않는다.
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const focused = document.activeElement;
      const idle = focused === null || focused === document.body;
      if (!idle && !panelRef.current?.contains(focused)) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const togglePin = () => {
    setPinnedId(pinned => (pinned === null ? sectionId : null));
  };

  const ask = (text: string, kind: 'preset' | 'free') => {
    if (!section) return;
    // send는 create() 전에 아무것도 기다리지 않는다 — 클릭·엔터의 사용자
    // 동작이 살아 있는 동안 모델 내려받기를 시작해야 한다.
    void send(text, kind);
    // 누른 버튼은 답하는 동안 비활성이 돼 초점이 body로 떨어진다. 이어서
    // 물을 자리로 옮겨 둔다.
    inputRef.current?.focus();
  };

  const askDraft = () => {
    if (!canAsk || !draft.trim()) return;
    ask(draft, 'free');
    setDraft('');
  };

  const status = statusText(phase, progress, probe, messages.length > 0);
  const meta = [
    usage
      ? `컨텍스트 ${usage.used.toLocaleString()} / ${usage.total.toLocaleString()} 토큰`
      : null,
    probe.korean ? 'ko' : '언어 힌트 없음',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <section
      ref={panelRef}
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      className={css({
        pos: 'fixed',
        display: 'flex',
        flexDir: 'column',
        bg: 'paper.50',
        overflow: 'hidden',
        fontFamily: 'sans',
        color: 'ink.900',
        // 그림자 대신 hairline 보더로 본문과 분리한다(BackToTop·MobileTOC와 같다).
        borderColor: 'ink.borderStrong',
        borderTopWidth: 'hairline',
        roundedTop: 'card',
        // md 미만: 화면 아래에 붙는 시트(MobileTOC 드로어와 같은 모양). 떠 있는
        // 버튼 기둥까지 덮도록 그보다 위에 쌓는다. 높이를 화면의 2/3로 묶어 위쪽에
        // 본문이 남는다 — 모달이 아니라서 시트를 연 채로 글을 스크롤하며 물을 수 있다.
        left: { base: '0', md: '[auto]' },
        right: { base: '0', md: '6' },
        bottom: { base: '0', md: '[192px]', lg: '[136px]' },
        zIndex: { base: '50', md: '40' },
        w: { base: 'full', md: '[min(380px, calc(100vw - 48px))]' },
        // md 이상: 버튼 기둥 위에 뜬 패널. 런처(48px) 위 8px에서 시작하고(런처 자리는
        // PostDiscussion 참고), 위로는 헤더(64px)와 여백을 남긴다.
        maxH: {
          base: '[66dvh]',
          md: '[min(600px, calc(100dvh - 272px))]',
          lg: '[min(600px, calc(100dvh - 216px))]',
        },
        borderLeftWidth: { base: '[0]', md: 'hairline' },
        borderRightWidth: { base: '[0]', md: 'hairline' },
        borderBottomWidth: { base: '[0]', md: 'hairline' },
        roundedBottom: { base: '[0]', md: 'card' },
      })}
    >
      <header
        className={css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: '3',
          px: '4',
          pt: '4',
          pb: '3',
          borderBottomWidth: 'hairline',
          borderColor: 'ink.border',
        })}
      >
        <div className={css({ flex: '1', minW: '0' })}>
          <h2
            id={titleId}
            className={css({
              fontSize: 'md',
              fontWeight: 'semibold',
              color: 'ink.950',
            })}
          >
            AI와 토론{' '}
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: 'xs',
                letterSpacing: 'mono',
                fontWeight: 'normal',
                color: 'ink.500',
              })}
            >
              실험
            </span>
          </h2>
          <p className={css({ mt: '1', fontSize: 'xs', color: 'ink.600' })}>
            이 기기의 브라우저 내장 모델이 답해요. 글쓴이의 의견이 아니고 틀릴
            수 있어요. 질문은 기기 밖으로 나가지 않아요.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="토론 닫기"
          className={css({
            flexShrink: '0',
            // 시트(터치)에서는 누를 자리를 넓힌다.
            p: { base: '2', md: '1' },
            rounded: 'control',
            color: 'ink.600',
            cursor: 'pointer',
            _hover: { color: 'ink.950', bg: 'paper.100' },
          })}
        >
          <X size={18} aria-hidden />
        </button>
      </header>

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '2',
          px: '4',
          py: '2',
          borderBottomWidth: 'hairline',
          borderColor: 'ink.border',
        })}
      >
        <span
          className={css({
            flexShrink: '0',
            fontFamily: 'mono',
            fontSize: 'xs',
            letterSpacing: 'mono',
            color: 'ink.500',
          })}
        >
          섹션
        </span>
        <span
          title={section?.title}
          className={css({
            flex: '1',
            minW: '0',
            fontSize: 'sm',
            color: 'ink.900',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {section?.title ?? '—'}
        </span>
        {/* 헤딩이 없는 글은 본문 전체가 한 섹션이라 고정할 것이 없다. */}
        {toc.length > 0 && (
          <button
            type="button"
            aria-label="이 섹션에 고정"
            aria-pressed={pinnedId !== null}
            title={
              pinnedId === null
                ? '스크롤해도 이 섹션에 머문다'
                : '다시 읽는 위치를 따라간다'
            }
            disabled={section === null}
            onClick={togglePin}
            className={css({
              flexShrink: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '1',
              px: '2',
              py: { base: '1.5', md: '1' },
              fontSize: 'xs',
              color: 'ink.600',
              borderWidth: 'hairline',
              borderColor: 'ink.border',
              rounded: 'control',
              cursor: 'pointer',
              _hover: { borderColor: 'ink.borderStrong' },
              _pressed: {
                color: 'accent.600',
                bg: 'accent.50',
                borderColor: 'accent.200',
              },
              _disabled: { opacity: '0.5', cursor: 'default' },
            })}
          >
            <Pin size={12} aria-hidden />
            고정
          </button>
        )}
      </div>

      {section === null && (
        <p
          className={css({
            px: '4',
            pt: '3',
            fontSize: 'sm',
            color: 'ink.600',
          })}
        >
          이 위치의 섹션을 읽지 못했어요. 다른 섹션으로 스크롤해 주세요.
        </p>
      )}
      <div
        role="log"
        aria-label="대화"
        aria-busy={phase !== 'idle'}
        className={css({
          flex: '1',
          minH: '0',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          px: '4',
          py: '3',
          display: 'flex',
          flexDir: 'column',
          gap: '3',
          fontSize: 'sm',
          lineHeight: 'prose',
        })}
      >
        {section?.truncated && (
          <p className={css({ fontSize: 'xs', color: 'ink.500' })}>
            섹션이 길어 앞 {MAX_SECTION_CHARS.toLocaleString()}자만 모델에
            실어요.
          </p>
        )}
        {section && messages.length === 0 && (
          <div className={css({ color: 'ink.600' })}>
            <p>「{section.title}」에 대해 묻거나 반박해 보세요.</p>
            <p className={css({ mt: '1', fontSize: 'xs', color: 'ink.500' })}>
              스크롤하면 읽고 있는 섹션을 따라가요. 대화는 이어지고, 머물고
              싶으면 고정을 누르세요.
            </p>
          </div>
        )}
        {messages.map((message, i) => (
          <Fragment key={message.id}>
            {/* 대화가 섹션을 넘어가는 자리에 경계를 긋는다 — 어느 답이 어느
                섹션을 근거로 했는지가 보여야 한다. */}
            {message.role === 'user' &&
              messages[i - 1]?.sectionId !== message.sectionId && (
                <p
                  className={css({
                    fontFamily: 'mono',
                    fontSize: 'xs',
                    letterSpacing: 'mono',
                    color: 'ink.500',
                    textAlign: 'center',
                  })}
                >
                  섹션 · {message.sectionTitle}
                </p>
              )}
            <div
              className={cx(
                css({ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }),
                message.role === 'user'
                  ? css({
                      alignSelf: 'flex-end',
                      maxW: '[85%]',
                      px: '3',
                      py: '2',
                      bg: 'paper.100',
                      rounded: 'control',
                    })
                  : css({ color: 'ink.900' }),
              )}
            >
              <span
                className={css({
                  display: 'block',
                  fontFamily: 'mono',
                  fontSize: 'xs',
                  letterSpacing: 'mono',
                  color: 'ink.500',
                })}
              >
                {message.role === 'user' ? '나' : 'AI'}
              </span>
              {message.text}
              {message.stopped && (
                <span className={css({ color: 'ink.500' })}> (멈춤)</span>
              )}
            </div>
          </Fragment>
        ))}
        {error && (
          <p role="alert" className={css({ color: 'danger.text' })}>
            {error}
          </p>
        )}
      </div>

      <div
        className={css({
          px: '4',
          pt: '3',
          // 시트일 때는 홈 인디케이터 영역만큼 더 띄운다.
          pb: { base: '[calc(16px + env(safe-area-inset-bottom))]', md: '4' },
          borderTopWidth: 'hairline',
          borderColor: 'ink.border',
          display: 'flex',
          flexDir: 'column',
          gap: '2',
        })}
      >
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              disabled={!canAsk}
              onClick={() => ask(preset.prompt, 'preset')}
              className={css({
                px: '3',
                py: '1',
                fontSize: 'xs',
                color: 'ink.800',
                bg: 'paper.100',
                borderWidth: 'hairline',
                borderColor: 'ink.border',
                rounded: 'control',
                cursor: 'pointer',
                _hover: { borderColor: 'ink.borderStrong' },
                _disabled: { opacity: '0.5', cursor: 'default' },
              })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            askDraft();
          }}
          className={css({ display: 'flex', gap: '2', alignItems: 'flex-end' })}
        >
          <label htmlFor={inputId} className={css({ srOnly: true })}>
            질문
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            value={draft}
            rows={2}
            placeholder="질문하거나 반박해 보세요"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              // 한글 조합 중의 엔터는 글자를 확정하는 키다 — 보내면 마지막
              // 글자가 잘리거나 두 번 보내진다.
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                askDraft();
              }
            }}
            className={css({
              flex: '1',
              minW: '0',
              resize: 'none',
              px: '3',
              py: '2',
              // 16px 미만이면 iOS Safari가 초점을 받을 때 화면을 확대한다.
              fontSize: { base: 'md', md: 'sm' },
              bg: 'paper.50',
              color: 'ink.900',
              borderWidth: 'hairline',
              borderColor: 'ink.border',
              rounded: 'control',
              _placeholder: { color: 'ink.400' },
            })}
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className={actionButton({ tone: 'secondary' })}
            >
              멈추기
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canAsk || !draft.trim()}
              className={cx(
                actionButton({ tone: 'primary' }),
                css({ _disabled: { opacity: '0.5', cursor: 'default' } }),
              )}
            >
              보내기
            </button>
          )}
        </form>
        <p
          aria-live="polite"
          className={css({
            minH: '[1lh]',
            fontFamily: 'mono',
            fontSize: 'xs',
            letterSpacing: 'mono',
            color: 'ink.500',
          })}
        >
          {status || meta}
        </p>
      </div>
    </section>
  );
}

function statusText(
  phase: ChatPhase,
  progress: number | null,
  probe: ModelProbe,
  started: boolean,
): string {
  if (phase === 'preparing') {
    return progress === null
      ? '모델을 여는 중…'
      : `모델 내려받는 중 ${Math.round(progress * 100)}%`;
  }
  if (phase === 'answering') return '답하는 중…';
  if (!started && probe.availability !== 'available') {
    return '첫 질문 때 브라우저가 모델(수 GB)을 한 번 내려받아요.';
  }
  return '';
}
