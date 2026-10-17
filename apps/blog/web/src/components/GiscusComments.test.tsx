/**
 * 댓글 위젯은 env 넷이 다 있고 repo가 `owner/name` 모양일 때만 그린다.
 * env는 빌드 때 인라인되는 그냥 문자열이라 모양을 타입이 보증하지 않는다 —
 * 모양이 틀리면 깨진 iframe 대신 댓글 영역을 비운다.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import GiscusComments from './GiscusComments';

// @giscus/react는 웹 컴포넌트를 동적 import한 뒤에야 그리고 그 전엔 null이다 — 진짜를
// 쓰면 "안 그렸다"와 "아직 못 그렸다"가 같은 빈 화면이라 아래 테스트가 공허해진다.
// 받은 repo를 곧바로 그리는 대역으로 바꾼다.
vi.mock('@giscus/react', () => ({
  default: ({ repo }: { repo: string }) => (
    <section aria-label="댓글">{repo}</section>
  ),
}));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_GISCUS_REPO', 'test-owner/test-repo');
  vi.stubEnv('NEXT_PUBLIC_GISCUS_REPO_ID', 'test-repo-id');
  vi.stubEnv('NEXT_PUBLIC_GISCUS_CATEGORY', 'test-category');
  vi.stubEnv('NEXT_PUBLIC_GISCUS_CATEGORY_ID', 'test-category-id');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('(대조) env가 모두 맞으면 위젯을 그린다', () => {
  render(<GiscusComments />);

  expect(screen.getByRole('region', { name: '댓글' })).toHaveTextContent(
    'test-owner/test-repo',
  );
});

test.each([
  'test-owner',
  'test-owner/test-repo/extra',
  '/test-repo',
  'test-owner/',
])('repo가 owner/name 모양이 아니면(%s) 아무것도 그리지 않는다', repo => {
  vi.stubEnv('NEXT_PUBLIC_GISCUS_REPO', repo);

  render(<GiscusComments />);

  expect(screen.queryByRole('region', { name: '댓글' })).toBeNull();
});
