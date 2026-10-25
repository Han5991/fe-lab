/**
 * 읽기 진행 바 — 카카오톡 인앱 브라우저에서만 빠진다(스크롤에 묶인 애니메이션이 그 브라우저의 스크롤을
 * 버벅이게 했다). 판정은 user-agent라, 실제 user-agent 문자열을 그대로 넣어 본다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReadingProgress } from './ReadingProgress';

/** 실기기 user-agent — 안드로이드는 WebView(`; wv`), iOS는 WKWebView 위의 카카오톡 표식. */
const UA = {
  kakaoAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 KAKAOTALK/25.9.0 (INAPP)',
  kakaoIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.0',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
} as const;

const asUserAgent = (ua: string) =>
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua);

/** 진행 바 — 헤더 높이 변수를 다는 장식 띠. */
const bar = (container: HTMLElement) =>
  container.querySelector('div[aria-hidden="true"]');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReadingProgress', () => {
  test.each([
    ['안드로이드', UA.kakaoAndroid],
    ['iOS', UA.kakaoIos],
  ])('카카오톡 인앱 브라우저(%s)에서는 그리지 않는다', (_, ua) => {
    asUserAgent(ua);
    const { container } = render(<ReadingProgress />);

    expect(container).toBeEmptyDOMElement();
  });

  test.each([
    ['안드로이드 크롬', UA.chromeAndroid],
    ['iOS 사파리', UA.safariIos],
  ])('%s에서는 그린다', (_, ua) => {
    asUserAgent(ua);
    const { container } = render(<ReadingProgress />);

    expect(bar(container)).toBeInTheDocument();
  });
});
