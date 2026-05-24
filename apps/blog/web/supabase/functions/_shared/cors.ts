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
};
