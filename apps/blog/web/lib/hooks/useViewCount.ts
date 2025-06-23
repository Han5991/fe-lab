import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getViewCount, incrementViewCount } from '../analytics';

// 조회수 조회 훅
export function useViewCount(slug: string) {
  return useQuery({
    queryKey: ['viewCount', slug],
    queryFn: () => getViewCount(slug),
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });
}

// 조회수 증가 훅
export function useIncrementViewCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => incrementViewCount(slug),
    onSuccess: (newViewCount, slug) => {
      // 캐시 업데이트: 조회수 증가 후 즉시 UI 반영
      queryClient.setQueryData(['viewCount', slug], newViewCount);
    },
  });
}

// 포스트 페이지에서 사용할 통합 훅
export function usePostViewCount(slug: string) {
  const viewCountQuery = useViewCount(slug);
  const incrementMutation = useIncrementViewCount();

  // 조회수 증가 실행 (한 번만)
  const incrementOnce = (): void => {
    if (incrementMutation.isPending || incrementMutation.isSuccess) {
      return;
    }

    incrementMutation.mutate(slug);
  };

  return {
    // 현재 조회수
    viewCount: viewCountQuery.data || 0,
    // 로딩 상태
    isLoading: viewCountQuery.isLoading,
    // 에러 상태
    error: viewCountQuery.error || incrementMutation.error,
    // 조회수 증가 함수
    incrementOnce,
    // 증가 상태
    isIncrementing: incrementMutation.isPending,
  };
}
