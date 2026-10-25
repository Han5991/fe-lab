'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { css } from '@blog/styled-system/css';
import { iconButton } from '@/src/components/iconButton';
import { CODE_ACCENT, CODE_META } from './codeChrome';
import { MorphSwap } from './MorphSwap';

// CodeBlock과 CodeTabs가 같은 버튼을 쓴다 — 탭 안에서는 상단 바를 탭이
// 가져가므로 복사 버튼도 그쪽에서 그린다(복사 대상은 열려 있는 탭의 코드).
// 별도 파일인 이유: 이 버튼만 클라이언트(useState·clipboard)이고, 이걸
// CodeBlock에서 export하면 클라이언트 소비자가 CodeBlock 모듈째(구문 강조
// 스택 포함) 클라이언트 번들로 끌어온다.
export function CopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = useState(false);
  // "복사됨"을 거두는 타이머. 다시 누르면 앞 타이머가 새 표시를 일찍 거두고, 언마운트 뒤에
  // 터지면 사라진 컴포넌트의 상태를 바꾼다 — 둘 다 이 하나로 막는다.
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setIsCopied(false), 2000);
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
      // 크기·누름·보더 없는 원형은 iconButton의 sm(28)이다. 색만 코드 크롬에 맞춘다 — ghost의 hover
      // 면(paper.100)은 코드 표면(라이트 #f7f7f5 · 다크 #14171c)과 같아 지워지므로 한 단계 더 짙게 깐다.
      className={css(iconButton.raw({ tone: 'ghost', size: 'sm' }), {
        color: CODE_META,
        _hover: { color: CODE_ACCENT, bg: 'paper.300' },
        // 키보드 초점 링은 globalCss의 :focus-visible(accent.solid)이 준다 — 여기서 다시
        // 두면 같은 링이 두 벌이 된다.
      })}
    >
      <MorphSwap
        on={isCopied}
        before={<Clipboard size={16} />}
        after={<Check size={16} />}
      />
    </button>
  );
}
