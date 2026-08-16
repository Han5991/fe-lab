/**
 * Post domain 공개 API
 *
 * 외부에서는 이 파일을 통해 접근합니다.
 */
export * from './types';
export * from './visibility';
export * from './thumbnail';
export * from './service';
export * from './series';
export * from './utils';
export * from './urls';
export * from './aggregate';
// repository는 인프라(파일시스템)라 통째로 열지 않고, 순수 계산 두 개만 공개합니다.
// - resolveExcerpt: excerpt 폴백 규칙. 렌더(postSeo)와 검증(lint:posts)이 같은 값을
//   계산해야 해서 도메인 공개 API로 둡니다.
// - sortByDateDesc: 목록 정렬. 색인(llms.txt)이 사이트와 같은 순서를 말하도록.
// - toDateString: YAML이 Date 객체로 준 날짜를 'YYYY-MM-DD'로 정규화. 원문을 읽는
//   쪽(lint:posts)이 isPostVisible에 넘기기 전에 같은 정규화를 거쳐야 한다.
export { resolveExcerpt, sortByDateDesc, toDateString } from './repository';
