/**
 * 본문 raw HTML에서 실행되거나 페이지를 가로채는 요소를 걷어낸다 — 같은 출처의
 * `/admin` 세션이 원고 한 줄로 탈취되지 않게. `javascript:` URL과 `on*=` 속성은
 * react-markdown·React가 이미 막는다. rehype-sanitize 대신 차단 목록인 건 커스텀
 * 태그를 허용 목록에 옮겨 적지 않기 위해서다. rehypeRaw 뒤에 둔다.
 */

interface HastNode {
  type: string;
  tagName?: string;
  children?: HastNode[];
}

/** 걷어낼 요소 — 코드를 실행·삽입하거나, 페이지 동작을 바꾸거나, 화면·입력을 가장하는 것. */
export const UNSAFE_TAGS: ReadonlySet<string> = new Set([
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'base',
  'meta',
  'link',
  'style',
  'form',
]);

export function rehypeDropUnsafe() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.filter(child => {
        const unsafe =
          child.type === 'element' &&
          child.tagName !== undefined &&
          UNSAFE_TAGS.has(child.tagName);
        if (unsafe && process.env.NODE_ENV === 'development') {
          console.warn(
            `[post] 본문의 <${child.tagName}>를 지웠습니다 — 실행되거나 ` +
              '페이지를 가로챌 수 있는 태그는 본문에 쓸 수 없습니다.',
          );
        }
        return !unsafe;
      });
      node.children.forEach(visit);
    };
    visit(tree);
  };
}
