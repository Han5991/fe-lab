/**
 * 서브커맨드 표의 계약 테스트.
 *
 * 표는 이름 → 동적 import → `main`으로 이어지는 문자열 배선이라 tsc가 절반밖에
 * 못 본다(모듈 경로는 보지만, 그 모듈이 `main`을 내놓는지는 호출 지점까지 가야
 * 안다). 여기서 전부 한 번 로드해 실제로 함수가 나오는지 확인한다.
 *
 * 동시에 "모듈을 import하는 것만으로는 아무 일도 안 일어난다"를 검증한다 —
 * 예전 진입 가드(`isCliEntry`)가 하던 일을 지금은 **모듈이 main만 export하는
 * 구조**가 대신한다. 이 테스트가 파일을 쓰거나 process.exit을 부르면 그 구조가
 * 깨진 것이다.
 */
import { expect, test } from 'vitest';
import { COMMANDS } from './commands.ts';

test('COMMANDS: 모든 서브커맨드가 함수 main을 내놓는다', async () => {
  for (const [name, load] of Object.entries(COMMANDS)) {
    const main = await load();
    expect(typeof main, `${name}의 main`).toBe('function');
  }
});

test('COMMANDS: 이름은 소문자·하이픈만 쓴다 (셸에서 그대로 치는 이름)', () => {
  for (const name of Object.keys(COMMANDS)) {
    expect(name, name).toMatch(/^[a-z][a-z0-9-]*$/);
  }
});
