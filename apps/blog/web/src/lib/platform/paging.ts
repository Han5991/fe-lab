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
 * `fetchPage`를 페이지 단위로 반복 호출해 모든 행을 모은다. 종료는 짧은 페이지로
 * 판정한다(딱 떨어지면 빈 페이지를 한 번 더 받는다 — 뒤가 잘리지 않게).
 *
 * @param fetchPage `[from, to]`(inclusive, 0-base)의 행. 던진 값은 그대로 전파된다.
 * @param options.pageSize 서버의 cap과 같아야 한다(작으면 첫 장에서 멈춘다).
 * @param options.maxPages 넘으면 자르지 않고 던진다 — 잘린 결과는 "줄어든 데이터"와 구분이 안 된다.
 * @param options.key 주면 같은 키는 나중 행으로 덮는다 — 살아 있는 표를 offset으로 자르면
 *   경계 행이 다음 페이지에 또 온다.
 */
export async function collectPagedRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  options: {
    pageSize: number;
    maxPages: number;
    key?: (row: T) => string;
  },
): Promise<T[]> {
  const { pageSize, maxPages, key } = options;
  const rows: T[] = [];
  const indexByKey = new Map<string, number>();

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const chunk = await fetchPage(from, from + pageSize - 1);
    // push(...chunk) 를 쓰지 않는 건 스프레드가 행 수만큼 인자를 쌓기 때문이다.
    for (const row of chunk) {
      if (key) {
        const k = key(row);
        const at = indexByKey.get(k);
        if (at !== undefined) {
          rows[at] = row;
          continue;
        }
        indexByKey.set(k, rows.length);
      }
      rows.push(row);
    }
    if (chunk.length < pageSize) return rows;
  }

  throw new Error(
    `페이지 상한(${maxPages}페이지 · ${maxPages * pageSize}행)을 넘었습니다.`,
  );
}
