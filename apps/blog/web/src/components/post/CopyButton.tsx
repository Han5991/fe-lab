'use client';

import { useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { CODE_ACCENT, CODE_META } from './codeChrome';

// CodeBlock과 CodeTabs가 같은 버튼을 쓴다 — 탭 안에서는 상단 바를 탭이
// 가져가므로 복사 버튼도 그쪽에서 그린다(복사 대상은 열려 있는 탭의 코드).
// 별도 파일인 이유: 이 버튼만 클라이언트(useState·clipboard)이고, 이걸
// CodeBlock에서 export하면 클라이언트 소비자가 CodeBlock 모듈째(구문 강조
// 스택 포함) 클라이언트 번들로 끌어온다.
export function CopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <button
      onClick={() => void handleCopy()}
      // 'Copy'라는 글자를 아이콘으로 바꾸면서 접근 가능한 이름이 사라진다.
      // 상태(복사됨)까지 이름에 실어 스크린리더가 결과를 알 수 있게 한다.
      aria-label={isCopied ? '코드 복사됨' : '코드 복사'}
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        w: '7',
        h: '7',
        color: CODE_META,
        bg: 'transparent',
        rounded: 'control',
        cursor: 'pointer',
        transition: '[color 0.15s, background-color 0.15s]',
        _hover: { color: CODE_ACCENT, bg: 'paper.300' },
        // 아이콘만 남으면 키보드 포커스가 어디 있는지 안 보인다.
        _focusVisible: { outline: '[2px solid]', outlineColor: 'accent.500' },
      })}
    >
      {isCopied ? <Check size={15} /> : <Clipboard size={15} />}
    </button>
  );
}
