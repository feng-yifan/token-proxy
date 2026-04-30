import { useState, useEffect } from 'react';
import { Card, InputNumber, Button, Toast, Spin, RadioGroup, Radio } from '@douyinfe/semi-ui';
import {
  getConfig,
  updateProxyPort,
  updateLogSettings,
  updateAppTheme,
} from '../services';
import { useApiData } from '../hooks/useApiData';
import { getErrorMessage } from '../utils/error';
import { applyTheme } from '../utils/theme';
import type { AppTheme } from '../utils/theme';
import type { AppConfig } from '../types';

export default function SettingsPage() {
  const { data: config, loading } = useApiData<AppConfig>(
    getConfig,
    [],
    '获取配置失败',
  );

  const [proxyPort, setProxyPort] = useState(9876);
  const [appTheme, setAppTheme] = useState<string>('system');
  const [maxLogEntries, setMaxLogEntries] = useState(10000);
  const [retentionDays, setRetentionDays] = useState(30);

  const [portSaving, setPortSaving] = useState(false);
  const [logSaving, setLogSaving] = useState(false);

  // 配置加载完成后同步到本地 state
  useEffect(() => {
    if (config) {
      setProxyPort(config.proxy_port);
      setAppTheme(config.app_theme);
      setMaxLogEntries(config.log_settings.max_log_entries);
      setRetentionDays(config.log_settings.retention_days);
    }
  }, [config]);

  const handleSavePort = async () => {
    setPortSaving(true);
    try {
      await updateProxyPort(proxyPort);
      Toast.success('代理端口已更新');
    } catch (error) {
      Toast.error(`保存失败: ${getErrorMessage(error)}`);
    } finally {
      setPortSaving(false);
    }
  };

  const handleThemeChange = async (theme: string) => {
    setAppTheme(theme);
    try {
      await updateAppTheme(theme);
      await applyTheme(theme as AppTheme);
      Toast.success('主题已切换');
    } catch (error) {
      Toast.error(`切换失败: ${getErrorMessage(error)}`);
      if (config) setAppTheme(config.app_theme);
    }
  };

  const handleSaveLogSettings = async () => {
    setLogSaving(true);
    try {
      await updateLogSettings(maxLogEntries, retentionDays);
      Toast.success('日志设置已更新');
    } catch (error) {
      Toast.error(`保存失败: ${getErrorMessage(error)}`);
    } finally {
      setLogSaving(false);
    }
  };

  if (loading && !config) {
    return <Spin tip="加载中..." style={{ display: 'flex', justifyContent: 'center', padding: 48 }} />;
  }

  return (
    <div>
      <h2 style={{ margin: 0, marginBottom: 24, fontSize: 20, fontWeight: 600 }}>
        设置
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
        <Card
          title="代理设置"
          headerStyle={{ fontWeight: 600 }}
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>代理端口</div>
            <InputNumber
              min={1024}
              max={65535}
              value={proxyPort}
              onChange={(v) => setProxyPort(v as number)}
              style={{ width: 200 }}
            />
          </div>
          <Button
            type="primary"
            onClick={handleSavePort}
            loading={portSaving}
          >
            保存端口
          </Button>
        </Card>

        <Card
          title="样式设置"
          headerStyle={{ fontWeight: 600 }}
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>主题模式</div>
            <RadioGroup
              type="button"
              value={appTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
            >
              <Radio value="light">明亮模式</Radio>
              <Radio value="dark">黑暗模式</Radio>
              <Radio value="system">跟随系统</Radio>
            </RadioGroup>
          </div>
        </Card>

        <Card
          title="日志设置"
          headerStyle={{ fontWeight: 600 }}
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>最大日志条数</div>
            <InputNumber
              min={100}
              value={maxLogEntries}
              onChange={(v) => setMaxLogEntries(v as number)}
              style={{ width: 200 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>日志保留天数</div>
            <InputNumber
              min={1}
              value={retentionDays}
              onChange={(v) => setRetentionDays(v as number)}
              style={{ width: 200 }}
            />
          </div>
          <Button
            type="primary"
            onClick={handleSaveLogSettings}
            loading={logSaving}
          >
            保存日志设置
          </Button>
        </Card>
      </div>
    </div>
  );
}
