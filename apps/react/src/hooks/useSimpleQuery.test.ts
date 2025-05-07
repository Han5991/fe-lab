import { renderHook, waitFor } from '@testing-library/react';
import { useSimpleQuery } from './useSimpleQuery'; // 경로는 실제 파일 위치에 맞게 조정하세요

describe('useSimpleQuery', () => {
  test('성공적으로 데이터를 가져오는 경우', async () => {
    const mockData = { message: '성공' };
    const mockQueryFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useSimpleQuery({
        queryFn: mockQueryFn,
      }),
    );

    // 초기 상태 확인
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // 데이터 로딩 완료 대기
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 최종 상태 확인
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockQueryFn).toHaveBeenCalledTimes(1);
  });

  test('에러가 발생하고 throwOnError가 false인 경우', async () => {
    const mockError = new Error('테스트 에러');
    const mockQueryFn = vi.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useSimpleQuery({
        queryFn: mockQueryFn,
        throwOnError: false,
      }),
    );

    // 초기 상태 확인
    expect(result.current.isLoading).toBe(true);

    // 에러 상태 확인
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(mockError);
  });

  test('비동기 데이터 로딩 상태 변화 테스트', async () => {
    const mockData = { message: '지연된 성공' };
    const mockQueryFn = vi.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(mockData);
          }, 100);
        }),
    );

    const { result } = renderHook(() =>
      useSimpleQuery({
        queryFn: mockQueryFn,
      }),
    );

    // 초기 로딩 상태 확인
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    // 데이터 로딩 완료 대기
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 최종 상태 확인
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });
});
