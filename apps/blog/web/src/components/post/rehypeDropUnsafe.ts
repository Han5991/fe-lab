/**
 * 본문 raw HTML에서 **실행되거나 페이지를 가로채는 요소**를 통째로 걷어낸다.
 *
 * 본문은 rehype-raw로 raw HTML을 살려서 그린다(커스텀 태그가 그 경로를 탄다).
 * 그 대가로 원고에 적힌 `<script>`·`<iframe>`도 서버 HTML에 그대로 실려 나가고,
 * 인라인 스크립트는 로드 즉시 실행된다. 원고는 저장소 쓰기 권한자만 고치지만,
 * 같은 출처에 `/admin`(localStorage의 Supabase 세션)이 살아 있어 한 줄의 실수나
 * 복사해 붙인 임베드 코드가 곧 세션 탈취 경로가 된다.
 *
 * 이미 막혀 있는 것은 다시 막지 않는다 — `javascript:` URL은 react-markdown의
 * `urlTransform`이 비우고, `on*=` 속성은 React가 문자열 핸들러를 버린다. 남는
 * 구멍은 **요소 단위**라 여기서 요소를 지운다. 발행 글 중 아래 태그를 raw HTML로
 * 쓰는 글은 없다(코드 펜스 안의 예시는 텍스트라 해당 없음).
 *
 * rehype-sanitize를 쓰지 않는 이유: 커스텀 태그(`<diagram-node>` 등)와 그
 * 속성을 전부 허용 목록에 옮겨 적어야 하고, 새 태그마다 두 곳이 어긋난다. 막을
 * 것이 좁고 분명하므로 차단 목록이 더 싸다.
 *
 * **rehypeRaw 뒤에** 둬야 한다 — 그 전에는 raw HTML이 요소가 아니라 문자열(`raw`
 * 노드)이라 태그 이름으로 가릴 수 없다.
 */

interface HastNode {
  type: string;
  tagName?: string;
  children?: HastNode[];
}

/**
 * 걷어낼 요소. 셋으로 나뉜다.
 *
 * - 코드를 실행하거나 다른 문서를 끼워 넣는 것: script, iframe, frame, frameset,
 *   object, embed, applet
 * - 페이지 전체의 동작을 바꾸는 것: base(상대 URL 전부의 기준), meta(`http-equiv`
 *   리다이렉트·CSP 덮어쓰기), link(외부 스타일·프리로드)
 * - 화면을 가장하거나 입력을 빼돌리는 것: style(전역 CSS로 UI 위장), form(가짜
 *   로그인 폼의 전송)
 */
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
