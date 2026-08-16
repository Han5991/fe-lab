/**
 * 퍼센트 인코딩을 풀되, 잘못된 시퀀스(`./100%.png`의 `%.`처럼)에는 원문을 씁니다.
 *
 * 맨 `decodeURIComponent`는 `URIError`를 던집니다. 검사 스크립트에서 그러면
 * 위반 하나를 보고해야 할 자리에서 **도구 전체가 스택 트레이스만 남기고 멈춥니다.**
 *
 * `lint:posts`(원문)와 `check-seo`(산출물)가 **같은 함수**를 씁니다. 각자 복사해
 * 두면 한쪽만 고쳐졌을 때 두 검사의 판정이 갈리는데, 그 둘이 같은 판정을 내리는
 * 것이 이 검사 체계의 전제입니다.
 */
export function decodeUrlSafe(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}
