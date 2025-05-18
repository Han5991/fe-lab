import { act, render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
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

  test('버튼 클릭 시 에러 발생', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });

    await act(async () => {
      render(
        <ErrorBoundary>
          <ErrorTest />
        </ErrorBoundary>,
      );
    });

    await act(async () => {
      screen.getByText('error button').click();
    });

    expect(screen.getByText('error button')).toBeInTheDocument();
  });

  test('버튼 클릭 시 에러 발생 (not error button)', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <ErrorBoundary>
          <ErrorTest />
        </ErrorBoundary>,
      );
    });

    await act(async () => {
      screen.getByText('not error button').click();
    });

    // console.error가 호출되었는지 확인
    expect(console.error).toHaveBeenCalled();
  });

  test('버튼 클릭 시 에러 발생 (Add Comment)', async () => {
    vi.spyOn(hooks, 'useSimpleQuery').mockReturnValue({
      data: { message: 'Success!' },
      error: null,
      isLoading: false,
    });

    await act(async () => {
      render(
        <ErrorBoundary>
          <ErrorTest />
        </ErrorBoundary>,
      );
    });

    await act(async () => {
      screen.getByText('Add Comment').click();
    });

    expect(screen.getByText('Add Comment')).toBeInTheDocument();
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
