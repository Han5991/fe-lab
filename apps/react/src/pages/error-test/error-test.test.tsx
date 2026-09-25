import { act, render, screen } from '@testing-library/react';
import { vi, describe, test, expect, afterEach, beforeEach } from 'vitest';
import ErrorTest from '.';
import * as hooks from '@/hooks';
import { ErrorBoundary } from '@/components';
import AsyncErrorPage from './AsyncErrorPage';

// useSimpleQuery 모킹
vi.mock('@/hooks', () => ({
  useSimpleQuery: vi.fn(),
}));

// 모든 테스트 전에 실행되는 초기화 코드
beforeEach(() => {
  vi.resetAllMocks();
});

// spyOn으로 바꿔 둔 전역(Math.random 등)을 테스트마다 원래대로 돌려놓는다.
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorTest 컴포넌트', () => {
  test('성공 케이스: 성공 메시지가 화면에 표시되어야 함', () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });

    render(<ErrorTest />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  test('에러 케이스: useSimpleQuery에서 에러가 발생하면 에러 UI가 표시되어야 함', () => {
    const error = new Error('An intentional error occurred');
    vi.spyOn(hooks, 'useSimpleQuery').mockImplementation(() => {
      throw error;
    });

    render(
      <ErrorBoundary>
        <ErrorTest />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText('An intentional error occurred'),
    ).toBeInTheDocument();
  });

  test('로딩 상태: 데이터가 로딩 중일 때 loading 화면이 표시되어야 함', () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    });

    const { container } = render(<ErrorTest />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test('데이터가 없는 경우: 메시지 없이 빈 div가 렌더링되어야 함', () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
    });

    const { container } = render(<ErrorTest />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test('특정 조건에 따라 다른 메시지가 표시되는 경우', () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Conditional Success!' },
      error: null,
      isLoading: false,
    });

    render(<ErrorTest />);
    expect(screen.getByText('Conditional Success!')).toBeInTheDocument();
  });

  // 에러 메시지가 버튼 라벨과 같아서 getByText만으로는 경계가 떴는지 구분되지 않는다 —
  // 경계가 그리는 제목(heading)과 버튼이 사라졌는지를 함께 본다
  test('버튼 클릭 시 에러 발생', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // 비동기 섹션은 성공 쪽으로 고정한다
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    await act(async () => {
      render(
        <ErrorBoundary>
          <ErrorTest />
        </ErrorBoundary>,
      );
    });

    await act(async () => {
      screen.getByRole('button', { name: 'error button' }).click();
    });

    expect(
      screen.getByRole('heading', { name: 'error button' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'error button' }),
    ).not.toBeInTheDocument();
  });

  test('에러 객체를 만들기만 하고 던지지 않는 버튼은 페이지를 깨뜨리지 않는다', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    await act(async () => {
      render(
        <ErrorBoundary>
          <ErrorTest />
        </ErrorBoundary>,
      );
    });

    await act(async () => {
      screen.getByRole('button', { name: 'not error button' }).click();
    });

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'not error button' }),
    ).toBeInTheDocument();
  });

  // React 19.3.0부터 <Suspense> 안에서 발생한 reject가 상위 에러 경계까지 올라간다.
  // 경계를 두지 않으면 AsyncErrorPage의 실패가 ErrorTest 트리를 통째로 교체해
  // 버튼이 사라진다.
  test('비동기 섹션이 실패해도 페이지 본문은 살아남는다', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // asyncError는 Math.random() < 0.5일 때 reject한다 — 실패 쪽으로 고정한다.
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    await act(async () => {
      render(
        <ErrorBoundary>
          <ErrorTest />
        </ErrorBoundary>,
      );
    });

    // 실패는 비동기 섹션 안에서 막히고, 바깥 버튼들은 그대로 남는다.
    expect(screen.getByText('asyncError')).toBeInTheDocument();
    expect(screen.getByText('error button')).toBeInTheDocument();
    expect(screen.getByText('not error button')).toBeInTheDocument();
    expect(screen.getByText('Add Comment')).toBeInTheDocument();
  });

  test('트랜지션 안에서 던진 에러도 에러 경계가 잡는다 (Add Comment)', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    await act(async () => {
      render(
        <ErrorBoundary>
          <ErrorTest />
        </ErrorBoundary>,
      );
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Add Comment' }).click();
    });

    expect(
      screen.getByRole('heading', { name: 'Add Comment' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Comment' }),
    ).not.toBeInTheDocument();
  });
});

describe('AsyncErrorPage 컴포넌트', () => {
  test('성공 케이스: 성공 메시지가 화면에 표시되어야 함', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });

    await act(async () => {
      render(
        <AsyncErrorPage promise={Promise.resolve({ message: 'Success!' })} />,
      );
    });

    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  test('에러 케이스: asyncError에서 에러가 발생하면 에러 UI가 표시되어야 함', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });

    const mockPromise = Promise.reject(new Error('Test Error Message'));

    await act(async () => {
      render(
        <ErrorBoundary>
          <AsyncErrorPage promise={mockPromise} />{' '}
        </ErrorBoundary>,
      );
    });

    expect(screen.getByText('Test Error Message')).toBeInTheDocument();
  });
});
