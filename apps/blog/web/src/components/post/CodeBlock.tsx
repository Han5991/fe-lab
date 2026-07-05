'use client';

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { css, cx } from '@design-system/ui-lib/css';
import { token } from '@design-system/ui-lib/tokens';
import { MermaidChart } from './MermaidChart';
import { codeText, isBlockCode } from './markdownCode';

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
        rounded: '[12px]',
        overflow: 'hidden',
        bg: '[#161b22]',
        borderWidth: '[1px]',
        borderColor: 'white/12',
      })}
    >
      {/* Window chrome dots + language label */}
      <div
        className={css({
          bg: '[#12171d]',
          px: '5',
          py: '3',
          display: 'flex',
          gap: '2.5',
          alignItems: 'center',
          borderBottomWidth: '[1px]',
          borderColor: 'white/8',
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
          background: '#161b22',
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
