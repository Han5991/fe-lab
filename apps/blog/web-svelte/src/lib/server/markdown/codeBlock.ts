import { h } from 'hastscript';
import type { Element, ElementContent, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { refractor } from 'refractor/core';
import bash from 'refractor/bash';
import cssLang from 'refractor/css';
import diff from 'refractor/diff';
import docker from 'refractor/docker';
import javascript from 'refractor/javascript';
import jsExtras from 'refractor/js-extras';
import jsdoc from 'refractor/jsdoc';
import json from 'refractor/json';
import jsx from 'refractor/jsx';
import markdown from 'refractor/markdown';
import markup from 'refractor/markup';
import tsx from 'refractor/tsx';
import typescript from 'refractor/typescript';
import yaml from 'refractor/yaml';
import {
  GRAMMAR_EXTENSION_ONLY,
  PLAIN_FENCE_LABELS,
  PRISM_LANGUAGES,
} from '@blog/content';
import { css } from '../../../../styled-system/css';

/**
 * 코드 블록 — **빌드 타임에** 구문을 강조하고 크롬을 씌운다.
 *
 * 원고에서 가장 많은 것이다(펜스 500개). 강조가 없으면 글의 절반이 회색
 * 덩어리가 되므로, 시각적으로도 번들 비교에서도 가장 큰 변수다.
 *
 * ## 무엇이 클라이언트로 가는가 — 아무것도
 *
 * React 판도 강조는 서버 컴포넌트가 빌드 타임에 한다(`check-bundle`의
 * "빌드 타임 구문 강조" 규칙이 그것을 잠근다 — 마커 `class="token`이 페이지에는
 * 있고 청크에는 없어야 한다). 여기서는 파서를 rehype 파이프라인에 직접 넣어
 * 같은 결과를 낸다. 마크업 모양도 같다: `<span class="token keyword">`.
 *
 * ## 언어 목록은 패키지가 소유한다
 *
 * `@blog/content`의 `PRISM_LANGUAGES`가 단일 출처다. `validate-posts`가 같은
 * 목록으로 등록되지 않은 fence 라벨을 빌드 시점에 잡으므로, 여기서 목록을 따로
 * 들면 "lint는 통과하는데 강조가 안 되는" 조합이 생긴다.
 *
 * **선언 순서가 곧 등록 순서이고, 순서가 결과를 바꾼다.** `typescript`는
 * `javascript` 문법을 복제해 만들어지므로, javascript를 패치하는
 * js-extras·jsdoc이 typescript보다 먼저 등록돼야 그 결과가 typescript/tsx
 * 코드에도 실린다. 목록의 선언 순서가 이미 그렇게 돼 있다.
 */

// ── 언어 등록 ────────────────────────────────────────────────────────────────

/**
 * refractor 언어 모듈을 **정적으로** 든다.
 *
 * 동적 import를 쓰면 등록이 비동기가 되고, 그러면 렌더도 비동기가 된다 —
 * `processSync` 한 줄이 async 사슬로 번진다. 이 파일은 서버 전용이라 정적
 * import가 클라이언트 번들에 닿지 않으므로, 그 비용을 치를 이유가 없다.
 */
const LANGUAGE_MODULES: Record<string, unknown> = {
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

/**
 * 등록 순서는 `PRISM_LANGUAGES`의 **선언 순서**를 따른다.
 *
 * `typescript`는 `javascript` 문법을 복제해 만들어지므로, javascript를 패치하는
 * js-extras·jsdoc이 typescript보다 먼저 등록돼야 그 결과가 typescript/tsx
 * 코드에도 실린다. 목록의 선언 순서가 이미 그렇게 돼 있고, 여기서 그 순서를
 * 그대로 쓴다 — 객체 리터럴 키 순서에 기대는 것이 아니라 목록을 순회한다.
 */
for (const name of Object.keys(PRISM_LANGUAGES)) {
  const mod = LANGUAGE_MODULES[name];
  // 목록과 모듈 표가 어긋나면 조용히 강조를 잃는 대신 여기서 멈춘다.
  if (mod === undefined) {
    throw new Error(
      `[codeBlock] refractor 모듈이 없는 언어: ${name}. ` +
        `@blog/content의 PRISM_LANGUAGES와 LANGUAGE_MODULES를 함께 고치세요.`,
    );
  }
  refractor.register(mod as Parameters<typeof refractor.register>[0]);
}

/** fence 라벨 → 등록된 언어 이름. 별칭도 받는다. */
const ALIASES = new Map<string, string>(
  Object.entries(PRISM_LANGUAGES).flatMap(([name, aliases]) =>
    GRAMMAR_EXTENSION_ONLY.has(name)
      ? []
      : [
          [name, name] as [string, string],
          ...aliases.map(alias => [alias, name] as [string, string]),
        ],
  ),
);

const PLAIN = new Set<string>(PLAIN_FENCE_LABELS);

// ── 스타일 ───────────────────────────────────────────────────────────────────

const shell = css({
  my: '6',
  rounded: 'card',
  borderWidth: 'hairline',
  borderColor: 'ink.border',
  overflow: 'hidden',
  bg: 'code.surface',
});

const bar = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  px: '4',
  py: '2',
  bg: 'code.chrome',
  borderBottomWidth: 'hairline',
  borderColor: 'ink.border',
  fontFamily: 'mono',
  fontSize: '[12px]',
  color: 'ink.600',
});

const barTitle = css({ color: 'accent.600' });

const body = css({
  m: '0',
  px: '4',
  py: '4',
  overflowX: 'auto',
  // 600px을 넘는 코드는 블록 안에서 세로로 스크롤된다(React 판과 같은 규칙).
  maxH: '[600px]',
  overflowY: 'auto',
  fontFamily: 'mono',
  fontSize: '[13px]',
  lineHeight: 'proseLoose',
  color: 'code.fg',
});

// ── 변환 ─────────────────────────────────────────────────────────────────────

/** `class="language-ts"`에서 라벨을 뽑는다. */
function fenceLabel(code: Element): string | undefined {
  const raw = code.properties.className;
  const list = Array.isArray(raw) ? raw : [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    if (item.startsWith('language-')) return item.slice('language-'.length);
  }
  return undefined;
}

function textOf(node: Element): string {
  let out = '';
  visit(node, 'text', (text: { value: string }) => {
    out += text.value;
  });
  return out;
}

function attr(node: Element, name: string): string | undefined {
  const value = node.properties[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * 강조된 자식 노드. 등록되지 않은 언어는 **평문으로 떨어진다** — 글 하나의
 * 오타난 fence 라벨로 페이지가 죽는 것이 훨씬 나쁘다(`lint:posts`가 별도로
 * 잡아 준다).
 */
function highlight(
  source: string,
  label: string | undefined,
): ElementContent[] {
  const language = label === undefined ? undefined : ALIASES.get(label);
  if (language === undefined) return [{ type: 'text', value: source }];
  try {
    return refractor.highlight(source, language).children as ElementContent[];
  } catch {
    return [{ type: 'text', value: source }];
  }
}

/**
 * `<pre><code>` → 크롬 + 강조된 본문.
 *
 * 상단 바는 **파일명이 있으면 경로를, 없으면 언어 라벨**을 보여준다. 둘은 한
 * 줄을 나눠 쓰지 않는다(파일명이 있으면 언어 라벨은 빠진다) — `blog-components`
 * 스킬이 규정한 계약이다.
 */
export function codeBlocks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (
        node.tagName !== 'pre' ||
        parent === undefined ||
        index === undefined
      ) {
        return;
      }
      const code = node.children.find(
        (child): child is Element =>
          child.type === 'element' && child.tagName === 'code',
      );
      if (code === undefined) return;

      const label = fenceLabel(code);
      // mermaid는 다른 렌더러의 몫이다 — 여기서 손대면 그림이 코드로 나간다.
      if (label === 'mermaid') return;

      const title = attr(code, 'dataTitle');
      const source = textOf(code).replace(/\n$/, '');
      const barLabel =
        title ?? (label !== undefined && !PLAIN.has(label) ? label : undefined);

      const children: Element[] = [];
      if (barLabel !== undefined) {
        children.push(
          h('div', { class: bar }, [
            h('span', { class: title !== undefined ? barTitle : '' }, [
              barLabel,
            ]),
          ]),
        );
      }
      children.push(
        h('pre', { class: body }, [
          h(
            'code',
            label === undefined ? {} : { class: `language-${label}` },
            highlight(source, label),
          ),
        ]),
      );

      parent.children[index] = h('div', { class: shell }, children);
    });
  };
}

/**
 * 인라인 `` `코드` `` — 본문에 얹히는 칩.
 *
 * **`codeBlocks`가 안 보는 자리다.** 그쪽은 `<pre><code>`만 다시 쓰므로, 문단
 * 안의 `<code>`는 클래스가 하나도 안 붙은 채로 나갔다. 글 전체에 수백 번 나오는
 * 요소라 이것만으로 본문이 리액트 판과 완전히 다르게 읽혔다(산출물 대조에서
 * `<code>baseUrl</code>` 대 `<code class="bg_paper.200 …">baseUrl</code>`로 잡혔다).
 *
 * `pre` 안쪽은 건드리지 않는다 — 거기 `<code>`는 이미 강조된 본문이고 칩 배경을
 * 얹으면 블록 안에 칩이 하나 더 생긴다.
 */
const inlineCode = css({
  bg: 'paper.200',
  color: 'ink.900',
  px: '1.5',
  py: '0.5',
  // 인라인 코드는 서브 서피스(paper.100) 위에 얹히는 칩이라 chip과 같은
  // 8px(control) 라운드를 쓴다.
  rounded: 'control',
  fontFamily: 'mono',
  fontSize: '[0.9em]',
  fontWeight: 'normal',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
});

export function inlineCodeChips() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, _index, parent) => {
      if (node.tagName !== 'code') return;
      // 블록 코드의 <code>는 부모가 <pre>다. 그건 codeBlocks의 몫.
      if (parent?.type === 'element' && parent.tagName === 'pre') return;

      const existing = node.properties.className;
      const classes = Array.isArray(existing)
        ? existing.filter((c): c is string => typeof c === 'string')
        : [];
      // 펜스 라벨(`language-*`)이 붙은 것은 블록 쪽이라 건드리지 않는다.
      if (classes.some(c => c.startsWith('language-'))) return;

      node.properties.className = [...classes, inlineCode];
    });
  };
}
