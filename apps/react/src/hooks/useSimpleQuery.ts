"use client";

import { useEffect, useState } from "react";

interface QueryOptions<T> {
  queryFn: () => Promise<T>;
  throwOnError?: boolean;
}

export const useSimpleQuery = <T>({
  queryFn,
  throwOnError = false,
}: QueryOptions<T>) => {
  const [state, setState] = useState<{
    data: T | null;
    error: Error | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await queryFn();
        setState({ data, error: null, isLoading: false });
      } catch (error) {
        if (error instanceof Error) {
          setState({ data: null, error, isLoading: false });
        }
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.error && throwOnError) {
    throw state.error;
  }

  return state;
};
