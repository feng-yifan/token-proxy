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

  const dotClass = `statusbar-dot ${status?.running ? 'statusbar-dot-running' : 'statusbar-dot-stopped'}`;

  return (
    <div className="statusbar">
      <span className={dotClass} />
      <span>
        {status?.running
          ? `Proxy 运行中 - 端口 ${status.port}`
          : 'Proxy 未运行'}
      </span>
    </div>
  );
}
