'use client';

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { css, cx } from '@design-system/ui-lib/css';
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
        borderWidth: '1px',
        borderColor: 'white/10',
        cursor: 'pointer',
        transition: 'all 0.2s',
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

  if (match && match[1] === 'mermaid') {
    return <MermaidChart chart={content} />;
  }

  return match ? (
    <div
      className={css({
        mb: '12',
        mt: '8',
        pos: 'relative',
        shadow: '2xl',
        rounded: '2xl',
        overflow: 'hidden',
        borderWidth: '1px',
        borderColor: 'white/10',
      })}
    >
      {/* Window chrome dots + language label */}
      <div
        className={css({
          bg: '#1e1e1e',
          px: '5',
          py: '4',
          display: 'flex',
          gap: '2.5',
          alignItems: 'center',
          borderBottomWidth: '1px',
          borderColor: 'white/5',
        })}
      >
        <div
          className={css({ boxSize: '3', rounded: 'full', bg: '#ff5f56' })}
        />
        <div
          className={css({ boxSize: '3', rounded: 'full', bg: '#ffbd2e' })}
        />
        <div
          className={css({ boxSize: '3', rounded: 'full', bg: '#27c93f' })}
        />
        {match[1] && (
          <span
            className={css({
              ml: '4',
              color: 'gray.500',
              fontSize: 'xs',
              textTransform: 'uppercase',
              letterSpacing: 'widest',
              fontWeight: 'bold',
            })}
          >
            {match[1]}
          </span>
        )}
        <div className={css({ ml: 'auto' })}>
          <CopyButton content={content} />
        </div>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        customStyle={{
          borderRadius: 0,
          margin: 0,
          padding: '2rem',
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
          bg: 'gray.100',
          color: 'red.500',
          px: '1.5',
          py: '0.5',
          rounded: 'md',
          fontSize: '0.85em',
          fontWeight: '500',
          borderWidth: '1px',
          borderColor: 'gray.200',
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
