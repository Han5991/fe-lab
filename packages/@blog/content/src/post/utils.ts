/**
 * Next.js App Router의 <Link> 컴포넌트는 href에 '['와 ']' 문자가 포함된 경우
 * 해독되지 않은 동적 라우트 설정으로 인식하고 에러를 발생시킵니다.
 * 이 유틸리티는 slug 내부의 디렉토리 구분자('/')를 제외한 나머지 문자들을
 * 안전하게 URL 인코딩합니다.
 *
 * **글 상세 라우트를 만들 때는 이걸 직접 부르지 마세요** — `./urls`의
 * postPath/postUrl을 쓰면 라우트 모양과 후행 슬래시까지 한 곳에서 옵니다.
 * 이 함수는 라우트가 아닌 경로(썸네일 `/thumbs/*`, OG 카드 `/og/*.png`,
 * 포스트 에셋 `/posts/<relativeDir>/…`)의 세그먼트 인코딩에도 쓰이므로
 * 계속 공개합니다.
 */
export function encodePostSlug(slug: string): string {
  return slug.split('/').map(encodeURIComponent).join('/');
}
