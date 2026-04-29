import { useState, useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const checkMaximized = useCallback(async () => {
    try {
      const maximized = await getCurrentWindow().isMaximized();
      setIsMaximized(maximized);
    } catch {
      // 在某些平台 isMaximized 可能不可用，忽略错误
    }
  }, []);

  useEffect(() => {
    checkMaximized();
    let unlisten: (() => void) | undefined;
    getCurrentWindow().onResized(() => {
      checkMaximized();
    }).then(fn => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [checkMaximized]);

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleToggleMaximize = () => {
    getCurrentWindow().toggleMaximize();
  };

  const handleClose = () => {
    // 关闭到托盘，与 Rust 端 CloseRequested 行为一致
    getCurrentWindow().hide();
  };

  return (
    <div className="titlebar">
      <span className="titlebar-title">Token Proxy</span>

      <div className="titlebar-drag-region" data-tauri-drag-region />

      <div className="titlebar-controls">
        <button
          className="titlebar-button"
          onClick={handleMinimize}
          title="最小化"
          aria-label="最小化"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        <button
          className="titlebar-button"
          onClick={handleToggleMaximize}
          title={isMaximized ? '还原' : '最大化'}
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2.5" y="0.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="0.5" y="2.5" width="8" height="8" rx="1" fill="var(--semi-color-bg-1)" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>

        <button
          className="titlebar-button close-button"
          onClick={handleClose}
          title="关闭到托盘"
          aria-label="关闭到托盘"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
