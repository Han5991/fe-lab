import { useEffect } from 'react';
import { incrementViewCount } from '@/domain/analytics';
import {
  buildViewCookieStr,
  getViewCookieExpiry,
  hasViewCookie,
  slugToViewKey,
} from '@/lib/viewCookie';

export const useViewCount = (slug: string | null) => {
  useEffect(() => {
    if (!slug) return;

    const viewedKey = slugToViewKey(slug);

    const hasViewed = hasViewCookie(document.cookie, viewedKey);
    if (hasViewed) return;

    // 쿠키를 RPC 호출 *전*에 set합니다.
    // 두 탭이 동시에 열릴 때 둘 다 hasViewed=false를 통과한 뒤 RPC를 2회 호출하는
    // 레이스 컨디션을 차단합니다. RPC가 실패하더라도 6시간 동안 false negative가
    // 생기지만, 중복 카운트(+N)가 무한 반복되는 것보다 안전합니다.
    document.cookie = buildViewCookieStr(viewedKey, getViewCookieExpiry());

    incrementViewCount(slug).catch(err => {
      console.error('Failed to increment view count:', err);
    });
  }, [slug]);
};
