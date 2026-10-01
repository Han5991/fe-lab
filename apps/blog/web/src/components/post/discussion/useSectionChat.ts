'use client';

import { useEffect, useRef, useState } from 'react';
import {
  readUsage,
  type ContextUsage,
  type LanguageModelApi,
  type LanguageOptions,
  type ModelSession,
} from './promptApi';
import type { Section } from './sectionText';
import { trackDiscussion } from './discussionEvents';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** 사용자가 멈춰 답이 중간에 끊겼다 */
  stopped?: boolean;
}

/** preparing: 세션을 여는 중(첫 질문 — 모델 내려받기 포함). answering: 답이 흘러나오는 중. */
export type ChatPhase = 'idle' | 'preparing' | 'answering';

/**
 * 시스템 프롬프트. 섹션 본문을 **여기에** 싣는 이유는 Prompt API가 컨텍스트가
 * 넘칠 때 오래된 대화부터 지우되 시스템 프롬프트는 남기기 때문이다 — 대화가
 * 길어져도 근거가 되는 본문은 사라지지 않는다.
 */
export function buildSystemPrompt(postTitle: string, section: Section): string {
  const lines = [
    '너는 기술 블로그 글을 독자와 함께 읽는 토론 상대다.',
    `아래 [섹션]은 글 「${postTitle}」의 「${section.title}」 부분이다.`,
    '',
    '규칙:',
    '- [섹션]에 적힌 내용을 근거로 답한다. 섹션에 없는 사실은 지어내지 말고 "이 섹션에는 나와 있지 않다"고 말한다.',
    '- 너는 글쓴이가 아니다. 글쓴이를 대신해 말하지 말고, 독자와 함께 글을 검토하는 입장에서 말한다.',
    '- 반론을 요청받으면 섹션의 주장이 성립하지 않을 수 있는 조건이나 한계를 근거와 함께 든다.',
    '- 한국어로, 다섯 문장 안쪽으로 짧게 답한다.',
  ];
  if (section.truncated) {
    lines.push(
      '- 섹션이 길어 앞부분만 실었다. 실리지 않은 뒷부분에 대해서는 단정하지 않는다.',
    );
  }
  lines.push('', '[섹션]', `## ${section.title}`, section.text);
  return lines.join('\n');
}

function errorName(thrown: unknown): string {
  if (
    typeof thrown === 'object' &&
    thrown !== null &&
    'name' in thrown &&
    typeof thrown.name === 'string'
  ) {
    return thrown.name;
  }
  return 'Error';
}

export function describeError(thrown: unknown): string {
  const name = errorName(thrown);
  if (name === 'QuotaExceededError') {
    return '이 섹션은 모델의 입력 한도를 넘어요. 더 짧은 섹션을 골라 주세요.';
  }
  if (name === 'NotAllowedError') {
    return '모델을 열 수 없어요. 브라우저 설정이나 정책으로 막혀 있을 수 있어요.';
  }
  return `답을 만들지 못했어요 (${name}).`;
}

interface UseSectionChatOptions {
  api: LanguageModelApi;
  languages: LanguageOptions;
  postTitle: string;
  /** null이면 보낼 수 없다(섹션을 읽지 못한 위치). */
  section: Section | null;
}

/**
 * 섹션 하나에 묶인 대화. **섹션이 바뀌면 대화와 세션을 버린다** — 세션은 그
 * 섹션의 본문을 시스템 프롬프트로 품고 있어서 다른 섹션에 재사용할 수 없다.
 * 호출부에서 `key`로 갈아 끼우지 않는 이유는 입력 칸까지 다시 마운트돼 초점과
 * 쓰던 질문이 날아가기 때문이다(섹션은 스크롤을 따라 바뀐다).
 *
 * 세션은 **첫 질문 때** 연다. 모델이 아직 기기에 없으면 `create()`가 내려받기를
 * 시작하는데, 그건 사용자 동작(클릭·엔터) 안에서만 허락된다. 그래서 `send`는
 * `create()`를 부르기 전에 아무것도 기다리지 않는다.
 */
export function useSectionChat({
  api,
  languages,
  postTitle,
  section,
}: UseSectionChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<ChatPhase>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ContextUsage | null>(null);
  const sessionRef = useRef<ModelSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(0);

  // 섹션이 바뀌면 화면의 대화를 비운다 — effect가 아니라 렌더 중에 맞춘다
  // (이전 렌더의 값을 기억해 두는 React의 권장 패턴. effect면 한 프레임 동안
  // 이전 섹션의 대화가 새 섹션 이름 아래 보인다).
  const sectionId = section?.id ?? null;
  const [shownFor, setShownFor] = useState(sectionId);
  if (shownFor !== sectionId) {
    setShownFor(sectionId);
    setMessages([]);
    setError(null);
    setUsage(null);
  }

  // 패널을 닫거나 섹션이 바뀌면 진행 중인 답을 끊고 세션을 돌려준다(모델 메모리).
  useEffect(
    () => () => {
      abortRef.current?.abort();
      sessionRef.current?.destroy();
      sessionRef.current = null;
    },
    [sectionId],
  );

  const appendToAnswer = (chunk: string) => {
    setMessages(prev => {
      const last = prev.at(-1);
      if (last?.role !== 'assistant') return prev;
      return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
    });
  };

  const settleAnswer = (stopped: boolean) => {
    setMessages(prev => {
      const last = prev.at(-1);
      if (last?.role !== 'assistant') return prev;
      // 한 글자도 못 받았으면 빈 말풍선을 남기지 않는다(오류는 따로 보인다).
      if (!last.text) return prev.slice(0, -1);
      return stopped ? [...prev.slice(0, -1), { ...last, stopped }] : prev;
    });
  };

  const send = async (input: string, kind: 'preset' | 'free') => {
    const question = input.trim();
    if (!question || !section || abortRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    const userId = nextId.current++;
    const answerId = nextId.current++;
    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', text: question },
      { id: answerId, role: 'assistant', text: '' },
    ]);
    trackDiscussion('discussion_send', { kind });

    try {
      let session = sessionRef.current;
      if (!session) {
        setPhase('preparing');
        session = await api.create({
          ...languages,
          initialPrompts: [
            { role: 'system', content: buildSystemPrompt(postTitle, section) },
          ],
          monitor: monitor => {
            monitor.addEventListener('downloadprogress', event => {
              setProgress(event.loaded);
            });
          },
          signal: controller.signal,
        });
        // 여는 사이에 멈추거나 섹션을 바꿨다 — 이 세션은 이제 누구의 것도 아니다.
        if (controller.signal.aborted) {
          session.destroy();
          settleAnswer(true);
          return;
        }
        sessionRef.current = session;
        setProgress(null);
        setUsage(readUsage(session));
      }

      setPhase('answering');
      const reader = session
        .promptStreaming(question, { signal: controller.signal })
        .getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToAnswer(value);
      }
      setUsage(readUsage(session));
      settleAnswer(false);
    } catch (thrown) {
      const stopped = controller.signal.aborted;
      settleAnswer(stopped);
      if (!stopped) {
        setError(describeError(thrown));
        trackDiscussion('discussion_error', { name: errorName(thrown) });
      }
    } finally {
      abortRef.current = null;
      setPhase('idle');
      setProgress(null);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  return { messages, phase, progress, error, usage, send, stop };
}
