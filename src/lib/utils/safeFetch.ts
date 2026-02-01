/**
 * Safe Fetch Utilities
 * Fetch 호출에 대한 안전한 에러 처리 유틸리티
 */

export interface FetchResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * 안전한 fetch 호출 - 에러 처리 포함
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<FetchResult<T>> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * API 응답을 안전하게 파싱
 */
export function parseApiResponse<T>(
  response: Response
): Promise<{ success: boolean; data?: T; error?: string }> {
  return response
    .json()
    .then((data) => ({
      success: data.success ?? false,
      data: data.data as T | undefined,
      error: data.error as string | undefined,
    }))
    .catch((err) => ({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse response',
    }));
}

/**
 * 여러 fetch를 안전하게 병렬 실행
 */
export async function safeParallelFetch<T extends readonly unknown[]>(
  fetchers: readonly (() => Promise<Response>)[]
): Promise<{ results: FetchResult[]; hasError: boolean }> {
  const responses = await Promise.allSettled(fetchers.map((f) => f()));

  const results: FetchResult[] = await Promise.all(
    responses.map(async (result) => {
      if (result.status === 'rejected') {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Fetch failed',
        };
      }

      const response = result.value;
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        };
      }

      try {
        const data = await response.json();
        return {
          success: true,
          data,
          status: response.status,
        };
      } catch {
        return {
          success: false,
          error: 'Failed to parse response',
        };
      }
    })
  );

  return {
    results,
    hasError: results.some((r) => !r.success),
  };
}

/**
 * Null 안전한 데이터 접근
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | undefined {
  return obj?.[key];
}

/**
 * 배열 안전 접근
 */
export function safeArrayGet<T>(
  arr: T[] | null | undefined,
  index: number
): T | undefined {
  if (!arr || index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
}

export default safeFetch;
