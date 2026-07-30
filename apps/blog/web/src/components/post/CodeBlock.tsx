'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { css, cx } from '@design-system/ui-lib/css';
import { token } from '@design-system/ui-lib/tokens';
import { codeText, isBlockCode } from './markdownCode';

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
  rounded: '2xl',
  borderWidth: '[1px]',
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
        ml: '4',
        px: '2',
        py: '1',
        fontSize: 'xs',
        // 코드블록 크롬은 테마와 무관하게 항상 어둡다(#161b22/#12171d/#212a35).
        // 여기에 테마-가변 ink.500을 쓰면 라이트 테마에서 진한 회색 글자가
        // 어두운 배경에 얹혀 2.89:1까지 떨어진다. 크롬 색과 같은 계열의
        // 고정 밝은 회색을 쓴다.
        color: '[#9198a1]',
        bg: '[#212a35]',
        rounded: 'md',
        borderWidth: 'thin',
        borderColor: '[#343d47]',
        cursor: 'pointer',
        transition: '[all 0.2s]',
        _hover: {
          bg: '[#2d3742]',
          color: '[#58a6ff]',
          borderColor: '[#4a5560]',
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
        shadow: '2xl',
        rounded: '2xl',
        overflow: 'hidden',
        bg: { base: '[#161b22]' },
        borderWidth: 'thin',
        borderColor: 'ink.border',
      })}
    >
      <div
        className={css({
          bg: { base: '[#12171d]' },
          px: '5',
          py: '3',
          display: 'flex',
          gap: '2.5',
          alignItems: 'center',
          borderBottomWidth: 'thin',
          borderColor: 'ink.border',
        })}
      >
        <div
          className={css({ boxSize: '3', rounded: 'full', bg: '[#ff5f56]' })}
        />
        <div
          className={css({ boxSize: '3', rounded: 'full', bg: '[#ffbd2e]' })}
        />
        <div
          className={css({ boxSize: '3', rounded: 'full', bg: '[#27c93f]' })}
        />
        {language && (
          <span
            className={css({
              ml: '4',
              // CopyButton과 동일 — 항상 어두운 크롬 위의 고정 밝은 회색.
              color: '[#9198a1]',
              fontSize: 'xs',
              textTransform: 'uppercase',
              letterSpacing: 'widest',
              fontWeight: 'bold',
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
          padding: `${token('spacing.6')} ${token('spacing.8')}`,
          lineHeight: '1.8',
          background: 'transparent',
        }}
        {...props}
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
          rounded: '[6px]',
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
