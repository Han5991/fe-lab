/**
 * 사이트 언어의 출처는 og:locale 형식(`언어_지역`, 예: `ko_KR`) 값 하나다. 문서마다 요구하는
 * 표기가 달라 여기서 파생한다 — og:locale은 그대로, html `lang`·JSON-LD `inLanguage`·RSS
 * `<language>`는 언어만(`ko`), `Intl`은 BCP 47(`ko-KR`).
 */
export type SiteLocale = `${string}_${string}`;

/** `ko_KR` → `ko` */
export function localeLanguage(locale: SiteLocale): string {
  return locale.slice(0, locale.indexOf('_'));
}

/** `ko_KR` → `ko-KR` */
export function localeTag(locale: SiteLocale): string {
  return locale.replace('_', '-');
}
