/**
 * 펜스 메타(```` ```ts title="lib/foo.ts" ````)가 마크다운에서 컴포넌트까지
 * 도달하는 **경로 전체**를 고정한다.
 *
 * 단위로 쪼개면 정작 깨지기 쉬운 곳을 못 잡는다. 메타는 hast의 `data`에
 * 실려 오는데 rehype-raw가 트리를 직렬화·재파싱하면서 그 `data`를 버리기
 * 때문에, 이 기능은 **플러그인 순서 하나에 통째로 달려 있다.** 순서가
 * 뒤집혀도 렌더는 멀쩡하고 파일명만 조용히 사라져서, 그 대조군까지 여기서
 * 같이 못박는다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { ComponentProps } from 'react';
import { rehypeCodeMeta, parseCodeMeta } from './codeMeta';
import { CodeBlock } from './CodeBlock';
import { CodeTabs } from './markdown/CodeTabs';

// CodeBlock은 mermaid를 동적 import하지만, 모듈 그래프 상단에서 참조가
// 잡히면 raw 1.1MB짜리 실제 패키지를 끌어온다. 여기 테스트는 mermaid
// 펜스를 쓰지 않으므로 빈 것으로 대신한다.
vi.mock('mermaid', () => ({ default: {} }));

/** 기본값은 실제 PostClient와 같은 플러그인 순서. */
const renderMarkdown = (
  md: string,
  plugins: ComponentProps<typeof ReactMarkdown>['rehypePlugins'] = [
    rehypeCodeMeta,
    rehypeRaw,
  ],
) =>
  render(
    <ReactMarkdown
      rehypePlugins={plugins}
      components={
        {
          code(props) {
            return <CodeBlock {...props} />;
          },
          'code-tabs': CodeTabs,
        } as ComponentProps<typeof ReactMarkdown>['components']
      }
    >
      {md}
    </ReactMarkdown>,
  );

const fence = (info: string, body = 'const a = 1;') =>
  ['```' + info, body, '```'].join('\n');

describe('parseCodeMeta', () => {
  test('따옴표로 감싼 값을 읽는다', () => {
    expect(parseCodeMeta('title="lib/export.ts"')).toEqual({
      title: 'lib/export.ts',
    });
  });

  test('따옴표 없는 값도 읽는다', () => {
    // 탭 이름은 대개 한 단어라 따옴표를 빠뜨리기 쉽다.
    expect(parseCodeMeta('tab=npm')).toEqual({ tab: 'npm' });
  });

  test('여러 키가 함께 있어도 각각 뽑는다', () => {
    expect(parseCodeMeta('tab="pnpm" title="설치"')).toEqual({
      tab: 'pnpm',
      title: '설치',
    });
  });

  test('모르는 키는 무시한다', () => {
    // 레퍼런스의 `{1,3}` 라인 하이라이트 같은 문법이 나중에 들어와도
    // 여기서 걸려 넘어지지 않아야 한다.
    expect(parseCodeMeta('{1,3} showLineNumbers title="a.ts"')).toEqual({
      title: 'a.ts',
    });
  });

  test('값이 비면 키가 없는 것으로 본다', () => {
    // 빈 파일명으로 상단 바만 덩그러니 뜨는 것보다 언어 라벨이 낫다.
    expect(parseCodeMeta('title=""')).toEqual({});
  });
});

describe('펜스 메타 → 코드 블록', () => {
  test('title이 있으면 파일명이 상단 바에 뜬다', () => {
    renderMarkdown(fence('ts title="lib/export-search-indexes.ts"'));

    expect(
      screen.getByText('lib/export-search-indexes.ts'),
    ).toBeInTheDocument();
  });

  test('title이 없으면 예전처럼 언어 라벨이 뜬다', () => {
    renderMarkdown(fence('ts'));

    expect(screen.getByText('ts')).toBeInTheDocument();
  });

  test('파일명이 뜨면 언어 라벨은 자리를 내준다', () => {
    // 상단 바는 한 줄이다. 둘 다 띄우면 파일 경로가 밀려 잘린다.
    renderMarkdown(fence('ts title="a.ts"'));

    expect(screen.queryByText('ts')).not.toBeInTheDocument();
  });

  test('파일명은 figcaption으로 나가 코드와 캡션 관계가 남는다', () => {
    const { container } = renderMarkdown(fence('ts title="a.ts"'));

    expect(container.querySelector('figcaption')?.textContent).toBe('a.ts');
  });

  // 이 테스트가 이 파일의 존재 이유다. 순서가 뒤집히면 예외도 경고도 없이
  // 파일명만 사라진다 — 화면을 직접 보지 않는 한 알아챌 방법이 없다.
  test('(대조) rehypeRaw가 먼저 돌면 메타가 유실된다', () => {
    renderMarkdown(fence('ts title="a.ts"'), [rehypeRaw, rehypeCodeMeta]);

    expect(screen.queryByText('a.ts')).not.toBeInTheDocument();
  });
});
