'use client';

import { useEffect, useState } from 'react';
import { css } from '@design-system/ui-lib/css';
import { client } from '@/lib/client';
import type { PostData } from '@/lib/posts';
import { PostCard } from './PostCard';

interface TopPostsProps {
    posts: PostData[];
}

interface RankedPost extends PostData {
    viewCount: number;
}

export function TopPosts({ posts }: TopPostsProps) {
    const [topPosts, setTopPosts] = useState<RankedPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTopPosts() {
            try {
                const { data } = await client
                    .from('post_views')
                    .select('slug, view_count')
                    .order('view_count', { ascending: false })
                    .limit(3);

                if (!data) {
                    setTopPosts([]);
                    return;
                }

                const rankedPosts = data
                    .map(view => {
                        const post = posts.find(p => p.slug === view.slug);
                        if (!post) return null;
                        return { ...post, viewCount: view.view_count };
                    })
                    .filter((post): post is RankedPost => post !== null);

                setTopPosts(rankedPosts);
            } catch (error) {
                console.error('Failed to fetch top posts:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTopPosts();
    }, [posts]);

    if (isLoading) {
        return (
            <section className={css({ py: '20', px: '6', maxWidth: '7xl', mx: 'auto' })}>
                <div className={css({ height: '8', width: '48', bg: 'gray.200', rounded: 'md', mx: 'auto', mb: '10', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' })} />
                <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '3fr' }, gap: '8' })}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={css({ height: '64', bg: 'gray.100', rounded: '2xl', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' })} />
                    ))}
                </div>
            </section>
        );
    }

    if (topPosts.length === 0) return null;

    return (
        <section className={css({ py: '20', px: '6', maxWidth: '7xl', mx: 'auto' })}>
            <h2 className={css({ fontSize: '3xl', fontWeight: 'bold', mb: '10', textAlign: 'center' })}>
                🔥 인기 있는 실험 기록
            </h2>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', md: '3fr' },
                    gap: '8',
                })}
            >
                {topPosts.map((post, index) => (
                    <PostCard key={post.slug} post={post} rank={index + 1} />
                ))}
            </div>
        </section>
    );
}
