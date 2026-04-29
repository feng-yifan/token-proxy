import { useState, useEffect } from 'react';
import { getProxyStatus } from '../services';
import type { ProxyStatus } from '../types';

export default function StatusBar() {
  const [status, setStatus] = useState<ProxyStatus | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const fetchStatus = async () => {
      try {
        const result = await getProxyStatus();
        setStatus(result);
      } catch {
        // 静默处理轮询错误
      }
    };

    fetchStatus();
    timer = setInterval(fetchStatus, 5000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        background: 'rgba(0, 0, 0, 0.06)',
        borderTop: '1px solid var(--semi-color-border)',
        fontSize: 12,
        color: 'var(--semi-color-text-2)',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: status?.running ? '#00b365' : '#fa2c2c',
          display: 'inline-block',
        }}
      />
      <span>
        {status?.running
          ? `Proxy 运行中 - 端口 ${status.port}`
          : 'Proxy 未运行'}
      </span>
    </div>
  );
}
