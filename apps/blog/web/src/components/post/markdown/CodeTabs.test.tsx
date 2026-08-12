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

  test('Home / End 로 양 끝 탭으로 간다', () => {
    // 탭이 넷 이상이면 화살표만으로 끝까지 가는 게 번거롭다(WAI-ARIA 권장).
    renderMarkdown(TABS_MD);
    const first = screen.getByRole('tab', { name: 'npm' });
    first.focus();

    fireEvent.keyDown(first, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'pnpm' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('tab', { name: 'pnpm' }), {
      key: 'Home',
    });
    expect(screen.getByRole('tab', { name: 'npm' })).toHaveFocus();
    expect(shownCode()).toContain('npm i typesense');
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

  test('코드 블록이 하나도 없으면 내용을 그대로 흘려보낸다', () => {
    // 태그만 열어 두고 안을 안 채웠거나 빈 줄을 빠뜨린 경우다.
    renderMarkdown(
      ['<code-tabs>', '', '그냥 문단', '', '</code-tabs>'].join('\n'),
    );

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(document.body.textContent).toContain('그냥 문단');
  });
});

/**
 * `tab=`을 빠뜨린 자식을 어떻게 다루는가.
 *
 * 셋 중 하나에만 이름을 안 다는 건 흔한 실수인데, 예전 구현은 그 블록을
 * 목록에서 제외하기만 해서 **화면에서 통째로 사라졌다.** 에러도 경고도 없어
 * 글쓴이는 발행한 뒤에야 알아챈다. 여기서는 "어느 자식도 버리지 않는다"를
 * 고정한다.
 */
describe('CodeTabs — 이름 없는 자식', () => {
  test('일부만 tab= 을 달아도 나머지 코드가 사라지지 않는다', () => {
    renderMarkdown(
      [
        '<code-tabs>',
        '',
        '```bash tab="npm"',
        'npm i typesense',
        '```',
        '',
        '```bash',
        'yarn add typesense',
        '```',
        '',
        '</code-tabs>',
      ].join('\n'),
    );

    // 이름이 없으면 언어명이 대신 라벨이 된다.
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual([
      'npm',
      'bash',
    ]);

    fireEvent.click(screen.getByRole('tab', { name: 'bash' }));
    expect(shownCode()).toContain('yarn add typesense');
  });

  test('언어도 없으면 순번으로 이름을 짓는다', () => {
    renderMarkdown(
      [
        '<code-tabs>',
        '',
        '```',
        'plain one',
        '```',
        '',
        '```',
        'plain two',
        '```',
        '',
        '</code-tabs>',
      ].join('\n'),
    );

    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual([
      '코드 1',
      '코드 2',
    ]);
  });

  test('코드가 아닌 자식은 탭 밖에 그대로 남는다', () => {
    // 탭이 될 수 없다고 감추면 글에서 문단이 사라진다.
    renderMarkdown(
      [
        '<code-tabs>',
        '',
        '설치는 아래 중 하나로.',
        '',
        '```bash tab="npm"',
        'npm i',
        '```',
        '',
        '</code-tabs>',
      ].join('\n'),
    );

    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(document.body.textContent).toContain('설치는 아래 중 하나로.');
  });
});
