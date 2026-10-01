'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import {
  probeModel,
  readLanguageModel,
  type LanguageModelApi,
  type ModelProbe,
} from './promptApi';
import { trackDiscussion } from './discussionEvents';

// 패널(대화 로직·UI)은 열 때만 받는다. 이 기능을 쓸 수 있는 건 데스크톱
// Chrome·Edge뿐이라, 나머지 독자에게는 감지 코드만 실린다.
const DiscussionPanel = dynamic(
  () => import('./DiscussionPanel').then(m => m.DiscussionPanel),
  { ssr: false },
);

const PANEL_ID = 'post-discussion-panel';

interface Ready {
  api: LanguageModelApi;
  probe: ModelProbe;
}

interface PostDiscussionProps {
  postTitle: string;
  /** 브라우저 내장 모델을 찾는다. 테스트가 가짜를 주입하는 자리다. */
  getModel?: () => LanguageModelApi | undefined;
}

/**
 * AI 토론(실험) — 브라우저 내장 언어 모델(Prompt API)로 지금 읽는 섹션을 두고
 * 이야기한다. 서버도 키도 없고, 질문과 본문은 기기 밖으로 나가지 않는다.
 *
 * **쓸 수 없는 브라우저에서는 아무것도 그리지 않는다.** 서버 렌더와 첫
 * 클라이언트 렌더는 언제나 null이고(하이드레이션 불일치 없음), 감지가 끝나
 * 모델을 쓸 수 있을 때만 런처가 나타난다.
 */
export function PostDiscussion({
  postTitle,
  getModel = readLanguageModel,
}: PostDiscussionProps) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const api = getModel();
    if (!api) {
      trackDiscussion('discussion_probe_none');
      return;
    }
    let cancelled = false;
    void probeModel(api).then(probe => {
      trackDiscussion(`discussion_probe_${probe.availability}`, {
        language: probe.korean ? 'ko' : 'none',
      });
      if (!cancelled && probe.availability !== 'unavailable') {
        setReady({ api, probe });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [getModel]);

  if (!ready) return null;

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  return (
    <>
      {open && (
        <DiscussionPanel
          id={PANEL_ID}
          api={ready.api}
          probe={ready.probe}
          postTitle={postTitle}
          onClose={close}
        />
      )}
      <button
        ref={launcherRef}
        type="button"
        // 좁은 화면에서는 글자를 숨긴 원형 아이콘 버튼이 된다 — 이름은 그대로 둔다.
        aria-label="AI와 토론"
        aria-expanded={open}
        // 패널은 열려 있을 때만 DOM에 있다 — 없는 id를 가리키지 않는다.
        aria-controls={open ? PANEL_ID : undefined}
        onClick={() => {
          if (!open) trackDiscussion('discussion_open');
          setOpen(!open);
        }}
        className={css({
          pos: 'fixed',
          right: '6',
          // 떠 있는 버튼 기둥의 맨 위에 8px 간격으로 선다(맨 위로·차례 버튼과 같은
          // 간격). lg 아래는 차례 버튼(MobileTOC: bottom 80px, 48px)이 기둥 위에
          // 있어 그 위로, lg부터는 차례 버튼이 사라진 그 자리(80px)에 선다.
          bottom: { base: '[136px]', lg: '20' },
          zIndex: '40',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2',
          // 기둥의 다른 버튼과 같은 48px. 좁은 화면은 원형, md부터 글자를 단 알약.
          h: '12',
          w: { base: '12', md: 'auto' },
          px: { base: '0', md: '5' },
          rounded: 'full',
          fontFamily: 'sans',
          fontSize: 'sm',
          fontWeight: 'medium',
          color: 'ink.900',
          bg: 'paper.100',
          // 떠 있는 버튼이지만 그림자 대신 hairline 보더로 본문과 분리한다.
          borderWidth: 'hairline',
          borderColor: 'ink.borderStrong',
          cursor: 'pointer',
          _hover: { color: 'accent.600', borderColor: 'accent.200' },
          _expanded: { bg: 'paper.200' },
        })}
      >
        <MessagesSquare size={20} aria-hidden />
        <span className={css({ display: { base: 'none', md: 'inline' } })}>
          AI와 토론
        </span>
      </button>
    </>
  );
}
