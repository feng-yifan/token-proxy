import { getCurrentWindow } from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';

export type AppTheme = 'light' | 'dark' | 'system';

function applySemiTheme(theme: AppTheme, systemTheme?: 'light' | 'dark'): void {
  const body = document.body;
  if (theme === 'dark') {
    body.setAttribute('theme-mode', 'dark');
  } else if (theme === 'light') {
    body.removeAttribute('theme-mode');
  } else if (theme === 'system') {
    if (systemTheme === 'dark') {
      body.setAttribute('theme-mode', 'dark');
    } else {
      body.removeAttribute('theme-mode');
    }
  }
}

export async function applyTheme(theme: AppTheme): Promise<void> {
  const currentWindow = getCurrentWindow();

  if (theme === 'light') {
    await currentWindow.setTheme('light');
    applySemiTheme('light');
  } else if (theme === 'dark') {
    await currentWindow.setTheme('dark');
    applySemiTheme('dark');
  } else if (theme === 'system') {
    await currentWindow.setTheme(null);
    const systemTheme = await currentWindow.theme();
    applySemiTheme('system', (systemTheme as 'light' | 'dark') ?? 'light');
  }
}

export async function initTheme(configAppTheme: string): Promise<UnlistenFn | undefined> {
  const theme = (configAppTheme as AppTheme) || 'system';
  await applyTheme(theme);

  if (theme === 'system') {
    const unlisten = await getCurrentWindow().onThemeChanged((event) => {
      applySemiTheme('system', event.payload as 'light' | 'dark');
    });
    return unlisten;
  }
  return undefined;
}
