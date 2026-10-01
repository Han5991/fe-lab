/**
 * 섹션이 바뀌어 세션을 새로 열 때 이어 붙이는 앞선 대화와 시스템 프롬프트.
 */
import { describe, expect, test } from 'vitest';
import {
  buildSystemPrompt,
  HISTORY_TURNS,
  historyPrompts,
  type ChatMessage,
} from './useSectionChat';

const SECTION = {
  id: 'why',
  title: '왜 바꿨나',
  text: '본문',
  truncated: false,
};

let nextId = 0;
const message = (role: ChatMessage['role'], text: string): ChatMessage => ({
  id: nextId++,
  role,
  text,
  sectionId: SECTION.id,
  sectionTitle: SECTION.title,
});

describe('historyPrompts', () => {
  test('답까지 받은 질문·답 쌍만 싣는다', () => {
    const prompts = historyPrompts([
      message('user', '답 받은 질문'),
      message('assistant', '답'),
      // 오류로 답을 못 받은 질문 — 빈 말풍선은 지워지고 질문만 남는다.
      message('user', '답 못 받은 질문'),
    ]);

    expect(prompts).toEqual([
      { role: 'user', content: '답 받은 질문' },
      { role: 'assistant', content: '답' },
    ]);
  });

  test(`최근 ${HISTORY_TURNS}쌍까지만 싣는다`, () => {
    const turns = Array.from({ length: HISTORY_TURNS + 2 }, (_, i) => [
      message('user', `질문 ${i}`),
      message('assistant', `답 ${i}`),
    ]).flat();

    const prompts = historyPrompts(turns);

    expect(prompts).toHaveLength(HISTORY_TURNS * 2);
    expect(prompts[0]).toEqual({ role: 'user', content: '질문 2' });
  });
});

describe('buildSystemPrompt', () => {
  test('앞선 대화를 이어 붙일 때만 "근거는 지금의 섹션" 규칙을 단다', () => {
    expect(buildSystemPrompt('글', SECTION)).not.toContain('앞선 대화');
    expect(buildSystemPrompt('글', SECTION, true)).toContain(
      '근거는 언제나 지금의 [섹션]이다',
    );
  });
});
