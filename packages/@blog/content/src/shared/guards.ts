/**
 * 바깥에서 들어온 값을 좁히는 가드 — JSON·localStorage·설정 파일·fetch 응답처럼
 * 타입이 붙어 있지 않은 입력의 첫 관문.
 *
 * 패키지와 앱이 함께 쓴다. `dates.ts`·`url.ts`처럼 콘텐츠에 매이지 않은 순수
 * 유틸이라 `shared`가 자리다 — 아래 레이어 전부가 볼 수 있고 배럴로 앱까지
 * 나간다.
 */

/**
 * "null 아닌 객체"까지만 좁힌다 — 값은 전부 `unknown`으로 남는다.
 *
 * **`as Partial<T>`로 내려다보지 않기 위한 것이다.** 그 단언은 사실보다 크게
 * 주장한다: 아직 아무것도 확인하지 않은 값에 이미 계약의 필드 이름과 타입이
 * 붙어, `title`이 `string | undefined`라고 컴파일러가 믿어 버린다. 그걸 못 믿는
 * 것이 검사 함수가 존재하는 이유이므로, 검사 도중에 검사 대상의 모양을
 * 가정하면 앞뒤가 맞지 않는다. 이쪽은 "문자열 키로 읽을 수 있고 값은 모른다"만
 * 말하므로 런타임 검사와 어긋날 여지가 없다.
 *
 * 읽기가 `value['title']`처럼 대괄호가 되는 것은
 * `noPropertyAccessFromIndexSignature` 때문인데, **아직 검증되지 않은 입력**
 * 이라는 표시로 읽으면 된다 — 확인이 끝나 계약 타입이 붙은 뒤에는 점으로 읽는다.
 *
 * **배열은 거부한다.** `typeof [] === 'object'`라 그냥 두면 통과하는데, 이 가드가
 * 지키는 자리는 전부 "키-값 맵"을 기대한다. 특히 매니페스트 읽기
 * (`generate-og-images`·`generate-thumbnails`)에서 `JSON.parse('[]')`가 통과하면
 * `Object.entries`가 인덱스를 키로 내놓아 조용히 이상한 맵이 된다.
 *
 * 이 한 줄이 이 파일이 생긴 이유이기도 하다. 같은 이름의 가드가 일곱 군데에
 * 따로 있었고, 그중 렌더 스크립트 둘만 `!Array.isArray`를 달고 있었다 —
 * 같은 이름이 자리마다 다르게 판정하고 있었던 것이다. 엄격한 쪽으로 모은다:
 * 나머지 자리는 가드 뒤에 곧바로 필드를 확인하므로 배열이 통과하든 말든
 * 결과가 같고(거부 시점만 당겨진다), 매니페스트 쪽은 이게 있어야 맞다.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
