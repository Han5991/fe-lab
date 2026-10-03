/**
 * 문장 공유 링크의 URL 조립 — 텍스트 조각 지시어(`#:~:text=`)와, 조각을 만들 수
 * 없을 때 대신 쓰는 섹션 링크.
 *
 * 브라우저는 지시어를 읽어 그 문장으로 스크롤하고 `::target-text`로 칠한
 * 다음, 주소창과 `location.hash`에서는 지시어를 지운다(페이지 스크립트가 어느
 * 문장으로 들어왔는지 볼 수 없게 하려는 사양의 의도). 그래서 조각을 읽는 쪽
 * 코드는 없고, 만드는 쪽만 여기 있다.
 */

export interface TextFragment {
  textStart: string;
  textEnd?: string | undefined;
  prefix?: string | undefined;
  suffix?: string | undefined;
}

type PageLocation = Pick<Location, 'origin' | 'pathname'>;

/**
 * 조각의 한 항을 인코딩한다. `-`·`,`·`&`는 지시어 문법 기호라 글자로 쓰려면
 * 반드시 퍼센트 인코딩해야 한다 — encodeURIComponent는 `,`·`&`는 바꾸지만
 * `-`는 그대로 두므로 따로 바꾼다.
 */
const encodeTerm = (term: string) =>
  encodeURIComponent(term).replace(/-/g, '%2D');

/** `text=[prefix-,]textStart[,textEnd][,-suffix]` */
export function textDirective(fragment: TextFragment): string {
  const terms: string[] = [];
  if (fragment.prefix) terms.push(`${encodeTerm(fragment.prefix)}-`);
  terms.push(encodeTerm(fragment.textStart));
  if (fragment.textEnd) terms.push(encodeTerm(fragment.textEnd));
  if (fragment.suffix) terms.push(`-${encodeTerm(fragment.suffix)}`);
  return `text=${terms.join(',')}`;
}

/**
 * 지금 글 주소에 조각을 붙인다. 쿼리(utm 등)와 기존 해시는 버린다 — 공유되는
 * 주소는 글의 정규 주소여야 한다(경로는 이미 후행 슬래시를 단다).
 */
export function quoteUrl(page: PageLocation, fragment: TextFragment): string {
  return `${page.origin}${page.pathname}#:~:${textDirective(fragment)}`;
}

/** 조각을 만들 수 없을 때 — 선택이 속한 섹션의 헤딩으로, 그것도 없으면 글 주소. */
export function sectionUrl(
  page: PageLocation,
  headingId: string | null,
): string {
  const base = `${page.origin}${page.pathname}`;
  return headingId ? `${base}#${encodeURIComponent(headingId)}` : base;
}

const HEADING_TAG = /^H[2-4]$/;

/**
 * 선택이 시작된 자리 바로 위의 헤딩 id. 본문 헤딩은 `#post-content` 바로 아래
 * 블록이라(PostBody — TOC와 같은 DOM 계약) 시작 블록에서 형제를 거슬러 오른다.
 */
export function headingBefore(content: Element, node: Node): string | null {
  let block: Node | null = node;
  while (block && block.parentNode !== content) block = block.parentNode;
  if (!(block instanceof Element)) return null;

  for (
    let el: Element | null = block;
    el !== null;
    el = el.previousElementSibling
  ) {
    if (HEADING_TAG.test(el.tagName) && el.id) return el.id;
  }
  return null;
}
