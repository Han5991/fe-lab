/**
 * 본문 파이프라인의 배선 자체를 잠근다 — 개별 컴포넌트 동작은 각자의
 * 테스트가 보고, 여기는 **매핑·플러그인·블록 판정이 같은 실물을 공유하는지**만
 * 본다. 매핑과 `BLOCK_MARKDOWN_COMPONENTS`가 서로 다른 바인딩을 들면
 * identity 판정이 어긋나 `<p><div>` 무효 중첩(hydration mismatch)으로 나타난다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { rehypeCodeMeta } from '@/src/components/post/codeMeta';
import { PostBody, POST_REHYPE_PLUGINS, buildPostComponents } from './PostBody';
import { BLOCK_MARKDOWN_COMPONENTS } from './markdownBlocks';

vi.mock('mermaid', () => ({ default: {} }));

describe('파이프라인 배선', () => {
  test('rehype 순서는 codeMeta → raw → slug다', () => {
    // 순서가 뒤집히면 펜스 메타가 조용히 사라진다(codeMeta.test.tsx의 대조군).
    expect(POST_REHYPE_PLUGINS).toEqual([
      rehypeCodeMeta,
      rehypeRaw,
      rehypeSlug,
    ]);
  });

  test('블록 판정 Set ↔ 매핑의 블록 컨테이너 태그가 정확히 일치한다', () => {
    const components = buildPostComponents('dir') ?? {};
    // 최상위 블록 컨테이너 태그의 단일 목록. 새 블록 태그를 매핑에 더할 때는
    // markdownBlocks.ts의 Set과 이 목록을 **함께** 늘린다 — 매핑에만 더하면
    // p 매퍼가 <p>를 유지해 <p><div> 무효 중첩(hydration mismatch)으로 새고,
    // Set에만 더하면 아래 완전 일치가 깨져 여기서 잡힌다.
    const blockTags = [
      'callout',
      'code-tabs',
      'diagram',
      'dialogue',
      'figure',
      'file-tree',
      'metrics',
      'timeline',
    ] as const;
    const mappedBlocks = new Set(
      blockTags.map(tag => (components as Record<string, unknown>)[tag]),
    );
    expect(mappedBlocks).toEqual(BLOCK_MARKDOWN_COMPONENTS);
  });
});

describe('PostBody 렌더', () => {
  test('#post-content 안에서 h1은 h2로 강등되고 slug id가 붙는다', () => {
    const { container } = render(
      <PostBody content={'# 첫 단원\n\n본문'} relativeDir="dir" />,
    );

    const root = container.querySelector('#post-content');
    expect(root).not.toBeNull();
    expect(root?.querySelector('h1')).toBeNull();
    expect(root?.querySelector('h2')?.id).toBe('첫-단원');
  });

  test('블록 컴포넌트가 <p>로 감싸이지 않는다', () => {
    const { container } = render(
      <PostBody
        content={'<callout type="info">안내</callout>'}
        relativeDir="dir"
      />,
    );

    expect(container.querySelector('p')).toBeNull();
  });
});
