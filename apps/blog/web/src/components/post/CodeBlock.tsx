'use client';

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { css, cx } from '@design-system/ui-lib/css';
import { token } from '@design-system/ui-lib/tokens';
import { MermaidChart } from './MermaidChart';

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
        color: 'gray.400',
        bg: 'white/5',
        rounded: 'md',
        borderWidth: '[1px]',
        borderColor: 'white/10',
        cursor: 'pointer',
        transition: '[all 0.2s]',
        _hover: {
          bg: 'white/10',
          color: 'blue.400',
          borderColor: 'blue.500/30',
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
  const content = String(children).replace(/\n$/, '');
  const language = match?.[1];
  // 언어가 있거나, 언어 없이도 "내부에" 줄바꿈이 있으면(= fenced 코드블록) 블록으로 렌더.
  // trim 후 판별하는 이유: raw HTML 인라인 <code>가 앞뒤로 줄바꿈을 끼고 작성될 수 있는데
  // (예: 본문에서 줄을 넘긴 `<code>\ntypes</code>`), 이를 블록으로 오인하면 <p> 안에
  // <div>가 들어가 hydration 오류가 난다. 진짜 인라인 코드는 내부 줄바꿈이 없다.
  const isBlock = Boolean(match) || content.trim().includes('\n');

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
        borderWidth: '[1px]',
        borderColor: 'white/10',
      })}
    >
      {/* Window chrome dots + language label */}
      <div
        className={css({
          bg: '[#1e1e1e]',
          px: '5',
          py: '4',
          display: 'flex',
          gap: '2.5',
          alignItems: 'center',
          borderBottomWidth: '[1px]',
          borderColor: 'white/5',
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
              color: 'ink.500',
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
        PreTag="div"
        customStyle={{
          borderRadius: 0,
          margin: 0,
          padding: `${token('spacing.6')} ${token('spacing.8')}`,
          lineHeight: '1.8',
          background: '#1e1e1e',
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
          bg: 'paper.100',
          color: 'marker.600',
          px: '1.5',
          py: '0.5',
          rounded: 'md',
          fontSize: '[0.85em]',
          fontWeight: 'medium',
          borderWidth: '[1px]',
          borderColor: 'ink.border',
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
