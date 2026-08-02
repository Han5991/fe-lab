/**
 * 대표 글 카드의 시리즈 배지 문구를 만듭니다.
 *
 * 레퍼런스 표기는 `시리즈 · gemini-cli 기여기 2/4` — 시리즈 안에서 몇 번째
 * 글인지가 배지의 핵심 정보입니다. 순서 계산에 필요한 fs 접근(`_series.yml`)은
 * 호출부(서버 컴포넌트)가 하고, 여기서는 순수 계산만 합니다.
 *
 * 목록에서 slug를 못 찾으면(비공개 글이 섞여 순서가 깨진 경우 등) 위치 표기를
 * 빼고 시리즈명만 돌려줍니다 — 틀린 번호를 보여주는 것보다 낫습니다.
 */
export function seriesBadgeLabel(
  seriesTitle: string,
  orderedSlugs: readonly string[],
  slug: string,
): string {
  const index = orderedSlugs.indexOf(slug);
  if (index === -1) return `시리즈 · ${seriesTitle}`;
  return `시리즈 · ${seriesTitle} ${index + 1}/${orderedSlugs.length}`;
}
