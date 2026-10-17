'use client';

import Giscus from '@giscus/react';
import { useTheme } from '@/src/hooks/useTheme';

/** Giscus `repo` prop의 모양(`owner/name`). env 값은 그냥 string이라 여기서 확인해 좁힌다. */
function isRepoSlug(value: string): value is `${string}/${string}` {
  return /^[^/]+\/[^/]+$/.test(value);
}

export default function GiscusComments() {
  const theme = useTheme();
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

  if (!repo || !isRepoSlug(repo) || !repoId || !category || !categoryId) {
    return null;
  }

  return (
    <Giscus
      id="comments"
      repo={repo}
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
