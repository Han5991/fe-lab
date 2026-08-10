import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';

import { HEADING_COMPONENTS } from './markdownHeadings';

/** PostClient와 같은 플러그인 스택으로 본문을 렌더한다 */
function renderMarkdown(markdown: string) {
  return render(
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, rehypeSlug]}
      components={HEADING_COMPONENTS}
    >
      {markdown}
    </ReactMarkdown>,
  );
}

describe('HEADING_COMPONENTS', () => {
  test('본문 h1은 h2로 렌더된다', () => {
    // 페이지의 h1은 PostHeader의 글 제목 하나뿐이어야 한다.
    const { container } = renderMarkdown('# 절 제목\n');
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      '절 제목',
    );
  });

  test('h2 이하는 그대로 — 문서 전체를 한 칸씩 밀지 않는다', () => {
    // 전부 밀면 멀쩡한 h2 절들이 h3로 내려가 강조 색을 잃는다.
    const { container } = renderMarkdown('## 둘\n\n### 셋\n\n#### 넷\n');
    expect(container.querySelector('h2')).toHaveTextContent('둘');
    expect(container.querySelector('h3')).toHaveTextContent('셋');
    expect(container.querySelector('h4')).toHaveTextContent('넷');
  });

  test('rehype-slug가 붙인 id가 강등 후에도 남는다 (목차·앵커 링크)', () => {
    const { container } = renderMarkdown('# 프롤로그\n');
    expect(container.querySelector('h2')?.id).toBe('프롤로그');
  });

  test('rehype-raw가 살려낸 raw HTML <h1>도 강등된다', () => {
    // 마크다운 문법이 아니라 태그로 직접 쓴 경우까지 막아야 "본문에 h1이 없다"가 성립한다.
    const { container } = renderMarkdown('<h1>raw 제목</h1>');
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('h2')).toHaveTextContent('raw 제목');
  });
});
