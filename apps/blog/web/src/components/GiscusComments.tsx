'use client';

import Giscus from '@giscus/react';
import { useTheme } from '@/src/hooks/useTheme';

export default function GiscusComments() {
  const theme = useTheme();
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

  if (!repo || !repoId || !category || !categoryId) {
    return null;
  }

  return (
    <Giscus
      id="comments"
      repo={repo as `${string}/${string}`}
      repoId={repoId}
      category={category}
      categoryId={categoryId}
      mapping="pathname"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      // 사이트 테마를 따라간다 (@giscus/react는 theme prop 변경 시 iframe에
      // postMessage로 반영 → 토글 시 댓글도 함께 전환)
      theme={theme === 'dark' ? 'dark' : 'light'}
      lang="ko"
      loading="lazy"
    />
  );
}
