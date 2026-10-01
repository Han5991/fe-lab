/**
 * 지금 토론할 섹션의 글을 **렌더된 본문 DOM**에서 읽는다.
 *
 * 마크다운 원문을 props로 내려 주지 않는 이유: 페이지가 서버 컴포넌트라 원문을
 * 클라이언트 컴포넌트에 넘기는 순간 글 전체가 RSC 페이로드로 HTML에 한 벌 더
 * 실린다 — 이 기능을 못 쓰는 브라우저(모바일 전부)까지 그 무게를 진다. 본문은
 * 이미 `#post-content`에 있고 헤딩 id도 rehype-slug가 붙여 두었으니(TOC와 같은
 * DOM 계약) 거기서 읽으면 추가 전송이 0이다.
 */

export interface Section {
  /** 섹션 머리 헤딩의 id */
  id: string;
  title: string;
  text: string;
  /** 길어서 `MAX_SECTION_CHARS`에서 잘렸는가 */
  truncated: boolean;
}

/**
 * 모델에 싣는 섹션 본문의 상한(글자). 공개 글을 h2 단위로 자르면 중앙값
 * 약 700자, 90퍼센타일 약 2,900자, 최대 약 11,700자다 — 대부분은 통째로
 * 들어가고 긴 몇 개만 앞부분이 실린다. 내장 모델의 컨텍스트 창이 수천 토큰
 * 수준이라 그보다 크게 잡지 않는다. 실제 사용량은 패널 하단에 찍힌다.
 */
export const MAX_SECTION_CHARS = 4000;

const HEADING_TAG = /^H[2-4]$/;

/** 본문 h1은 렌더 때 h2로 강등되므로(markdownHeadings.tsx) h2~h4만 본다. */
function headingLevel(el: Element): number | null {
  return HEADING_TAG.test(el.tagName) ? Number(el.tagName.slice(1)) : null;
}

const cellText = (cell: Element) =>
  (cell.textContent ?? '').trim().replace(/\s+/g, ' ');

/** 표는 칸을 `|`로 가른 행으로 — textContent는 칸 사이에 아무것도 넣지 않아 숫자가 한 덩어리가 된다. */
function tableText(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr')).map(
    row => `| ${Array.from(row.children).map(cellText).join(' | ')} |`,
  );
  return `\n${rows.join('\n')}\n`;
}

/** 블록 경계로 볼 요소 — 끝에 줄바꿈을 넣어 옆 블록과 글자가 붙지 않게 한다. */
const BLOCKS = 'p, div, figcaption, blockquote, summary, dt, dd, h5, h6';

/**
 * 블록 하나의 읽을 글자. 복사 버튼·아이콘·그림(svg)은 빼고, 모델이 구조를 읽을
 * 수 있게 표·코드·목록은 마크다운 모양으로 되돌린다.
 */
function blockText(el: Element): string {
  // 감싸 두면 el 자신이 표·코드·목록이어도 아래 querySelectorAll에 걸린다.
  const box = el.ownerDocument.createElement('div');
  box.append(el.cloneNode(true));
  box
    .querySelectorAll('button, svg, [aria-hidden="true"]')
    .forEach(node => node.remove());
  box.querySelectorAll('table').forEach(table => {
    table.replaceWith(tableText(table));
  });
  box.querySelectorAll('pre').forEach(pre => {
    pre.replaceWith(`\n\`\`\`\n${(pre.textContent ?? '').trim()}\n\`\`\`\n`);
  });
  box.querySelectorAll('li').forEach(item => {
    const list = item.parentElement;
    const marker =
      list?.tagName === 'OL'
        ? `${Array.from(list.children).indexOf(item) + 1}. `
        : '- ';
    item.prepend(marker);
    item.append('\n');
  });
  box.querySelectorAll(BLOCKS).forEach(block => block.append('\n'));
  return (box.textContent ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * `headingId`가 속한 **최상위 섹션**을 읽는다 — 그 헤딩에서 거슬러 올라가 가장
 * 가까운 최상위 헤딩부터, 다음 최상위 헤딩 직전까지. 하위 헤딩은 마크다운
 * 헤딩 문법으로 남겨 모델이 구조를 볼 수 있게 한다.
 *
 * 헤딩이 본문 바로 아래에 있지 않으면(`<details>` 안 등) 섹션을 정할 수 없어
 * null이다.
 */
export function readSection(
  content: Element,
  headingId: string,
  maxChars = MAX_SECTION_CHARS,
): Section | null {
  const headings = Array.from(content.children).filter(
    el => headingLevel(el) !== null,
  );
  const index = headings.findIndex(el => el.id === headingId);
  if (index === -1) return null;

  const top = Math.min(...headings.map(el => headingLevel(el) ?? 4));
  let startIndex = index;
  while (startIndex > 0) {
    const el = headings[startIndex];
    if (el && headingLevel(el) === top) break;
    startIndex -= 1;
  }
  const start = headings[startIndex];
  if (!start) return null;

  const parts: string[] = [];
  for (
    let el = start.nextElementSibling;
    el !== null;
    el = el.nextElementSibling
  ) {
    const level = headingLevel(el);
    if (level !== null && level <= top) break;
    const text =
      level !== null
        ? `${'#'.repeat(level)} ${(el.textContent ?? '').trim()}`
        : blockText(el);
    if (text) parts.push(text);
  }

  return toSection(start.id, (start.textContent ?? '').trim(), parts, maxChars);
}

/** 헤딩이 하나도 없는 글 — 본문 전체가 한 섹션이다. 제목은 글 제목을 쓴다. */
export const WHOLE_POST_ID = 'post-content';

export function readWholePost(
  content: Element,
  postTitle: string,
  maxChars = MAX_SECTION_CHARS,
): Section {
  const parts = Array.from(content.children).map(blockText).filter(Boolean);
  return toSection(WHOLE_POST_ID, postTitle, parts, maxChars);
}

function toSection(
  id: string,
  title: string,
  parts: string[],
  maxChars: number,
): Section {
  const full = parts.join('\n\n');
  const truncated = full.length > maxChars;
  return {
    id,
    title,
    text: truncated ? full.slice(0, maxChars) : full,
    truncated,
  };
}
