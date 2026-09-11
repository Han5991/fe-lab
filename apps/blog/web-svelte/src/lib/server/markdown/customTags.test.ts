import { expect, test } from 'vitest';
import { avatarInitial, HANDLED_TAGS } from './customTags.ts';
import { renderMarkdown } from './index.ts';

/**
 * 커스텀 태그 변환 계약.
 *
 * **여기가 픽스처인 이유**: 이 저장소의 원고 70편에서 실제로 쓰이는 커스텀
 * 태그는 `file-tree`(3)·`figure`(2)·`diagram` 계열뿐이고, `callout`·`dialogue`·
 * `metrics`·`timeline`은 **한 번도 쓰이지 않았다**. 실제 글로는 검증할 수
 * 없으므로 픽스처로 계약을 잠근다 — 나중에 누가 처음 쓰는 날, 그때 처음
 * 깨지는 것이 아니라 여기서 먼저 깨져야 한다.
 *
 * 클래스 이름은 Panda가 생성하므로 단언하지 않는다. **구조와 판정**만 본다 —
 * 어떤 태그가 되는가, 알 수 없는 값이 기본값으로 떨어지는가, 자식이 살아남는가.
 */

const render = (md: string) => renderMarkdown(md, 'series/post');

test('아는 태그 목록이 곧 계약이다', () => {
  // 태그를 더하거나 빼면 여기가 먼저 알려 준다. diagram-node·diagram-edge가
  // 없는 것은 <diagram>이 자식을 자기가 읽기 때문이고(좌표는 형제를 전부 알아야
  // 정해진다), code-tabs는 상호작용이 필요해 아직 이 계층에 없다.
  expect([...HANDLED_TAGS].sort()).toStrictEqual([
    'callout',
    'diagram',
    'dialogue',
    'figure',
    'file-tree',
    'metric',
    'metrics',
    'msg',
    'step',
    'timeline',
  ]);
});

test('callout: type이 aside가 되고 title이 없으면 타입 이름이 들어간다', () => {
  const html = render('<callout type="warning">조심.</callout>');
  expect(html).toContain('<aside');
  expect(html).toContain('warning');
  expect(html).toContain('조심.');
});

test('callout: 모르는 type은 throw하지 않고 info로 떨어진다', () => {
  // 글 하나의 오타로 페이지가 죽는 편이 훨씬 나쁘다 — blog-components 스킬의 계약.
  const html = render('<callout type="보라" title="제목">본문.</callout>');
  expect(html).toContain('<aside');
  expect(html).toContain('제목');
  expect(html).toContain('본문.');
});

test('callout: 본문 마크다운이 그대로 살아 있다', () => {
  const html = render('<callout>\n\n**굵게**\n\n</callout>');
  expect(html).toContain('<strong>굵게</strong>');
});

test('file-tree: 본문이 커넥터가 붙은 pre로 바뀐다', () => {
  const html = render('<file-tree>\napps/\n  web/\n</file-tree>');
  expect(html).toContain('<pre');
  expect(html).toContain('apps/');
  expect(html).toContain('└─ web/');
});

test('figure: figure 태그와 캡션이 유지된다', () => {
  const html = render(
    '<figure><img src="./shot.png" alt="로그" /><figcaption>캡션</figcaption></figure>',
  );
  expect(html).toContain('<figure');
  expect(html).toContain('<figcaption');
  expect(html).toContain('캡션');
  // 상대 경로는 자산 URL 규칙으로 풀린다 — 같은 파이프라인의 다른 단계지만
  // figure 안에서도 동작해야 한다.
  expect(html).toContain('/posts/series/post/shot.png');
});

test('dialogue: from="me"와 그 외가 다른 화자로 표시된다', () => {
  const html = render(
    '<dialogue>\n<msg from="PM">언제 배포해요?</msg>\n<msg from="me">점심에요.</msg>\n</dialogue>',
  );
  expect(html).toContain('data-speaker="other"');
  expect(html).toContain('data-speaker="me"');
  expect(html).toContain('언제 배포해요?');
  expect(html).toContain('점심에요.');
});

test('avatarInitial: 짧은 라틴 약어는 통째로, 사람 이름은 첫 글자만', () => {
  expect(avatarInitial('PM')).toBe('PM');
  expect(avatarInitial('QA')).toBe('QA');
  expect(avatarInitial('한상욱')).toBe('한');
  expect(avatarInitial('  PM  ')).toBe('PM');
  expect(avatarInitial(undefined)).toBe('?');
  expect(avatarInitial('   ')).toBe('?');
});

test('avatarInitial: 나 자신은 첫 글자가 아니라 "나"다', () => {
  // 이 분기를 빠뜨려 `from="me"`가 `m`으로 나왔다. 판정 순서도 계약이다 —
  // `I`는 라틴 대문자 한 글자지만 약어가 아니라 나 자신이다.
  expect(avatarInitial('me')).toBe('나');
  expect(avatarInitial('I')).toBe('나');
  expect(avatarInitial('나')).toBe('나');
  expect(avatarInitial('저')).toBe('나');
});

test('avatarInitial: 이모지가 반 토막 나지 않는다', () => {
  expect(avatarInitial('🐼 팀')).toBe('🐼');
});

test('metrics: items JSON으로 카드를 만든다', () => {
  const html = render(
    `<metrics items='[{"label":"배포","value":"22분 → 8분"},{"label":"롤백","value":"자동","tone":"success"}]'></metrics>`,
  );
  expect(html).toContain('배포');
  expect(html).toContain('22분 → 8분');
  expect(html).toContain('자동');
});

test('metrics: JSON이 깨지면 children 렌더로 폴백한다', () => {
  // 실패가 throw면 글 전체가 죽는다. 폴백이라 카드가 children에서 나온다.
  const html = render(
    `<metrics items='[{"label":'><metric label="라벨" value="값"></metric></metrics>`,
  );
  expect(html).toContain('라벨');
  expect(html).toContain('값');
});

test('timeline: steps JSON과 children 양쪽을 받는다', () => {
  const fromJson = render(
    `<timeline steps='[{"title":"시도 1","desc":"실패","result":"fail"}]'></timeline>`,
  );
  expect(fromJson).toContain('시도 1');
  expect(fromJson).toContain('실패');

  const fromChildren = render(
    '<timeline>\n<step title="시도 2" desc="성공" result="success"></step>\n</timeline>',
  );
  expect(fromChildren).toContain('시도 2');
  expect(fromChildren).toContain('성공');
});

test('timeline: 모르는 result는 fail로 떨어진다', () => {
  const html = render(
    '<timeline>\n<step title="t" result="아마도"></step>\n</timeline>',
  );
  expect(html).toContain('<li');
  expect(html).toContain('t');
});

test('아직 다루지 않는 태그는 지우지 않고 그대로 통과시킨다', () => {
  // code-tabs는 다음 단계다. 통과시키면 탭 상자 없이 코드 블록이 차례로
  // 나오고, 지우면 글의 일부가 조용히 사라진다 — 후자가 훨씬 나쁘다.
  const html = render(
    '<code-tabs>\n\n```bash tab="npm"\nnpm i\n```\n\n</code-tabs>',
  );
  expect(html).toContain('<code-tabs>');
  // 안쪽 코드 블록은 정상으로 렌더된다(내용이 토큰으로 쪼개지므로 조각으로 본다).
  expect(html).toContain('npm');
  expect(html).toContain('language-bash');
});
