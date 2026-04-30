import { useState, useEffect, useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { getErrorMessage } from '../utils/error';

/**
 * 通用的 API 数据获取 hook，封装 loading 状态、错误处理和 fetch 回调
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  errorPrefix = '获取数据失败',
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
    } catch (error) {
      Toast.error(`${errorPrefix}: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, setData, loading, fetchData };
}
