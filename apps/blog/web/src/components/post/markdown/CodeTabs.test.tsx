/**
 * `<code-tabs>` — 같은 명령을 도구별로 보여주는 탭.
 *
 * 다른 시그니처 컴포넌트와 달리 이 태그의 자식은 **마크다운 코드 펜스**다.
 * 그래서 "raw HTML 태그 안에서 펜스가 다시 마크다운으로 파싱되는가"라는,
 * 컴포넌트 바깥의 조건에 기능 전체가 걸려 있다(HTML 블록은 빈 줄에서
 * 끝나야 안쪽이 마크다운으로 읽힌다). 여기서는 그 조립까지 통째로 본다.
 */
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { ComponentProps } from 'react';
import { CodeBlock } from '@/src/components/post/CodeBlock';
import { rehypeCodeMeta } from '@/src/components/post/codeMeta';
import { CodeTabs } from './CodeTabs';

vi.mock('mermaid', () => ({ default: {} }));

const renderMarkdown = (md: string) =>
  render(
    <ReactMarkdown
      rehypePlugins={[rehypeCodeMeta, rehypeRaw]}
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

/**
 * 보이는 코드 전문.
 *
 * 구문 강조가 한 줄을 토큰 span 여러 개로 쪼개 놓기 때문에(`npm` + ` i`)
 * `getByText('npm i')`로는 잡히지 않는다. 텍스트로 확인할 때는 컨테이너의
 * textContent를 본다.
 */
const shownCode = () =>
  (screen.queryByRole('tabpanel') ?? document.body).textContent ?? '';

/** 글에서 실제로 쓰게 될 모양 그대로. 여닫는 태그 양옆의 빈 줄이 문법의 일부다. */
const TABS_MD = [
  '<code-tabs>',
  '',
  '```bash tab="npm"',
  'npm i typesense',
  '```',
  '',
  '```bash tab="pnpm"',
  'pnpm add typesense',
  '```',
  '',
  '</code-tabs>',
].join('\n');

describe('CodeTabs', () => {
  test('펜스의 tab= 이름으로 탭 목록을 만든다', () => {
    renderMarkdown(TABS_MD);

    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual([
      'npm',
      'pnpm',
    ]);
  });

  test('처음에는 첫 번째 탭의 코드만 보인다', () => {
    renderMarkdown(TABS_MD);

    expect(shownCode()).toContain('npm i typesense');
    expect(shownCode()).not.toContain('pnpm add typesense');
  });

  test('탭을 누르면 그 코드로 바뀐다', async () => {
    renderMarkdown(TABS_MD);

    fireEvent.click(screen.getByRole('tab', { name: 'pnpm' }));

    expect(shownCode()).toContain('pnpm add typesense');
    expect(shownCode()).not.toContain('npm i typesense');
  });

  test('활성 탭만 aria-selected로 표시된다', async () => {
    renderMarkdown(TABS_MD);

    fireEvent.click(screen.getByRole('tab', { name: 'pnpm' }));

    expect(screen.getByRole('tab', { name: 'pnpm' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'npm' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  test('← → 로 탭을 옮길 수 있다', async () => {
    // 탭 목록 안에서는 화살표가 기본 조작이다(WAI-ARIA tabs 패턴).
    renderMarkdown(TABS_MD);
    const first = screen.getByRole('tab', { name: 'npm' });
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });

    expect(screen.getByRole('tab', { name: 'pnpm' })).toHaveFocus();
    expect(shownCode()).toContain('pnpm add typesense');
  });

  test('탭 안의 코드 블록은 자기 상단 바를 그리지 않는다', () => {
    // 그리면 탭 바 아래에 언어 라벨 바가 한 줄 더 생겨 크롬이 이중이 된다.
    renderMarkdown(TABS_MD);

    expect(screen.queryByText('bash')).not.toBeInTheDocument();
  });

  test('복사 버튼은 하나이고, 열려 있는 탭의 코드를 집는다', async () => {
    renderMarkdown(TABS_MD);
    const copy = () => screen.getByRole('button', { name: /코드 복사/ });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    fireEvent.click(copy());
    expect(writeText).toHaveBeenLastCalledWith('npm i typesense');

    fireEvent.click(screen.getByRole('tab', { name: 'pnpm' }));
    fireEvent.click(copy());
    expect(writeText).toHaveBeenLastCalledWith('pnpm add typesense');

    vi.unstubAllGlobals();
  });

  test('tab= 이 하나도 없으면 내용을 그대로 흘려보낸다', () => {
    // 글쓴이가 메타를 빠뜨린 경우다. 탭을 못 만든다고 코드를 숨기면
    // 글에서 문단 하나가 통째로 사라진다.
    renderMarkdown(
      ['<code-tabs>', '', '```bash', 'npm i', '```', '', '</code-tabs>'].join(
        '\n',
      ),
    );

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(shownCode()).toContain('npm i');
  });
});
