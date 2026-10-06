declare module 'react-query' {
  interface UseQueryResult<T = unknown> {
    data: T | undefined;
    isFetching: boolean;
    [key: string]: unknown;
  }

  export function useQuery<T = unknown>(
    queryKey: unknown,
    queryFn: (...args: unknown[]) => unknown,
    config?: Record<string, unknown>,
  ): UseQueryResult<T>;
}
