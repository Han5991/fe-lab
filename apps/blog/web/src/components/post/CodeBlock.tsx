'use client';

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
import { FileCode } from 'lucide-react';
import { css, cx } from '@design-system/ui-lib/css';
import { token } from '@design-system/ui-lib/tokens';
import { codeText, isBlockCode } from './markdownCode';
import { toDualTheme } from './codeTheme';
import { CopyButton } from './CopyButton';
import { MermaidLazy } from './MermaidLazy';
import {
  PRISM_LANGUAGES,
  GRAMMAR_EXTENSION_ONLY,
  type PrismLanguageName,
} from '@blog/content';

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
  // @types/react-syntax-highlighter가 언어 모듈을 전부 any로 선언한다 —
  // 값 타입이 unknown인 이 맵에 담기 전에 명시적으로 unknown으로 올린다.
  'js-extras': jsExtras as unknown,
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

/** refractor가 문법 함수에 넘겨주는 인스턴스 중 우리가 건드리는 부분만. */
interface Refractor {
  languages: Record<string, unknown>;
}
type Grammar = ((refractor: Refractor) => void) & { displayName: string };

/**
 * 문법 확장이 **두 번 적용되지 않게** 감싼다.
 *
 * refractor의 중복 등록 가드는 이렇게 생겼다:
 *
 *     if (!Object.hasOwn(refractor.languages, syntax.displayName)) syntax(refractor)
 *
 * 보통 언어 모듈은 `refractor.languages.typescript = …` 처럼 자기 이름 키를
 * 만들기 때문에 두 번째 등록부터 이 가드에 걸린다. 그런데 js-extras·jsdoc은
 * 언어가 아니라 javascript 문법에 `insertBefore`로 토큰을 **끼워 넣는 패치**라
 * 자기 이름 키를 남기지 않는다. 그래서 이 둘만 가드를 매번 통과하고, 모듈이 두 번
 * 평가되면 같은 토큰이 중첩 삽입돼 문법이 달라진다.
 *
 * 프로덕션은 빌드 프로세스에서 한 번만 평가되니 드러나지 않지만, 오래 떠 있는
 * dev 서버는 HMR로 재평가가 쌓인다. 그러면 서버가 내보내는 토큰이 클라이언트와
 * 갈려 글 전체가 하이드레이션 불일치로 다시 그려진다. 실측으로, 같은 글의 SSR
 * HTML에서 `property-access` 토큰이 dev 서버 재시작 전 12개 / 재시작 후 56개로
 * 나왔다.
 *
 * 패치를 끝낸 뒤 자기 이름 키를 남겨, 다음 등록부터는 refractor의 가드가 잡게 한다.
 *
 * (export는 CodeBlock.test.tsx가 이 계약을 직접 검증하기 위한 것이다. 렌더 결과로는
 *  토큰 중첩을 관찰할 수 없어 함수 단위로 못박는 편이 싸다.)
 */
export function registerOnce(mod: unknown, name: string): Grammar {
  const patch = mod as Grammar;
  return Object.assign(
    (refractor: Refractor) => {
      patch(refractor);
      refractor.languages[name] ??= {};
    },
    { displayName: name },
  );
}

for (const [name, mod] of Object.entries(LANGUAGE_MODULES)) {
  SyntaxHighlighter.registerLanguage(
    name,
    GRAMMAR_EXTENSION_ONLY.has(name) ? registerOnce(mod, name) : mod,
  );
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
// 코드 표면도 테마를 탄다.
//
// 예전에는 "코드 표면은 테마와 무관하게 항상 어둡다"가 규칙이었다. 이유는
// 하나뿐이었다 — vscDarkPlus의 구문 색이 다크 배경 전용 고정값이라 배경만
// 밝히면 대비가 무너졌기 때문이다. 그래서 크롬 색도 토큰을 못 쓰고 다크
// 팔레트에서 뽑은 hex를 박아 뒀다.
//
// 그 전제를 codeTheme.ts가 걷어냈다(구문 색이 라이트/다크 두 벌이 됐다).
// 남은 크롬 색은 이제 평범한 semanticToken이면 된다.
// ─────────────────────────────────────────────────────────────────────────
const CODE_SURFACE = 'code.surface';
const CODE_CHROME = 'code.chrome';
// 보더·메타 텍스트는 코드 전용 토큰을 따로 두지 않는다. 라이트/다크가 함께
// 도는 지금은 본문에서 쓰는 hairline·서브 텍스트와 같은 값이 맞다.
const CODE_BORDER = 'ink.border';
const CODE_META = 'ink.600';
// 드래그 선택 배경만 전용 토큰을 유지한다. 전역 ::selection(panda.config)의
// selection.bg는 라이트에서 옅은 하늘색이라, 코드 표면 위 파란 계열 토큰
// (string #0A3069, number #0550AE)을 지워버린다.
const CODE_SELECTION = 'code.selection';

// 구문 강조 한 벌을 라이트/다크 두 벌로. 다크 값은 vscDarkPlus 그대로라
// 다크 화면은 바뀌지 않는다(codeTheme.ts 주석 참고).
const CODE_THEME = toDualTheme(vscDarkPlus);

// 스크롤 없이 펼치는 코드의 한계. 레퍼런스(fumadocs)와 같은 600px이다.
// 이걸 넘는 블록은 글의 흐름을 끊고 목차·본문 위치 감각을 통째로 지운다.
const CODE_MAX_HEIGHT = 600;

interface CodeBlockProps {
  node?: unknown;
  className?: string | undefined;
  children?: React.ReactNode;
  /** ```ts title="lib/foo.ts" — rehypeCodeMeta가 승격해 준 파일명. */
  'data-title'?: string;
  /** ```bash tab="npm" — <code-tabs> 안에서 이 블록이 갖는 탭 이름. */
  'data-tab'?: string;
  /**
   * 상단 바·보더·라운드 없이 코드만 그린다. `<code-tabs>`가 자식에게
   * 켜 준다 — 탭 바가 이미 그 자리를 쓰고 있어서 그대로 두면 바가 겹친다.
   */
  'data-bare'?: boolean;
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
  'data-title': title,
  // 탭 이름은 CodeTabs가 목록을 만들 때 쓰고 블록 자신은 그리지 않는다.
  // 여기서 걷어내지 않으면 DOM 속성으로 새어 나간다.
  'data-tab': _tab,
  'data-bare': bare = false,
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
    return <MermaidLazy chart={content} />;
  }

  return isBlock ? (
    // 상단 바가 파일명을 다는 순간 이 상자는 "캡션이 붙은 도형"이 된다.
    // figure/figcaption이 그 관계를 마크업으로 남긴다(레퍼런스도 동일).
    <figure
      className={cx(
        css({
          mx: '0',
          pos: 'relative',
          overflow: 'hidden',
          bg: CODE_SURFACE,
          // 파일명·복사 버튼까지 포함해 이 상자 안쪽 전체를 덮는다.
          '&::selection, & ::selection': { bg: CODE_SELECTION },
        }),
        // 탭 안에서는 바깥 상자(CodeTabs)가 여백·보더·라운드를 이미 갖고
        // 있다. 여기서 또 그리면 상자가 이중으로 겹친다.
        !bare &&
          css({
            mb: '12',
            mt: '8',
            // 8px(control) → 12px(card). 레퍼런스와 같은 카드 라운드다.
            rounded: 'card',
            borderWidth: 'hairline',
            borderColor: CODE_BORDER,
          }),
      )}
    >
      {!bare && (
        <div
          className={css({
            bg: CODE_CHROME,
            px: '4',
            py: '2',
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            minH: '[36px]',
            borderBottomWidth: 'hairline',
            borderColor: CODE_BORDER,
          })}
        >
          {/* 맥 신호등 점 3개는 뺐다 — 아무 정보도 주지 않는 순수 장식이고,
              팔레트 밖의 빨강·노랑·초록이라 "포인트 1색" 원칙과 정면으로
              부딪힌다. 남은 건 파일명(없으면 언어 라벨)과 복사 버튼뿐. */}
          {title ? (
            <>
              <FileCode
                size={14}
                className={css({ color: CODE_META, flexShrink: '0' })}
                aria-hidden
              />
              <figcaption
                // 좁은 칼럼에서는 경로가 말줄임되는데, 그때 전체를 볼
                // 방법이 없으면 파일명을 단 의미가 반쯤 사라진다.
                title={title}
                className={css({
                  fontFamily: 'mono',
                  fontSize: 'xs',
                  letterSpacing: 'mono',
                  color: CODE_META,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                })}
              >
                {title}
              </figcaption>
            </>
          ) : (
            language && (
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
            )
          )}
          <div className={css({ ml: 'auto' })}>
            <CopyButton content={content} />
          </div>
        </div>
      )}
      <SyntaxHighlighter
        style={CODE_THEME}
        language={language || 'text'}
        customStyle={{
          borderRadius: 0,
          margin: 0,
          // 크롬이 얇아진 만큼 안쪽 여백도 줄여 680px 본문 칼럼에서 코드가
          // 실제로 쓸 수 있는 가로폭을 넓힌다.
          padding: `${token('spacing.5')} ${token('spacing.6')}`,
          lineHeight: '1.7',
          background: 'transparent',
          // 아주 긴 블록은 글의 흐름을 끊는다. 여기서 잘라 상자 안에서
          // 스크롤한다 — pre가 이미 가로 스크롤 컨테이너라 세로만 더하면 된다.
          maxHeight: `${CODE_MAX_HEIGHT}px`,
        }}
        {...props}
        // 코드 블록은 가로 스크롤되는데 포커스를 받을 수 없어 키보드만 쓰는
        // 사용자가 잘린 코드를 볼 방법이 없었다(axe scrollable-region-focusable,
        // impact serious — 글 하나에 10곳). props 뒤에 둬서 덮이지 않게 한다.
        tabIndex={0}
      >
        {content}
      </SyntaxHighlighter>
    </figure>
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
