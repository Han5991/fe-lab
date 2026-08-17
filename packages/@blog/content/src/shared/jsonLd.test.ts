import assert from 'node:assert/strict';
import { test } from 'node:test';

import { safeJsonLd } from './jsonLd';

test('safeJsonLd: 일반 객체는 JSON.stringify와 동일한 직렬화', () => {
  const data = { '@type': 'Person', name: 'Sangwook' };
  assert.equal(safeJsonLd(data), '{"@type":"Person","name":"Sangwook"}');
});

test('safeJsonLd: </script> 의 < 를 \\u003c 로 바꿔 태그 조기 종료를 막는다', () => {
  const out = safeJsonLd({ bio: 'x</script><script>alert(1)</script>' });
  assert.ok(
    !out.includes('</script>'),
    '원시 </script> 시퀀스가 남으면 안 된다',
  );
  assert.ok(out.includes('\\u003c/script'), '< 가 \\u003c 로 치환돼야 한다');
});

test('safeJsonLd: <!-- (HTML 주석 시작)도 무력화', () => {
  const out = safeJsonLd({ note: '<!-- hi' });
  assert.ok(!out.includes('<!--'));
  assert.ok(out.includes('\\u003c!--'));
});

test('safeJsonLd: 이스케이프해도 다시 파싱하면 원래 값과 같다(의미 보존)', () => {
  const data = { x: 'a < b </script>', nested: { y: ['<', '<!'] } };
  assert.deepEqual(JSON.parse(safeJsonLd(data)), data);
});

test('safeJsonLd: < 가 없으면 JSON.stringify 결과와 완전히 동일', () => {
  const data = { a: 1, b: ['x', 'y'], c: { d: true } };
  assert.equal(safeJsonLd(data), JSON.stringify(data));
});
