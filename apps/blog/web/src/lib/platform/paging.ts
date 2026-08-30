/**
 * PostgREST의 행 cap을 넘는 결과를 페이지로 나눠 모으는 루프.
 *
 * **Edge Function(Deno, `supabase/functions/admin-analytics/index.ts`)이 이 파일을
 * import 한다.** 그래서 `adminActions.ts`와 같은 제약을 진다 — **이 파일에는
 * import를 두지 않는다.** Deno는 확장자 없는 상대 import를 해석하지 못하고, Edge
 * 번들러는 entrypoint의 import 그래프를 따라 `supabase/functions` 밖의 파일을
 * 그대로 집어 가므로, 여기서 다른 앱 모듈을 끌어오면 그 파일도 같은 제약을 받는다.
 *
 * 루프가 Edge Function 안에 인라인으로 있으면 CI가 볼 수 없다 — `supabase/functions`
 * 아래에는 테스트 하네스가 없다. 순수 함수로 떼어 두면 `paging.test.ts`가 종료 조건과
 * 상한을 잠근다.
 */

/**
 * `fetchPage`를 페이지 단위로 반복 호출해 모든 행을 모은다.
 *
 * 종료는 **짧은 페이지**로 판정한다. 마지막 페이지가 정확히 `pageSize`로 떨어지면
 * 빈 페이지를 한 번 더 받고 끝난다 — 요청 하나가 더 나가지만, 그 대신 "행이 딱
 * 맞아떨어졌을 때 뒤가 잘리는" 경우가 없다. 총 개수를 미리 물어보지 않는 한 이
 * 왕복은 피할 수 없고, 그 조회 역시 왕복이다.
 *
 * @param fetchPage `[from, to]` 구간(inclusive, 0-base)의 행을 돌려준다. 실패는
 *   throw로 알린다 — 던진 값은 그대로 호출자에게 전파된다.
 * @param options.pageSize 한 페이지의 행 수. 서버의 cap과 같아야 한다. 이보다 작으면
 *   매 페이지가 짧은 페이지로 보여 첫 장에서 멈춘다.
 * @param options.maxPages 폭주 방지 상한. 넘으면 **자르지 않고 throw** 한다 — 잘린
 *   결과는 소비처에서 "데이터가 줄어든 것"과 구분되지 않는다.
 */
export async function collectPagedRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  options: { pageSize: number; maxPages: number },
): Promise<T[]> {
  const { pageSize, maxPages } = options;
  const rows: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const chunk = await fetchPage(from, from + pageSize - 1);
    // push(...chunk) 를 쓰지 않는 건 스프레드가 행 수만큼 인자를 쌓기 때문이다.
    for (const row of chunk) rows.push(row);
    if (chunk.length < pageSize) return rows;
  }

  throw new Error(
    `페이지 상한(${maxPages}페이지 · ${maxPages * pageSize}행)을 넘었습니다.`,
  );
}
