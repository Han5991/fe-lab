'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import markup from 'react-syntax-highlighter/dist/cjs/languages/prism/markup';
import cssLang from 'react-syntax-highlighter/dist/cjs/languages/prism/css';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/cjs/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript';
import tsx from 'react-syntax-highlighter/dist/cjs/languages/prism/tsx';
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import yaml from 'react-syntax-highlighter/dist/cjs/languages/prism/yaml';
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json';
import diff from 'react-syntax-highlighter/dist/cjs/languages/prism/diff';
import markdown from 'react-syntax-highlighter/dist/cjs/languages/prism/markdown';
import docker from 'react-syntax-highlighter/dist/cjs/languages/prism/docker';
import jsExtras from 'react-syntax-highlighter/dist/cjs/languages/prism/js-extras';
import jsdoc from 'react-syntax-highlighter/dist/cjs/languages/prism/jsdoc';
import { css, cx } from '@design-system/ui-lib/css';
import { token } from '@design-system/ui-lib/tokens';
import { codeText, isBlockCode } from './markdownCode';
import { PRISM_LANGUAGES, type PrismLanguageName } from './prismLanguages';

// `Prism` export는 refractor 전 언어(300여 종)를 번들해 gzip 350KB 청크가
// 된다. 글이 실제로 쓰는 fence는 십여 종뿐이라 PrismLight로 바꾸고 필요한
// 언어만 등록한다. refractor 5의 언어 모듈은 의존성을 스스로 등록하므로
// (예: tsx → jsx + typescript) 등록 순서를 신경 쓸 필요가 없다.
// 목록과 순서의 단일 출처는 prismLanguages.ts이고, 아래 맵이 그와 어긋나면
// prismLanguages.test.tsx가 실패한다. (순서도 의미가 있다 — 주석 참고)
export const LANGUAGE_MODULES: Record<PrismLanguageName, unknown> = {
  markup,
  css: cssLang,
  javascript,
  jsx,
  'js-extras': jsExtras,
  jsdoc,
  typescript,
  tsx,
  bash,
  yaml,
  json,
  diff,
  markdown,
  docker,
};

for (const [name, mod] of Object.entries(LANGUAGE_MODULES)) {
  SyntaxHighlighter.registerLanguage(name, mod);
}
// refractor의 register()는 언어 함수만 등록하고 별칭은 붙이지 않는다.
// `js`/`ts`/`md`/`dockerfile` 같은 라벨이 평문으로 떨어지지 않도록 따로 건다.
SyntaxHighlighter.alias(
  Object.fromEntries(
    Object.entries(PRISM_LANGUAGES)
      .filter(([, aliases]) => aliases.length > 0)
      // PRISM_LANGUAGES는 `as const`라 별칭이 readonly 튜플이다. refractor의
      // alias()는 mutable string[]을 받으므로 복사해서 넘긴다.
      .map(([name, aliases]) => [name, [...aliases]] as const),
  ),
);

// ─────────────────────────────────────────────────────────────────────────
// 코드 표면은 테마와 무관하게 항상 어둡다. react-syntax-highlighter가 쓰는
// vscDarkPlus 토큰 색이 고정값이라, 라이트 테마에서 배경만 밝히면 구문 강조
// 색이 통째로 대비를 잃는다. 그래서 크롬 색은 토큰이 아니라 "새 다크 팔레트에서
// 뽑은 고정값"을 쓴다. 각각 paper.50 / paper.100 / ink.border / ink.600 /
// accent.500 의 _dark 값이고, 보더만 8자리 hex(≈ 12% 알파)로 옮겨 적었다.
// (여기에 테마-가변 토큰을 쓰면 라이트 테마에서 검은 보더·진한 회색 글자가
//  어두운 크롬 위에 얹혀 대비가 3:1 아래로 떨어진다.)
// ─────────────────────────────────────────────────────────────────────────
const CODE_SURFACE = '[#0b0d10]';
const CODE_CHROME = '[#14171c]';
const CODE_BORDER = '[#ffffff1f]';
const CODE_META = '[#8b919a]';
const CODE_ACCENT = '[#67e8f9]';

// mermaid는 d3·dagre까지 끌고 와 raw 1.1MB(gzip 360KB)짜리 청크가 된다.
// 정적 import면 CodeBlock을 쓰는 모든 글 — 즉 mermaid 다이어그램이 하나도
// 없는 글까지 — 이 청크를 초기 로드에 포함한다(71편 중 mermaid를 쓰는 건 6편).
// 아래 `language === 'mermaid'` 분기에 도달할 때만 받아오도록 분리한다.
// MermaidChart는 원래도 useEffect 안에서만 렌더하므로 ssr: false로 잃는 건 없다.
const MermaidChart = dynamic(
  () => import('./MermaidChart').then(m => m.MermaidChart),
  {
    ssr: false,
    // 청크를 받는 동안 도표 자리를 잡아둬 레이아웃 시프트를 막는다.
    loading: () => <div className={mermaidBoxStyle} />,
  },
);

// MermaidChart 내부 컨테이너와 같은 박스 — placeholder와 실제 도표의 자리가
// 어긋나지 않게 여기서도 동일한 여백/테두리를 쓴다.
const mermaidBoxStyle = css({
  my: '10',
  p: '6',
  minH: '[120px]',
  bg: 'paper.100',
  rounded: 'card',
  borderWidth: 'hairline',
  borderColor: 'ink.border',
});

function CopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }, [content]);

  return (
    <button
      onClick={handleCopy}
      className={css({
        px: '2.5',
        py: '1',
        fontFamily: 'mono',
        fontSize: 'xs',
        color: CODE_META,
        bg: 'transparent',
        rounded: 'control',
        borderWidth: 'hairline',
        borderColor: CODE_BORDER,
        cursor: 'pointer',
        transition: '[color 0.15s, border-color 0.15s]',
        _hover: {
          color: CODE_ACCENT,
          borderColor: CODE_ACCENT,
        },
      })}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface CodeBlockProps {
  node?: unknown;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

/**
 * Markdown 코드 블록 렌더러.
 * mermaid, 구문 강조(fenced code), 인라인 코드 모두 처리합니다.
 */
export function CodeBlock({
  node: _node,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '');
  const rawContent = codeText(children);
  const content = rawContent.replace(/\n$/, '');
  const language = match?.[1];
  // 블록/인라인 판별은 isBlockCode 하나로 단일화한다. <p>/<div> 래퍼를 정하는
  // isBlockMarkdownChild도 같은 함수를 써야 <p> 안 <div> hydration 오류가 안 난다.
  const isBlock = isBlockCode(children, className);

  if (language === 'mermaid') {
    return <MermaidChart chart={content} />;
  }

  return isBlock ? (
    <div
      className={css({
        mb: '12',
        mt: '8',
        pos: 'relative',
        rounded: 'control',
        overflow: 'hidden',
        bg: CODE_SURFACE,
        borderWidth: 'hairline',
        borderColor: CODE_BORDER,
      })}
    >
      <div
        className={css({
          bg: CODE_CHROME,
          px: '4',
          py: '2',
          display: 'flex',
          alignItems: 'center',
          minH: '[36px]',
          borderBottomWidth: 'hairline',
          borderColor: CODE_BORDER,
        })}
      >
        {/* 맥 신호등 점 3개는 뺐다 — 아무 정보도 주지 않는 순수 장식이고,
            팔레트 밖의 빨강·노랑·초록이라 "포인트 1색" 원칙과 정면으로 부딪힌다.
            남은 건 언어 라벨(모노)과 복사 버튼뿐. */}
        {language && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              letterSpacing: 'mono',
              color: CODE_META,
            })}
          >
            {language}
          </span>
        )}
        <div className={css({ ml: 'auto' })}>
          <CopyButton content={content} />
        </div>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'text'}
        customStyle={{
          borderRadius: 0,
          margin: 0,
          // 크롬이 얇아진 만큼 안쪽 여백도 줄여 680px 본문 칼럼에서 코드가
          // 실제로 쓸 수 있는 가로폭을 넓힌다.
          padding: `${token('spacing.5')} ${token('spacing.6')}`,
          lineHeight: '1.7',
          background: 'transparent',
        }}
        {...props}
        // 코드 블록은 가로 스크롤되는데 포커스를 받을 수 없어 키보드만 쓰는
        // 사용자가 잘린 코드를 볼 방법이 없었다(axe scrollable-region-focusable,
        // impact serious — 글 하나에 10곳). props 뒤에 둬서 덮이지 않게 한다.
        tabIndex={0}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code
      className={cx(
        className,
        css({
          bg: 'paper.200',
          color: 'ink.900',
          px: '1.5',
          py: '0.5',
          // 인라인 코드는 서브 서피스(paper.100) 위에 얹히는 칩이라
          // 레퍼런스의 chip과 같은 8px(control) 라운드를 쓴다.
          rounded: 'control',
          fontSize: '[0.9em]',
          fontWeight: 'normal',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }),
      )}
      {...props}
    >
      {children}
    </code>
  );
}
