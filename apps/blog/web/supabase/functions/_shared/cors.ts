/**
 * Edge Function CORS 공통 헤더
 *
 * 모든 admin Edge Function에서 공유합니다.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // preflight 결과를 2시간 캐시한다. 없으면 브라우저 기본값 5초라, admin 화면이 5초 넘게 머문 뒤
  // 부르는 호출마다 OPTIONS 왕복(프로덕션 콜드 isolate 165~222ms)이 다시 붙었다. 7200은 Chromium의
  // 상한이다(넘겨도 잘린다). 캐시 키가 출처·URL이고 action은 본문이라 함수 하나에 preflight 한 번이다.
  // 허용 헤더를 바꿔도 막히지 않는다 — 캐시에 없는 헤더를 보내는 요청은 브라우저가 preflight를 다시 한다.
  'Access-Control-Max-Age': '7200',
};
