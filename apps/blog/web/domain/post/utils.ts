/**
 * Next.js App Router의 <Link> 컴포넌트는 href에 '['와 ']' 문자가 포함된 경우
 * 해독되지 않은 동적 라우트 설정으로 인식하고 에러를 발생시킵니다.
 * 이 유틸리티는 slug 내부의 디렉토리 구분자('/')를 제외한 나머지 문자들을
 * 안전하게 URL 인코딩합니다.
 */
export function encodePostSlug(slug: string): string {
  return slug.split('/').map(encodeURIComponent).join('/');
}
