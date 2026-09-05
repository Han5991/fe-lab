import { describe, expect, test } from 'vitest';
import worker, { resolveRedirect } from './index';

// apps/next.js/next.config.test.ts 를 그대로 옮겨온 케이스들.
// Next 내부 유틸(getPathMatch/prepareDestination) 대신 순수 함수를 직접 잠근다.
describe('blog 리디렉션 규칙', () => {
  test('루트는 blog 루트로', () => {
    expect(resolveRedirect('/')).toBe('https://blog.sangwook.dev/');
  });

  test.each(['/sitemap.xml', '/robots.txt', '/rss.xml'])(
    '루트 레벨 파일 %s 은 후행 슬래시 없이 전달',
    path => {
      expect(resolveRedirect(path)).toBe(`https://blog.sangwook.dev${path}`);
    },
  );

  test('하위 경로 파일도 슬래시 인코딩(%2F) 없이 그대로 전달', () => {
    expect(resolveRedirect('/assets/logo.png')).toBe(
      'https://blog.sangwook.dev/assets/logo.png',
    );
    expect(resolveRedirect('/posts/img/pic.png')).toBe(
      'https://blog.sangwook.dev/posts/img/pic.png',
    );
  });

  test('확장자 없는 일반 경로는 후행 슬래시를 붙여 전달', () => {
    expect(resolveRedirect('/posts/some-post')).toBe(
      'https://blog.sangwook.dev/posts/some-post/',
    );
    expect(resolveRedirect('/about')).toBe('https://blog.sangwook.dev/about/');
  });

  test('이미 후행 슬래시가 붙어 들어와도 슬래시가 중복되지 않는다', () => {
    expect(resolveRedirect('/about/')).toBe('https://blog.sangwook.dev/about/');
  });

  test('원본과 동일한 한계 — 점 포함 슬러그는 파일로 오분류된다', () => {
    expect(resolveRedirect('/posts/vue-3.0')).toBe(
      'https://blog.sangwook.dev/posts/vue-3.0',
    );
  });
});

// 순수 함수 위에 핸들러가 얹는 두 가지 — 상태 코드와 쿼리스트링 — 을 잠근다.
// 둘 다 Next에서 넘어온 계약이라 조용히 바뀌면 알아채기 어렵다.
describe('fetch 핸들러', () => {
  test('301이 아니라 308로 응답한다 (Next permanent: true 와 동일)', () => {
    const response = worker.fetch(new Request('https://sangwook.dev/about'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://blog.sangwook.dev/about/',
    );
  });

  test('쿼리스트링은 그대로 따라간다', () => {
    const response = worker.fetch(
      new Request('https://sangwook.dev/posts?tag=next&page=2'),
    );
    expect(response.headers.get('location')).toBe(
      'https://blog.sangwook.dev/posts/?tag=next&page=2',
    );
  });
});
