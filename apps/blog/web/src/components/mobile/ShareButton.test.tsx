import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShareButton } from './ShareButton';

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn(() => Promise.resolve());
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: { writeText },
  });
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const share = () =>
  fireEvent.click(screen.getByRole('button', { name: '공유하기' }));

describe('ShareButton', () => {
  test('Web Share가 없으면 링크를 복사하고 상태 문구로 알린다', async () => {
    render(<ShareButton title="글" />);

    share();

    expect(await screen.findByRole('status')).toHaveTextContent(
      '링크를 복사했습니다',
    );
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  // 예전엔 실패가 콘솔에만 남아 버튼이 아무 일도 하지 않았다.
  test('공유가 거부되면(NotAllowedError) 복사로 넘어간다', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
      share: vi.fn(() =>
        Promise.reject(new DOMException('denied', 'NotAllowedError')),
      ),
    });
    render(<ShareButton title="글" />);

    share();

    expect(await screen.findByRole('status')).toHaveTextContent(
      '링크를 복사했습니다',
    );
  });

  test('사용자가 공유 시트를 닫으면(AbortError) 아무것도 하지 않는다', async () => {
    const shareFn = vi.fn(() =>
      Promise.reject(new DOMException('canceled', 'AbortError')),
    );
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
      share: shareFn,
    });
    render(<ShareButton title="글" />);

    share();
    await vi.waitFor(() => expect(shareFn).toHaveBeenCalled());

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
