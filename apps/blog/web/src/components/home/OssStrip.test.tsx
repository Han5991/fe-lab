/**
 * 홈 하단 오픈소스 스트립.
 *
 * 칩은 about 페이지의 기여 데이터와 같은 출처여야 하고, merged 수는 CI가
 * 주입하는 NEXT_PUBLIC_PR_COUNT를 우선합니다(주입 실패 시에도 숫자가 비지 않게).
 */
import { afterEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MERGED_PR_COUNT_FALLBACK } from '@/content.values.mts';
import { OssStrip } from './OssStrip';

/** href는 postPath 계약 그대로(후행 슬래시 포함) — vitest.setup.ts가 next.config를 비춰 둔다. */
const hrefOf = (el: Element) => el.getAttribute('href');

const originalPrCount = process.env.NEXT_PUBLIC_PR_COUNT;

afterEach(() => {
  process.env.NEXT_PUBLIC_PR_COUNT = originalPrCount;
});

describe('OssStrip', () => {
  test('기여 프로젝트 칩이 각 기여 글로 연결된다', () => {
    render(<OssStrip />);
    expect(hrefOf(screen.getByRole('link', { name: 'node.js' }))).toBe(
      '/posts/nodejs-contribution/',
    );
    expect(hrefOf(screen.getByRole('link', { name: 'gemini-cli' }))).toBe(
      '/posts/ai-opensource-contribution/',
    );
  });

  test('NEXT_PUBLIC_PR_COUNT가 주입되면 그 값을 쓴다', () => {
    process.env.NEXT_PUBLIC_PR_COUNT = '77';
    render(<OssStrip />);
    expect(screen.getByText('77+ merged')).toBeInTheDocument();
  });

  test('주입값이 없으면 폴백 숫자로 떨어진다', () => {
    delete process.env.NEXT_PUBLIC_PR_COUNT;
    render(<OssStrip />);
    expect(
      screen.getByText(`${MERGED_PR_COUNT_FALLBACK}+ merged`),
    ).toBeInTheDocument();
  });

  test('빈 문자열이 주입돼도 숫자가 사라지지 않는다', () => {
    // `process.env.X || fallback`과 달리 `''`를 그대로 쓰면 "+ merged"만 남는다.
    process.env.NEXT_PUBLIC_PR_COUNT = '';
    render(<OssStrip />);
    expect(
      screen.getByText(`${MERGED_PR_COUNT_FALLBACK}+ merged`),
    ).toBeInTheDocument();
  });
});
