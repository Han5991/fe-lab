/**
 * AI 토론 — 내장 모델이 없으면 아무것도 그리지 않고, 있으면 런처 → 패널 →
 * 섹션을 실은 세션 → 흘러나오는 답까지 이어진다. 모델은 `getModel`로 가짜를
 * 주입한다(전역 `LanguageModel`을 건드리지 않는다).
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { PostDiscussion } from './PostDiscussion';
import type {
  Availability,
  CreateOptions,
  LanguageModelApi,
  ModelSession,
} from './promptApi';

const ARTICLE = `
  <h2 id="why">왜 바꿨나</h2>
  <p>빌드가 4분 걸렸다.</p>
  <h2 id="result">결과</h2>
  <p>40초가 됐다.</p>
`;

interface Fake {
  api: LanguageModelApi;
  /** api의 두 메서드 — 호출을 검사하거나 한 번만 다르게 답하게 할 때 쓴다. */
  availability: Mock<LanguageModelApi['availability']>;
  create: Mock<LanguageModelApi['create']>;
  session: ModelSession;
  created: CreateOptions[];
  prompts: string[];
  destroyed: () => number;
  /** 열린 답 스트림에 조각을 밀어 넣는다(hold 모드). */
  push: (chunk: string) => void;
  /** 열린 답 스트림을 닫는다(hold 모드). */
  finish: () => void;
}

/**
 * 가짜 내장 모델. 기본은 답 조각 두 개를 바로 흘리고 닫는다. `hold`면 스트림을
 * 열어 둔 채 테스트가 조각을 밀어 넣고 닫는다(멈추기·진행 중 상태를 보려고).
 */
function fakeModel({
  availability = 'available',
  answer = ['빌드가 ', '빨라졌다는 주장이다.'],
  hold = false,
}: {
  availability?: Availability;
  answer?: string[];
  hold?: boolean;
} = {}): Fake {
  const created: CreateOptions[] = [];
  const prompts: string[] = [];
  let destroyed = 0;
  let open: ReadableStreamDefaultController<string> | null = null;

  const session: ModelSession = {
    contextUsage: 1200,
    contextWindow: 9216,
    promptStreaming(input, options) {
      prompts.push(input);
      return new ReadableStream<string>({
        start(controller) {
          if (hold) {
            open = controller;
          } else {
            answer.forEach(chunk => controller.enqueue(chunk));
            controller.close();
          }
          options?.signal?.addEventListener('abort', () => {
            controller.error(new DOMException('멈춤', 'AbortError'));
          });
        },
      });
    },
    destroy() {
      destroyed += 1;
    },
  };

  const availabilityMock = vi.fn<LanguageModelApi['availability']>(() =>
    Promise.resolve(availability),
  );
  const createMock = vi.fn<LanguageModelApi['create']>(
    (options?: CreateOptions) => {
      created.push(options ?? {});
      return Promise.resolve(session);
    },
  );

  return {
    api: { availability: availabilityMock, create: createMock },
    availability: availabilityMock,
    create: createMock,
    session,
    created,
    prompts,
    destroyed: () => destroyed,
    push: chunk => open?.enqueue(chunk),
    finish: () => open?.close(),
  };
}

/**
 * 헤딩의 문서 좌표. 첫 화면(스크롤 0)에서는 「왜 바꿨나」를 읽고 있고, 1400px
 * 내려가면 「결과」를 읽는다. 읽는 위치는 TOC 훅이 정한다(tocHooks.test.tsx와
 * 같은 흉내 — jsdom은 레이아웃이 없어 getBoundingClientRect가 전부 0이다).
 */
const HEADING_TOP: Record<string, number> = { why: 100, result: 1500 };
const READ_RESULT = 1400;

let content: HTMLElement;
let scrollY = 0;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  scrollY = 0;
  frames = [];
  vi.stubGlobal('innerHeight', 800);
  // rAF를 수동 플러시로 바꿔 "스크롤 → 다음 프레임 재계산"을 결정적으로 만든다.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    frames.push(cb),
  );
  vi.stubGlobal('cancelAnimationFrame', () => undefined);

  content = document.createElement('div');
  content.id = 'post-content';
  content.innerHTML = ARTICLE;
  content.querySelectorAll('h2').forEach(heading => {
    const top = HEADING_TOP[heading.id] ?? 0;
    heading.getBoundingClientRect = () =>
      ({ top: top - scrollY, bottom: top - scrollY + 30 }) as DOMRect;
  });
  document.body.append(content);
});

afterEach(() => {
  content.remove();
  vi.unstubAllGlobals();
});

/** 예약된 읽는 위치 재계산을 돌린다. */
const flushFrames = () => {
  const queued = frames;
  frames = [];
  act(() => {
    queued.forEach(cb => cb(0));
  });
};

/** 스크롤해 읽는 위치를 옮긴다. */
const scrollToY = (y: number) => {
  scrollY = y;
  window.dispatchEvent(new Event('scroll'));
  flushFrames();
};

const renderWith = (fake: Fake | undefined) => {
  // 렌더마다 새 함수를 넘기면 감지 effect가 매번 다시 돈다 — 호출부처럼 고정한다.
  const getModel = () => fake?.api;
  return render(<PostDiscussion postTitle="빌드 개선기" getModel={getModel} />);
};

const openPanel = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'AI와 토론' }));
  const dialog = await screen.findByRole('dialog', { name: /AI와 토론/ });
  flushFrames();
  return dialog;
};

/** 패널 위쪽에 보이는 지금 섹션 이름. */
const shownSection = (dialog: HTMLElement, title: string) =>
  within(dialog).getByText(title, { selector: 'span' });

const ask = (text: string) => {
  const input = screen.getByRole('textbox', { name: '질문' });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('PostDiscussion 감지', () => {
  test('내장 모델이 없는 브라우저에서는 아무것도 그리지 않는다', async () => {
    const { container } = renderWith(undefined);

    // 감지는 effect에서 돈다 — 한 번 흘려보낸 뒤에도 비어 있어야 한다.
    await act(() => Promise.resolve());
    expect(container).toBeEmptyDOMElement();
  });

  test('모델을 쓸 수 없으면(unavailable) 런처를 띄우지 않는다', async () => {
    const fake = fakeModel({ availability: 'unavailable' });
    const { container } = renderWith(fake);

    await waitFor(() => expect(fake.availability).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('쓸 수 있으면 런처가 뜨고, 누르면 패널이 열려 질문 칸에 초점이 간다', async () => {
    renderWith(fakeModel());

    const launcher = await screen.findByRole('button', { name: 'AI와 토론' });
    expect(launcher).toHaveAttribute('aria-expanded', 'false');

    await openPanel();
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: '질문' })).toHaveFocus();
  });
});

describe('PostDiscussion 대화', () => {
  test('읽고 있는 섹션만 시스템 프롬프트에 싣고, 답을 흘려 보여 준다', async () => {
    const fake = fakeModel();
    renderWith(fake);
    const dialog = await openPanel();

    expect(shownSection(dialog, '왜 바꿨나')).toBeVisible();
    ask('이 주장 맞아?');

    expect(
      await screen.findByText('빌드가 빨라졌다는 주장이다.'),
    ).toBeVisible();
    expect(fake.prompts).toEqual(['이 주장 맞아?']);

    const system = fake.created[0]?.initialPrompts?.[0];
    expect(system?.role).toBe('system');
    expect(system?.content).toContain('「빌드 개선기」의 「왜 바꿨나」');
    expect(system?.content).toContain('빌드가 4분 걸렸다.');
    expect(system?.content).not.toContain('40초');
    // 감지 때 정한 언어 힌트를 그대로 넘긴다.
    expect(fake.created[0]?.expectedOutputs?.[0]?.languages).toEqual(['ko']);
    // 답이 끝나면 컨텍스트 사용량이 보인다(프리뷰에서 창 크기를 확인하는 자리).
    expect(
      await screen.findByText(/컨텍스트 1,200 \/ 9,216 토큰/),
    ).toBeVisible();
  });

  test('예시 버튼을 누르면 이어서 물을 수 있게 질문 칸으로 초점을 옮긴다', async () => {
    renderWith(fakeModel());
    await openPanel();
    const summary = screen.getByRole('button', { name: '요약' });

    summary.focus();
    fireEvent.click(summary);

    expect(screen.getByRole('textbox', { name: '질문' })).toHaveFocus();
    await screen.findByText('빌드가 빨라졌다는 주장이다.');
  });

  test('세션은 첫 질문에만 열고 이어지는 질문은 같은 세션에 보낸다', async () => {
    const fake = fakeModel();
    renderWith(fake);
    await openPanel();

    ask('첫 질문');
    await screen.findByText('빌드가 빨라졌다는 주장이다.');
    fireEvent.click(screen.getByRole('button', { name: '반론' }));
    await waitFor(() => expect(fake.prompts).toHaveLength(2));

    expect(fake.create).toHaveBeenCalledTimes(1);
    expect(fake.prompts[1]).toContain('반론');
  });

  test('한글 조합 중의 엔터로는 보내지 않는다', async () => {
    const fake = fakeModel();
    renderWith(fake);
    await openPanel();

    const input = screen.getByRole('textbox', { name: '질문' });
    fireEvent.change(input, { target: { value: '질문' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(fake.create).not.toHaveBeenCalled();
    expect(input).toHaveValue('질문');
  });

  test('멈추면 받은 데까지 남기고 (멈춤)을 붙인다', async () => {
    const fake = fakeModel({ hold: true });
    renderWith(fake);
    await openPanel();

    ask('길게 말해 줘');
    await waitFor(() => expect(fake.prompts).toHaveLength(1));
    act(() => fake.push('앞부분만'));
    expect(await screen.findByText(/앞부분만/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '멈추기' }));

    expect(await screen.findByText('(멈춤)')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보내기' })).toBeInTheDocument();
  });

  test('대화 중에 스크롤하면 섹션이 따라가고, 다음 질문은 새 섹션과 앞선 대화를 실은 새 세션으로 간다', async () => {
    const fake = fakeModel();
    renderWith(fake);
    const dialog = await openPanel();

    ask('첫 질문');
    await screen.findByText('빌드가 빨라졌다는 주장이다.');
    scrollToY(READ_RESULT);

    // 섹션 이름은 따라가고, 앞선 대화는 화면에 그대로 남는다.
    expect(shownSection(dialog, '결과')).toBeVisible();
    expect(screen.getByText('빌드가 빨라졌다는 주장이다.')).toBeVisible();

    ask('둘째 질문');
    await waitFor(() => expect(fake.prompts).toEqual(['첫 질문', '둘째 질문']));

    // 이전 섹션을 품은 세션은 돌려주고 새로 연다.
    expect(fake.create).toHaveBeenCalledTimes(2);
    expect(fake.destroyed()).toBe(1);
    const [system, ...history] = fake.created[1]?.initialPrompts ?? [];
    expect(system?.content).toContain('「결과」');
    expect(system?.content).toContain('40초가 됐다.');
    expect(system?.content).not.toContain('빌드가 4분 걸렸다.');
    expect(system?.content).toContain('앞선 대화는 다른 섹션을 두고');
    expect(history).toEqual([
      { role: 'user', content: '첫 질문' },
      { role: 'assistant', content: '빌드가 빨라졌다는 주장이다.' },
    ]);
    // 어느 답이 어느 섹션을 근거로 했는지 경계가 보인다.
    expect(screen.getByText('섹션 · 왜 바꿨나')).toBeVisible();
    expect(screen.getByText('섹션 · 결과')).toBeVisible();
  });

  test('고정하면 스크롤해도 섹션이 머물고, 풀면 다시 따라간다', async () => {
    renderWith(fakeModel());
    const dialog = await openPanel();
    const pin = screen.getByRole('button', { name: '이 섹션에 고정' });

    fireEvent.click(pin);
    scrollToY(READ_RESULT);

    expect(pin).toHaveAttribute('aria-pressed', 'true');
    expect(shownSection(dialog, '왜 바꿨나')).toBeVisible();

    fireEvent.click(pin);

    expect(pin).toHaveAttribute('aria-pressed', 'false');
    expect(shownSection(dialog, '결과')).toBeVisible();
  });

  test('답이 흘러나오는 동안 스크롤해도 답을 끊지 않는다', async () => {
    const fake = fakeModel({ hold: true });
    renderWith(fake);
    await openPanel();

    ask('길게 말해 줘');
    await waitFor(() => expect(fake.prompts).toHaveLength(1));
    act(() => fake.push('앞부분, '));
    scrollToY(READ_RESULT);
    act(() => {
      fake.push('뒷부분');
      fake.finish();
    });

    expect(await screen.findByText('앞부분, 뒷부분')).toBeVisible();
    expect(screen.queryByText('(멈춤)')).toBeNull();
    expect(fake.destroyed()).toBe(0);
  });

  test('앞선 대화까지 실어 한도를 넘으면 대화 없이 다시 연다', async () => {
    const fake = fakeModel();
    renderWith(fake);
    await openPanel();
    ask('첫 질문');
    await screen.findByText('빌드가 빨라졌다는 주장이다.');
    scrollToY(READ_RESULT);
    fake.create.mockRejectedValueOnce(
      new DOMException('too long', 'QuotaExceededError'),
    );

    ask('둘째 질문');
    await waitFor(() => expect(fake.prompts).toHaveLength(2));

    expect(fake.create).toHaveBeenCalledTimes(3);
    expect(fake.created.at(-1)?.initialPrompts).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('세션을 열다 실패하면 이유를 알린다', async () => {
    const fake = fakeModel();
    fake.create.mockRejectedValueOnce(
      new DOMException('too long', 'QuotaExceededError'),
    );
    renderWith(fake);
    await openPanel();

    ask('질문');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '입력 한도를 넘어요',
    );
  });

  test('모델이 아직 없으면 내려받는다고 미리 알리고, 진행률을 보여 준다', async () => {
    const fake = fakeModel({ availability: 'downloadable' });
    // 내려받는 동안 create()가 끝나지 않는 상황 — 진행률만 먼저 온다.
    let release: (session: ModelSession) => void = () => undefined;
    fake.create.mockImplementationOnce(options => {
      options?.monitor?.({
        addEventListener: (_type, listener) => listener({ loaded: 0.42 }),
      });
      return new Promise(resolve => {
        release = resolve;
      });
    });
    renderWith(fake);
    await openPanel();

    expect(screen.getByText(/모델\(수 GB\)을 한 번 내려받아요/)).toBeVisible();

    ask('질문');
    expect(await screen.findByText('모델 내려받는 중 42%')).toBeVisible();
    expect(screen.getByRole('button', { name: '멈추기' })).toBeInTheDocument();

    act(() => release(fake.session));
    expect(
      await screen.findByText('빌드가 빨라졌다는 주장이다.'),
    ).toBeVisible();
  });
});

describe('PostDiscussion 닫기', () => {
  test('패널 안에서 Esc를 누르면 닫고 초점을 런처로 돌려준다', async () => {
    renderWith(fakeModel());
    await openPanel();

    fireEvent.keyDown(screen.getByRole('textbox', { name: '질문' }), {
      key: 'Escape',
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'AI와 토론' })).toHaveFocus();
  });

  test('초점이 문서 바닥(body)에 있어도 Esc로 닫는다', async () => {
    renderWith(fakeModel());
    await openPanel();

    act(() => screen.getByRole('textbox', { name: '질문' }).blur());
    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('패널 밖 다른 요소에 초점이 있으면 Esc를 가로채지 않는다', async () => {
    renderWith(fakeModel());
    await openPanel();
    const outside = document.createElement('button');
    document.body.append(outside);

    outside.focus();
    fireEvent.keyDown(outside, { key: 'Escape' });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    outside.remove();
  });

  test('닫기 버튼으로도 닫는다', async () => {
    renderWith(fakeModel());
    await openPanel();

    fireEvent.click(screen.getByRole('button', { name: '토론 닫기' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
