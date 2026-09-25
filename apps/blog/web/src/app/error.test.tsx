/**
 * 에러 경계의 **복구 계약.** 잎 하나가 던진 예외가 사이트를 Next 기본 화면으로
 * 날리지 않고, 읽는 사람에게 다시 시도할 길과 홈으로 갈 길을 남긴다.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HOME_PATH } from '@/src/shared/routes';
import RouteError from './error';
import GlobalError from './global-error';

beforeEach(() => {
  // 경계는 받은 에러를 콘솔에 남긴다 — 테스트 출력만 조용히 한다.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('app/error (라우트 에러 경계)', () => {
  test('안내 헤딩과 홈 링크를 보이고, 다시 시도가 경계의 retry를 부른다', () => {
    const error = new Error('boom');
    const retry = vi.fn();
    render(<RouteError error={error} retry={retry} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '페이지를 표시하지 못했습니다',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '홈으로 돌아가기' }),
    ).toHaveAttribute('href', HOME_PATH);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith(error);
  });
});

describe('app/global-error (루트 에러 경계)', () => {
  // 루트 레이아웃을 대신하므로 문서 전체(<html lang>·<body>)를 스스로 그려야 한다.
  // RTL 컨테이너(div) 안에 <html>을 넣을 수는 없어 정적 마크업을 문서로 읽는다.
  test('lang이 달린 자기 문서에 라우트 경계와 같은 복구 화면을 담는다', () => {
    const doc = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <GlobalError error={new Error('boom')} retry={vi.fn()} />,
      ),
      'text/html',
    );
    expect(doc.documentElement.getAttribute('lang')).toBe('ko');
    expect(doc.documentElement.dataset['theme']).toBe('dark');

    // 파싱한 문서엔 창(defaultView)이 없어 접근성 이름 계산이 안 된다 —
    // 본문만 현재 문서로 옮겨 역할로 읽는다.
    const body = document.createElement('div');
    body.innerHTML = doc.body.innerHTML;
    document.body.append(body);
    onTestFinished(() => body.remove());

    expect(
      within(body).getByRole('heading', {
        level: 1,
        name: '페이지를 표시하지 못했습니다',
      }),
    ).toBeInTheDocument();
    expect(
      within(body).getByRole('button', { name: '다시 시도' }),
    ).toBeInTheDocument();
  });
});
