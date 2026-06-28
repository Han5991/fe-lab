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
  const rawContent = typeof children === 'string' ? children : '';
  const content = rawContent.replace(/\n$/, '');
  const language = match?.[1];
  // 언어가 있거나 fenced 코드블록이면 블록으로 렌더. react-markdown은 fenced 블록 텍스트를
  // 줄바꿈으로 "끝나게" 주므로, rawContent가 \n으로 끝나면 fenced 블록(한 줄짜리·빈 줄로 시작하는
  // 경우 포함)으로 본다. 일반 인라인 코드와 줄을 넘긴 raw 인라인 <code>(예: `<code>\ntypes</code>`)
  // 는 \n으로 끝나지 않아 인라인으로 남고, <p> 안에 <div>가 들어가는 hydration 오류를 피한다.
  const isBlock = Boolean(match) || rawContent.endsWith('\n');

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
