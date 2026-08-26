import { createElement } from 'react';
import { describe, expect, test } from 'vitest';

import { isBlockMarkdownChild } from './markdownBlocks';
import { Callout } from '@/src/components/post/markdown/Callout';
import { Dialogue, Msg } from '@/src/components/post/markdown/Dialogue';
import { Figure } from '@/src/components/post/markdown/Figure';
import { FileTree } from '@/src/components/post/markdown/FileTree';
import { Metric, Metrics } from '@/src/components/post/markdown/Metrics';
import { Step, Timeline } from '@/src/components/post/markdown/Timeline';
import { Diagram } from '@/src/components/diagram';

// react-markdown이 <p>로 감싼 자식을 isBlockMarkdownChild가 어떻게 분류하는지 검증.
// true면 PostBody의 p 매퍼가 <p>를 <div>로 교체해 무효 중첩(<p><div></div></p>) → hydration
// mismatch를 막는다. 각 케이스는 실제 렌더 시 child가 갖는 type/props 형태를 흉내낸다.
describe('isBlockMarkdownChild', () => {
  describe('직접 매핑된 커스텀 블록 컴포넌트는 identity로 블록 판정', () => {
    test('Callout → block', () => {
      expect(isBlockMarkdownChild(createElement(Callout))).toBe(true);
    });
    test('Figure → block', () => {
      expect(isBlockMarkdownChild(createElement(Figure))).toBe(true);
    });
    test('FileTree → block', () => {
      expect(isBlockMarkdownChild(createElement(FileTree))).toBe(true);
    });
    test('Dialogue → block', () => {
      expect(isBlockMarkdownChild(createElement(Dialogue))).toBe(true);
    });
    test('Metrics → block', () => {
      expect(isBlockMarkdownChild(createElement(Metrics))).toBe(true);
    });
    test('Timeline → block', () => {
      expect(isBlockMarkdownChild(createElement(Timeline))).toBe(true);
    });
    test('Diagram → block', () => {
      expect(isBlockMarkdownChild(createElement(Diagram))).toBe(true);
    });
    test('Set에 없는 커스텀 컴포넌트는 블록 아님', () => {
      const Inline = () => null;
      expect(isBlockMarkdownChild(createElement(Inline))).toBe(false);
    });
  });

  // Msg/Metric/Step은 컨테이너 내부에서만 쓰여 <p> 직계 자식으로 오지 않으므로
  // 일부러 Set에 넣지 않았다. 나중에 누가 "빠뜨렸다"고 오해해 추가하지 않도록 못박는다.
  describe('시그니처 컴포넌트의 내부 요소는 등록 대상이 아님', () => {
    test('Msg / Metric / Step → 블록 아님', () => {
      expect(isBlockMarkdownChild(createElement(Msg))).toBe(false);
      expect(isBlockMarkdownChild(createElement(Metric))).toBe(false);
      expect(isBlockMarkdownChild(createElement(Step))).toBe(false);
    });
  });

  // 이미지는 closure(relativeDir) 때문에 인라인 래퍼로 매핑돼 child.type이 래퍼
  // 함수다(MarkdownImage identity로는 못 잡는다). MarkdownImage가 <Zoom>의 블록
  // <div>를 렌더하므로 공개 prop src로 블록 판정한다.
  describe('이미지: src 공개 prop으로 블록 판정', () => {
    test('네이티브 img 자식(src 보유) → block', () => {
      expect(
        isBlockMarkdownChild(createElement('img', { src: '/a.png' })),
      ).toBe(true);
    });
    test('인라인 래퍼 함수 타입 + src → block (실제 렌더 형태)', () => {
      const ImgRenderer = (_props: { src?: string }) => null;
      expect(
        isBlockMarkdownChild(createElement(ImgRenderer, { src: '/a.png' })),
      ).toBe(true);
    });
    test('src 없으면 블록 아님', () => {
      expect(isBlockMarkdownChild(createElement('img', {}))).toBe(false);
    });
  });

  // 인라인 code와 fenced code는 같은 code 핸들러(동일 identity)라 className으로만
  // 구분된다. fenced(language-*)는 블록 <div>, 인라인 backtick은 phrasing.
  describe('코드: language-* className만 fenced(block)', () => {
    test('fenced code (language-ts) → block', () => {
      expect(
        isBlockMarkdownChild(
          createElement('code', { className: 'language-ts' }),
        ),
      ).toBe(true);
    });
    test('인라인 code (className 없음) → 블록 아님', () => {
      expect(isBlockMarkdownChild(createElement('code', {}))).toBe(false);
    });
    test('language- 접두 아닌 className → 블록 아님', () => {
      expect(
        isBlockMarkdownChild(
          createElement('code', { className: 'hljs token' }),
        ),
      ).toBe(false);
    });
  });

  describe('phrasing 콘텐츠·비요소는 블록 아님', () => {
    test('인라인 네이티브 요소(strong, a)', () => {
      expect(isBlockMarkdownChild(createElement('strong'))).toBe(false);
      expect(isBlockMarkdownChild(createElement('a', { href: '/x' }))).toBe(
        false,
      );
    });
    test('문자열 텍스트 노드', () => {
      expect(isBlockMarkdownChild('그냥 텍스트')).toBe(false);
    });
    test('숫자', () => {
      expect(isBlockMarkdownChild(42)).toBe(false);
    });
    test('null / undefined', () => {
      expect(isBlockMarkdownChild(null)).toBe(false);
      expect(isBlockMarkdownChild(undefined)).toBe(false);
    });
  });
});
