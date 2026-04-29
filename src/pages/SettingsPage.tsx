import { useState, useEffect, useCallback } from 'react';
import { Card, InputNumber, Input, Button, Toast } from '@douyinfe/semi-ui';
import {
  getConfig,
  updateProxyPort,
  updateLogSettings,
  updateAdminKey,
} from '../services';
import type { AppConfig } from '../types';

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const [proxyPort, setProxyPort] = useState(9876);
  const [adminKey, setAdminKey] = useState('');
  const [maxLogEntries, setMaxLogEntries] = useState(10000);
  const [retentionDays, setRetentionDays] = useState(30);

  const [portSaving, setPortSaving] = useState(false);
  const [keySaving, setKeySaving] = useState(false);
  const [logSaving, setLogSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getConfig();
      setConfig(cfg);
      setProxyPort(cfg.proxy_port);
      setAdminKey(cfg.admin_key);
      setMaxLogEntries(cfg.log_settings.max_log_entries);
      setRetentionDays(cfg.log_settings.retention_days);
    } catch (error) {
      Toast.error(`获取配置失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSavePort = async () => {
    setPortSaving(true);
    try {
      await updateProxyPort(proxyPort);
      Toast.success('代理端口已更新');
    } catch (error) {
      Toast.error(`保存失败: ${error}`);
    } finally {
      setPortSaving(false);
    }
  };

  const handleSaveKey = async () => {
    if (!adminKey) {
      Toast.error('管理密钥不能为空');
      return;
    }
    setKeySaving(true);
    try {
      await updateAdminKey(adminKey);
      Toast.success('管理密钥已更新');
    } catch (error) {
      Toast.error(`保存失败: ${error}`);
    } finally {
      setKeySaving(false);
    }
  };

  const handleSaveLogSettings = async () => {
    setLogSaving(true);
    try {
      await updateLogSettings(maxLogEntries, retentionDays);
      Toast.success('日志设置已更新');
    } catch (error) {
      Toast.error(`保存失败: ${error}`);
    } finally {
      setLogSaving(false);
    }
  };

  if (loading && !config) {
    return <div style={{ padding: 24 }}>加载中...</div>;
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
          title="管理密钥"
          headerStyle={{ fontWeight: 600 }}
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>管理密钥</div>
            <Input
              mode="password"
              value={adminKey}
              onChange={(v) => setAdminKey(v)}
              style={{ width: 300 }}
            />
          </div>
          <Button
            type="primary"
            onClick={handleSaveKey}
            loading={keySaving}
          >
            保存密钥
          </Button>
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
