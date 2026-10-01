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

let content: HTMLElement;

beforeEach(() => {
  content = document.createElement('div');
  content.id = 'post-content';
  content.innerHTML = ARTICLE;
  document.body.append(content);
});

afterEach(() => {
  content.remove();
});

const renderWith = (fake: Fake | undefined) => {
  // 렌더마다 새 함수를 넘기면 감지 effect가 매번 다시 돈다 — 호출부처럼 고정한다.
  const getModel = () => fake?.api;
  return render(<PostDiscussion postTitle="빌드 개선기" getModel={getModel} />);
};

const openPanel = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'AI와 토론' }));
  return screen.findByRole('dialog', { name: /AI와 토론/ });
};

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
  test('고른 섹션만 시스템 프롬프트에 싣고, 답을 흘려 보여 준다', async () => {
    const fake = fakeModel();
    renderWith(fake);
    await openPanel();

    fireEvent.change(screen.getByRole('combobox', { name: '섹션' }), {
      target: { value: 'why' },
    });
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

  test('섹션을 바꾸면 대화를 비우고 세션을 돌려준다', async () => {
    const fake = fakeModel();
    renderWith(fake);
    await openPanel();
    const select = screen.getByRole('combobox', { name: '섹션' });

    fireEvent.change(select, { target: { value: 'why' } });
    ask('첫 질문');
    await screen.findByText('빌드가 빨라졌다는 주장이다.');

    fireEvent.change(select, { target: { value: 'result' } });

    expect(screen.queryByText('빌드가 빨라졌다는 주장이다.')).toBeNull();
    expect(
      screen.getByText('「결과」에 대해 묻거나 반박해 보세요.'),
    ).toBeVisible();
    expect(fake.destroyed()).toBe(1);
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
