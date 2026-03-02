/**
 * slug 문자열을 안전하게 URL 인코딩합니다.
 * '/' 문자는 그대로 유지합니다.
 */
export function toEncodedSlug(rawSlug: string): string {
  return rawSlug
    .split('/')
    .map((part: string) => encodeURIComponent(part))
    .join('/');
}
