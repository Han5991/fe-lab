/**
 * 토론에 싣는 섹션은 렌더된 본문 DOM에서 읽는다 — 경계(다음 최상위 헤딩
 * 직전까지), 하위 헤딩 보존, 버튼·그림 제거, 길이 상한을 잠근다.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { readSection, readWholePost, WHOLE_POST_ID } from './sectionText';

const mount = (html: string) => {
  const content = document.createElement('div');
  content.id = 'post-content';
  content.innerHTML = html;
  document.body.append(content);
  return content;
};

afterEach(() => {
  document.body.innerHTML = '';
});

const ARTICLE = `
  <p>도입 문단</p>
  <h2 id="why">왜 바꿨나</h2>
  <p>빌드가 <strong>4분</strong> 걸렸다.</p>
  <h3 id="measure">측정</h3>
  <figure>
    <div><svg><text>아이콘</text></svg><span>ts</span><button>복사</button></div>
    <pre><code>pnpm build</code></pre>
  </figure>
  <h2 id="result">결과</h2>
  <p>40초가 됐다.</p>
`;

describe('readSection', () => {
  test('최상위 헤딩부터 다음 최상위 헤딩 직전까지 읽는다', () => {
    const section = readSection(mount(ARTICLE), 'why');

    expect(section?.id).toBe('why');
    expect(section?.title).toBe('왜 바꿨나');
    expect(section?.text).toContain('빌드가 4분 걸렸다.');
    expect(section?.text).toContain('pnpm build');
    // 다음 섹션과 도입 문단은 섞이지 않는다.
    expect(section?.text).not.toContain('40초');
    expect(section?.text).not.toContain('도입 문단');
    expect(section?.truncated).toBe(false);
  });

  test('하위 헤딩은 마크다운 헤딩으로 남는다', () => {
    const section = readSection(mount(ARTICLE), 'why');

    expect(section?.text).toContain('### 측정');
  });

  test('복사 버튼·svg 글자는 싣지 않는다', () => {
    const section = readSection(mount(ARTICLE), 'why');

    expect(section?.text).not.toContain('복사');
    expect(section?.text).not.toContain('아이콘');
  });

  test('표·목록·코드는 모델이 읽을 수 있는 마크다운 모양으로 남긴다', () => {
    const section = readSection(
      mount(`
        <h2 id="numbers">숫자</h2>
        <div role="region"><table>
          <thead><tr><th></th><th>전</th><th>후</th></tr></thead>
          <tbody><tr><td>로컬</td><td>97.5초</td><td>117.8초</td></tr></tbody>
        </table></div>
        <ol><li>먼저 잰다</li><li>그다음 나눈다</li></ol>
        <ul><li>jsdom</li></ul>
        <figure><pre><code>pnpm test</code></pre></figure>
      `),
      'numbers',
    );

    expect(section?.text).toContain('| 로컬 | 97.5초 | 117.8초 |');
    expect(section?.text).toContain('1. 먼저 잰다');
    expect(section?.text).toContain('2. 그다음 나눈다');
    expect(section?.text).toContain('- jsdom');
    expect(section?.text).toContain('```\npnpm test\n```');
  });

  test('하위 헤딩 id를 주면 그것을 품은 최상위 섹션을 읽는다', () => {
    const section = readSection(mount(ARTICLE), 'measure');

    expect(section?.id).toBe('why');
    expect(section?.text).toContain('빌드가 4분 걸렸다.');
  });

  test('마지막 섹션은 본문 끝까지 읽는다', () => {
    const section = readSection(mount(ARTICLE), 'result');

    expect(section?.text).toBe('40초가 됐다.');
  });

  test('상한을 넘으면 앞부분만 싣고 잘렸다고 알린다', () => {
    const section = readSection(mount(ARTICLE), 'why', 5);

    expect(section?.text).toHaveLength(5);
    expect(section?.truncated).toBe(true);
  });

  test('본문 바로 아래에 없는 헤딩은 섹션을 정할 수 없다', () => {
    const content = mount(
      `${ARTICLE}<details><summary>더 보기</summary><h2 id="nested">안</h2></details>`,
    );

    expect(readSection(content, 'nested')).toBeNull();
    expect(readSection(content, 'missing')).toBeNull();
  });
});

describe('readWholePost', () => {
  test('헤딩이 없는 글은 본문 전체가 한 섹션이고 제목은 글 제목이다', () => {
    const section = readWholePost(
      mount('<p>첫 문단</p><p>둘째 문단</p>'),
      '짧은 글',
    );

    expect(section).toEqual({
      id: WHOLE_POST_ID,
      title: '짧은 글',
      text: '첫 문단\n\n둘째 문단',
      truncated: false,
    });
  });
});
