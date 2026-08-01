/**
 * 콜아웃의 타입 분기와 폴백.
 *
 * `<callout type="...">` 는 마크다운 raw HTML에서 오므로 값이 **문자열 아무거나**일
 * 수 있습니다(오타·미지원 타입). 그때 렌더가 깨지지 않고 info로 떨어지는 게
 * 이 컴포넌트의 계약이라 여기서 못박습니다.
 *
 * 리스킨(이모지 → hairline 원형 + 문자 아이콘) 과정에서 아이콘만 갈아끼웠으므로,
 * 4종 분기가 서로 다른 글리프를 유지하는지도 함께 봅니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Callout } from './Callout';

const calloutText = () => screen.getByRole('complementary').textContent ?? '';

describe('Callout', () => {
  test.each([
    ['info', 'Info'],
    ['tip', 'Tip'],
    ['warning', 'Warning'],
    ['danger', 'Danger'],
  ])('type=%s 는 %s 라벨을 붙인다', (type, label) => {
    render(<Callout type={type}>본문</Callout>);
    expect(calloutText()).toContain(label);
    expect(calloutText()).toContain('본문');
  });

  test('타입이 없거나 알 수 없는 값이면 info로 폴백한다', () => {
    render(<Callout type="typo">본문</Callout>);
    expect(calloutText()).toContain('Info');
  });

  test('title이 있으면 기본 라벨 대신 쓴다', () => {
    render(
      <Callout type="warning" title="빌드가 깨질 수 있다">
        본문
      </Callout>,
    );
    expect(calloutText()).toContain('빌드가 깨질 수 있다');
    expect(calloutText()).not.toContain('Warning');
  });

  test('아이콘은 장식이라 접근성 트리에서 빠진다', () => {
    // 타입 정보는 라벨 텍스트가 전달한다. 아이콘까지 읽히면 "i Info"처럼
    // 중복으로 들린다.
    const { container } = render(<Callout type="info">본문</Callout>);
    const icon = container.querySelector('[aria-hidden]');
    expect(icon?.textContent).toBe('i');
  });

  test('타입마다 아이콘 글리프가 다르다', () => {
    const glyphs = ['info', 'tip', 'warning', 'danger'].map(type => {
      const { container, unmount } = render(
        <Callout type={type}>본문</Callout>,
      );
      const glyph = container.querySelector('[aria-hidden]')?.textContent ?? '';
      unmount();
      return glyph;
    });
    expect(new Set(glyphs).size).toBe(4);
  });
});
