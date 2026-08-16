/**
 * CodeBlock이 렌더 밖에서 지고 있는 두 약속을 못박는 테스트.
 *
 *   1. registerOnce — js-extras·jsdoc이 두 번 적용되지 않게 막는 가드.
 *      깨져도 화면에는 "색이 좀 다른 코드 블록"으로만 보이고, 실제 증상은
 *      SSR/CSR 토큰 불일치로 인한 하이드레이션 재렌더라 렌더 테스트로는
 *      잡히지 않는다. 함수 단위로 계약을 고정하는 편이 싸고 확실하다.
 *   2. mermaid 로딩 placeholder와 실제 도표 컨테이너의 박스 일치 —
 *      한쪽만 바뀌면 청크가 도착하는 순간 본문이 밀린다.
 */
import { describe, expect, test, vi } from 'vitest';
import { registerOnce, mermaidBoxStyle } from './CodeBlock';
import { mermaidContainerStyle } from './MermaidChart';

// MermaidChart는 mermaid(raw 1.1MB)를 정적 import한다. 여기서 필요한 건 컨테이너
// 스타일 상수뿐이라 실제 패키지는 로드하지 않는다.
vi.mock('mermaid', () => ({ default: {} }));

/** refractor 인스턴스 중 registerOnce가 건드리는 부분만. */
interface FakeRefractor {
  languages: Record<string, unknown>;
}
type FakeGrammar = ((refractor: FakeRefractor) => void) & {
  displayName: string;
};

const emptyRefractor = (): FakeRefractor => ({ languages: {} });

/**
 * refractor `register()`의 중복 등록 가드를 그대로 옮긴 것.
 * registerOnce는 이 가드가 걸리게 만드는 게 존재 이유라, 가드까지 재현해야
 * 계약이 검증된다.
 */
function register(refractor: FakeRefractor, syntax: FakeGrammar) {
  if (!Object.hasOwn(refractor.languages, syntax.displayName))
    syntax(refractor);
}

describe('registerOnce', () => {
  test('감싼 함수의 displayName이 넘긴 이름과 같다', () => {
    // refractor의 가드가 조회하는 키가 바로 이 값이다. 원본 모듈의
    // displayName('js-extras' 등)을 잃으면 가드가 엉뚱한 키를 본다.
    const noopGrammar = () => {
      // displayName 전파만 보므로 패치 내용은 필요 없다
    };
    expect(registerOnce(noopGrammar, 'js-extras').displayName).toBe(
      'js-extras',
    );
  });

  test('첫 호출에서 원본 패치가 그대로 실행된다', () => {
    const patch = vi.fn();
    const refractor = emptyRefractor();

    registerOnce(patch, 'jsdoc')(refractor);

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith(refractor);
  });

  test('첫 호출 뒤 refractor.languages에 자기 이름 키가 생긴다', () => {
    // 이 키가 이 함수의 전부다. js-extras·jsdoc은 javascript 문법에
    // insertBefore로 끼워 넣기만 해서 자기 이름 키를 남기지 않고,
    // 그래서 키를 대신 심어주지 않으면 refractor 가드가 영영 안 걸린다.
    const refractor = emptyRefractor();

    registerOnce(() => {
      // 자기 이름 키를 남기지 않는 js-extras류 패치를 흉내 낸다
    }, 'js-extras')(refractor);

    expect(Object.hasOwn(refractor.languages, 'js-extras')).toBe(true);
  });

  test('패치가 이미 만들어 둔 키는 덮어쓰지 않는다', () => {
    // `??=`라서, 나중에 js-extras가 진짜 언어 키를 만들도록 바뀌어도
    // 우리가 빈 객체로 문법을 지워버리지 않는다.
    const grammar = { comment: /\/\/.*/ };
    const refractor = emptyRefractor();

    registerOnce((r: FakeRefractor) => {
      r.languages.jsdoc = grammar;
    }, 'jsdoc')(refractor);

    expect(refractor.languages.jsdoc).toBe(grammar);
  });

  test('감싸면 refractor 가드에 걸려 두 번째 등록이 건너뛰어진다', () => {
    const patch = vi.fn();
    const wrapped = registerOnce(patch, 'js-extras');
    const refractor = emptyRefractor();

    register(refractor, wrapped);
    register(refractor, wrapped);

    expect(patch).toHaveBeenCalledTimes(1);
  });

  test('(대조) 감싸지 않으면 같은 패치가 두 번 적용된다', () => {
    // registerOnce가 왜 필요한지를 고정하는 대조군. 이쪽이 1이 되면
    // refractor가 동작을 바꾼 것이니 registerOnce도 다시 볼 때다.
    const bare = Object.assign(vi.fn(), { displayName: 'js-extras' });
    const refractor = emptyRefractor();

    register(refractor, bare);
    register(refractor, bare);

    expect(bare).toHaveBeenCalledTimes(2);
  });
});

// Panda의 아토믹 클래스명은 속성과 값을 그대로 인코딩한다(`p_6`,
// `bd-c_ink.border`). 그래서 클래스 문자열만 비교해도 두 박스가 같은 값을
// 쓰는지 확인할 수 있다. `hover:`가 붙은 조건부 클래스는 접두사가 달라 자연히 빠진다.
const BOX_PREFIXES = ['my_', 'p_', 'bg_', 'bdr_', 'bd-w_', 'bd-c_'];

const boxClasses = (className: string) =>
  className
    .split(' ')
    .filter(cls => BOX_PREFIXES.some(prefix => cls.startsWith(prefix)))
    .sort();

describe('mermaid placeholder 박스', () => {
  test('실제 도표 컨테이너와 여백·배경·보더가 같다', () => {
    // 어긋나면 mermaid 청크가 도착하는 순간 아래 본문이 밀린다(CLS).
    expect(boxClasses(mermaidBoxStyle)).toEqual(
      boxClasses(mermaidContainerStyle),
    );
  });

  test('placeholder만 최소 높이를 잡는다', () => {
    // 유일하게 의도된 차이. 도표가 없는 동안 높이가 0이면 자리를 못 잡는다.
    expect(mermaidBoxStyle).toContain('min-h_');
    expect(mermaidContainerStyle).not.toContain('min-h_');
  });
});
