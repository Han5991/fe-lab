import { useEffect } from 'react';
import { client } from '../client';

const VIEW_COOLDOWN_HOURS = 6;

export const useViewCount = (slug: string) => {
  useEffect(() => {
    if (!slug) return;

    const viewedKey = `viewed_${slug}`;

    // Check if the cookie exists
    const hasViewed = document.cookie
      .split('; ')
      .some(row => row.startsWith(`${viewedKey}=`));

    if (hasViewed) return;

    const incrementView = async () => {
      try {
        const { error } = await client.rpc('increment_view_count', {
          slug_input: slug,
        });

        if (error) {
          console.error('Failed to increment view count:', error);
          return;
        }

        // Set cookie with 6-hour expiration
        const date = new Date();
        date.setTime(date.getTime() + VIEW_COOLDOWN_HOURS * 60 * 60 * 1000);
        document.cookie = `${viewedKey}=true; expires=${date.toUTCString()}; path=/`;
      } catch (err) {
        console.error('Error in useViewCount:', err);
      }
    };

    incrementView();
  }, [slug]);
};
