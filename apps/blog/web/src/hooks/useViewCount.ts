import { useEffect } from 'react';
import { incrementViewCount } from '@/domain/analytics/repository';

const VIEW_COOLDOWN_HOURS = 6;

export const useViewCount = (slug: string | null) => {
  useEffect(() => {
    if (!slug) return;

    const viewedKey = `viewed_${slug.replace(/[^a-zA-Z0-9-]/g, '_')}`;

    const hasViewed = document.cookie
      .split('; ')
      .some(row => row.startsWith(`${viewedKey}=`));

    if (hasViewed) return;

    incrementViewCount(slug)
      .then(() => {
        const date = new Date();
        date.setTime(date.getTime() + VIEW_COOLDOWN_HOURS * 60 * 60 * 1000);
        document.cookie = `${viewedKey}=true; expires=${date.toUTCString()}; path=/`;
      })
      .catch(err => {
        console.error('Failed to increment view count:', err);
      });
  }, [slug]);
};
