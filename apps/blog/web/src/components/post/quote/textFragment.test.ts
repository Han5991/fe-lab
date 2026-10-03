/**
 * 문장 공유 링크의 URL — 지시어 문법 기호(`-`·`,`·`&`)를 글자로 쓰려면 인코딩해야
 * 하고, 공유되는 주소는 쿼리·기존 해시를 버린 글 주소여야 한다.
 */
import { afterEach, describe, expect, test } from 'vitest';
import {
  headingBefore,
  quoteUrl,
  sectionUrl,
  textDirective,
} from './textFragment';

const PAGE = {
  origin: 'https://blog.example.dev',
  pathname: '/posts/vitest-split/',
};

describe('textDirective', () => {
  test('문장 하나는 textStart만 싣는다', () => {
    expect(textDirective({ textStart: '빌드가 빨라졌다' })).toBe(
      `text=${encodeURIComponent('빌드가 빨라졌다')}`,
    );
  });

  test('긴 선택은 시작·끝, 모호하면 앞뒤 문맥까지 싣는다', () => {
    expect(
      textDirective({
        prefix: '앞',
        textStart: '시작',
        textEnd: '끝',
        suffix: '뒤',
      }),
    ).toBe(
      `text=${encodeURIComponent('앞')}-,${encodeURIComponent('시작')},${encodeURIComponent('끝')},-${encodeURIComponent('뒤')}`,
    );
  });

  test('문법 기호(-·,·&)는 글자로 인코딩한다', () => {
    expect(textDirective({ textStart: 'a-b, c&d' })).toBe(
      'text=a%2Db%2C%20c%26d',
    );
  });
});

describe('quoteUrl·sectionUrl', () => {
  test('글 주소에 조각을 붙인다(쿼리·기존 해시는 넣지 않는다)', () => {
    expect(quoteUrl(PAGE, { textStart: 'x' })).toBe(
      'https://blog.example.dev/posts/vitest-split/#:~:text=x',
    );
  });

  test('섹션 링크는 헤딩 id로, 헤딩이 없으면 글 주소로', () => {
    expect(sectionUrl(PAGE, '들어가며')).toBe(
      `https://blog.example.dev/posts/vitest-split/#${encodeURIComponent('들어가며')}`,
    );
    expect(sectionUrl(PAGE, null)).toBe(
      'https://blog.example.dev/posts/vitest-split/',
    );
  });
});

describe('headingBefore', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mount = (html: string) => {
    const content = document.createElement('div');
    content.innerHTML = html;
    document.body.append(content);
    return content;
  };

  test('선택이 시작된 블록 위의 가장 가까운 헤딩', () => {
    const content = mount(`
      <h2 id="why">왜</h2>
      <p>첫 문단</p>
      <h3 id="measure">측정</h3>
      <ul><li><strong id="target">목록 속 글자</strong></li></ul>
    `);
    const node = content.querySelector('#target')?.firstChild;

    expect(node && headingBefore(content, node)).toBe('measure');
  });

  test('헤딩보다 앞에 있으면 null', () => {
    const content = mount(`<p id="intro">도입</p><h2 id="why">왜</h2>`);
    const node = content.querySelector('#intro')?.firstChild;

    expect(node && headingBefore(content, node)).toBeNull();
  });
});
