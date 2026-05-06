import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal, Form, Select, Button, Toast, Input, Card, Modal as SelectModal } from '@douyinfe/semi-ui';
import { IconPlus, IconMinus } from '@douyinfe/semi-icons';
import { createAccessPoint, updateAccessPoint } from '../services';
import { getErrorMessage } from '../utils/error';
import { sanitizeInput } from '../utils/sanitize';
import type { AccessPoint, AccessPointService, ApiService } from '../types';

const PATH_PREFIX = '/api/';

// 特殊值常量
const OTHER_MODELS = '__other__';
const DEFAULT_MODEL = '__default__';

// 源模型预定义选项
const SOURCE_OPTIONS = [
  { value: 'claude-opus-4-7', label: 'claude-opus-4-7' },
  { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6' },
  { value: 'claude-haiku-4-5', label: 'claude-haiku-4-5' },
  { value: OTHER_MODELS, label: '未匹配模型' },
];

function extractSuffix(fullPath: string): string {
  if (fullPath.startsWith(PATH_PREFIX)) {
    return fullPath.slice(PATH_PREFIX.length);
  }
  return fullPath;
}

function generateRandomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const len = 20;
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 映射条目（带 key 用于 React 列表渲染）
interface MappingEntry {
  key: string;
  source: string;
  target: string;
}

// 服务条目（带 key 用于 React 列表渲染）
interface ServiceEntry {
  key: string;
  service_id: string;
  model_mappings: MappingEntry[];
}

interface AccessPointModalProps {
  visible: boolean;
  editingPoint: AccessPoint | null;
  services: ApiService[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AccessPointModal({
  visible,
  editingPoint,
  services,
  onClose,
  onSuccess,
}: AccessPointModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [pathSuffix, setPathSuffix] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [selectServiceModalVisible, setSelectServiceModalVisible] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);

  // 用 key 强制 Form 重新挂载，确保 initValues 每次打开都生效
  const formKey = useMemo(
    () => editingPoint?.id ?? `new-${Date.now()}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, editingPoint?.id],
  );

  const fullPath = PATH_PREFIX + pathSuffix.replace(/^\/+/, '');

  // Modal 打开时初始化状态
  useEffect(() => {
    if (!visible) return;
    if (editingPoint) {
      setPathSuffix(extractSuffix(editingPoint.path));
      setApiKey(editingPoint.api_key);
      setServiceEntries(
        editingPoint.services.map((s, index) => ({
          key: `${index}`,
          service_id: s.service_id,
          model_mappings: s.model_mappings.map((m, mIndex) => ({
            key: `${mIndex}`,
            source: m.source,
            target: m.target,
          })),
        })),
      );
    } else {
      setPathSuffix('');
      setApiKey('');
      setServiceEntries([]);
    }
  }, [visible, editingPoint]);

  const handleGeneratePath = useCallback(() => {
    const suffix = generateRandomSuffix();
    setPathSuffix(suffix);
  }, []);

  const handleGenerateApiKey = useCallback(() => {
    const hexChars = '0123456789abcdef';
    let key = 'sk-';
    for (let i = 0; i < 48; i++) {
      key += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
    }
    setApiKey(key);
  }, []);

  // 添加服务
  const addService = (serviceId: string) => {
    if (!serviceId) return;
    if (serviceEntries.some((s) => s.service_id === serviceId)) {
      Toast.error('该服务已添加');
      return;
    }
    const newEntry: ServiceEntry = {
      key: `${Date.now()}`,
      service_id: serviceId,
      model_mappings: [
        { key: `${Date.now()}-0`, source: OTHER_MODELS, target: DEFAULT_MODEL },
      ],
    };
    setServiceEntries([...serviceEntries, newEntry]);
  };

  // 移除服务
  const removeService = (key: string) => {
    if (serviceEntries.length <= 1) {
      Toast.error('接入点必须至少保留一个服务');
      return;
    }
    setServiceEntries(serviceEntries.filter((s) => s.key !== key));
  };

  // 获取 API 服务信息
  const getApiService = useCallback(
    (serviceId: string) => services.find((s) => s.id === serviceId),
    [services],
  );

  // 获取目标模型选项
  const getTargetOptions = useCallback(
    (serviceId: string) => {
      const apiService = getApiService(serviceId);
      if (!apiService) return [];
      const options = [{ value: DEFAULT_MODEL, label: `默认模型 (${apiService.default_model || '未设置'})` }];
      apiService.models.forEach((m) => options.push({ value: m.name, label: m.name }));
      return options;
    },
    [getApiService],
  );

  // 添加映射到指定服务
  const addMapping = (serviceKey: string) => {
    const newMapping: MappingEntry = {
      key: `${Date.now()}`,
      source: OTHER_MODELS,
      target: DEFAULT_MODEL,
    };
    setServiceEntries(
      serviceEntries.map((entry) =>
        entry.key === serviceKey
          ? { ...entry, model_mappings: [...entry.model_mappings, newMapping] }
          : entry,
      ),
    );
  };

  // 移除映射
  const removeMapping = (serviceKey: string, mappingKey: string) => {
    setServiceEntries(
      serviceEntries.map((entry) =>
        entry.key === serviceKey
          ? { ...entry, model_mappings: entry.model_mappings.filter((m) => m.key !== mappingKey) }
          : entry,
      ),
    );
  };

  // 更新映射
  const updateMapping = (
    serviceKey: string,
    mappingKey: string,
    field: 'source' | 'target',
    value: string,
  ) => {
    setServiceEntries(
      serviceEntries.map((entry) =>
        entry.key === serviceKey
          ? {
              ...entry,
              model_mappings: entry.model_mappings.map((m) =>
                m.key === mappingKey ? { ...m, [field]: value } : m,
              ),
            }
          : entry,
      ),
    );
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!pathSuffix.trim()) {
      Toast.error('请输入路径');
      return;
    }
    if (!apiKey.trim()) {
      Toast.error('请输入密钥');
      return;
    }
    if (serviceEntries.length === 0) {
      Toast.error('请至少添加一个服务');
      return;
    }

    setSubmitting(true);
    try {
      const apServices: AccessPointService[] = serviceEntries.map((entry) => ({
        service_id: entry.service_id,
        model_mappings: entry.model_mappings
          .filter((m) => m.source.trim() && m.target.trim())
          .map((m) => ({
            source: sanitizeInput(m.source),
            target: sanitizeInput(m.target),
          })),
      }));

      if (editingPoint) {
        await updateAccessPoint({
          id: editingPoint.id,
          path: sanitizeInput(fullPath),
          services: apServices,
          api_key: sanitizeInput(apiKey.trim()),
          log_full_content: values.log_full_content as boolean,
        });
        Toast.success('接入点已更新');
      } else {
        await createAccessPoint({
          path: sanitizeInput(fullPath),
          services: apServices,
          api_key: sanitizeInput(apiKey.trim()),
          log_full_content: values.log_full_content as boolean,
        });
        Toast.success('接入点已创建');
      }
      onClose();
      onSuccess();
    } catch (error) {
      Toast.error(`保存失败: ${getErrorMessage(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = Boolean(editingPoint);

  // 可添加的服务选项（排除已添加的）
  const availableServiceOptions = services
    .filter((s) => !serviceEntries.some((e) => e.service_id === s.id))
    .map((s) => ({ value: s.id, label: s.name }));

  return (
    <Modal
      title={isEditing ? '编辑接入点' : '添加接入点'}
      visible={visible}
      onCancel={onClose}
      onOk={() => formRef.current?.submitForm()}
      confirmLoading={submitting}
      okText={isEditing ? '更新' : '创建'}
      cancelText="取消"
      width={800}
    >
      <Form
        key={formKey}
        onSubmit={handleSubmit}
        getFormApi={(api) => {
          formRef.current = api;
        }}
        initValues={{
          log_full_content: editingPoint?.log_full_content ?? false,
        }}
      >
        <Form.Slot label={{ text: '路径', required: true }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              prefix={PATH_PREFIX}
              placeholder="test 或 chat/completions"
              value={pathSuffix}
              onChange={(v) => setPathSuffix(v)}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <Button onClick={handleGeneratePath}>随机生成</Button>
          </div>
          <div
            style={{
              color: 'var(--semi-color-text-2)',
              fontFamily: 'monospace',
              marginTop: 4,
            }}
          >
            完整路径: {fullPath || '(请输入后缀)'}
          </div>
        </Form.Slot>

        <Form.Slot label={{ text: '密钥', required: true }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              placeholder="请输入密钥，格式：sk- + 48 位十六进制字符"
              value={apiKey}
              onChange={(v) => setApiKey(v)}
              style={{ flex: 1 }}
              mode="password"
            />
            <Button onClick={handleGenerateApiKey}>随机生成</Button>
          </div>
          <div
            style={{
              color: 'var(--semi-color-text-2)',
              marginTop: 4,
            }}
          >
            客户端必须携带此密钥才能通过代理访问该接入点
          </div>
        </Form.Slot>

        <Form.Switch field="log_full_content" label="记录完整内容" />

        {/* 关联服务区域 */}
        <Form.Slot label={{ text: '关联服务', required: true }}>
          {serviceEntries.length === 0 && (
            <div
              style={{
                color: 'var(--semi-color-text-2)',
                marginBottom: 8,
              }}
            >
              暂无关联服务
            </div>
          )}

          {/* 服务卡片列表 */}
          {serviceEntries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {serviceEntries.map((entry) => {
                const apiService = getApiService(entry.service_id);
                const targetOptions = getTargetOptions(entry.service_id);

                return (
                  <Card
                    key={entry.key}
                    style={{
                      borderColor: 'var(--semi-color-border)',
                    }}
                    headerStyle={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--semi-color-fill-0)',
                    }}
                    bodyStyle={{ padding: 12 }}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%' }}>
                        <span style={{ fontWeight: 500, lineHeight: 1.5 }}>{apiService?.name || entry.service_id}</span>
                        <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12, lineHeight: 1.5 }}>
                          ({entry.model_mappings.length} 条映射规则)
                        </span>
                      </div>
                    }
                    headerExtraContent={
                      <Button
                        type="tertiary"
                        size="small"
                        icon={<IconMinus />}
                        onClick={() => removeService(entry.key)}
                        disabled={serviceEntries.length <= 1}
                        style={{ marginTop: 2 }}
                      >
                        移除
                      </Button>
                    }
                  >
                    {/* 映射规则列表 */}
                    {entry.model_mappings.length === 0 && (
                      <div style={{ color: 'var(--semi-color-text-2)', marginBottom: 8 }}>
                        暂无映射规则
                      </div>
                    )}

                    {entry.model_mappings.map((mapping) => (
                      <div
                        key={mapping.key}
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginBottom: 8,
                          alignItems: 'center',
                        }}
                      >
                        {/* 源模型选择 */}
                        <Select
                          placeholder="源模型"
                          value={mapping.source || undefined}
                          onChange={(v) => updateMapping(entry.key, mapping.key, 'source', v as string)}
                          optionList={SOURCE_OPTIONS}
                          style={{ flex: 1 }}
                          filter
                        />

                        <span style={{ color: 'var(--semi-color-text-2)', flexShrink: 0 }}>→</span>

                        {/* 目标模型选择 */}
                        <Select
                          placeholder="目标模型"
                          value={mapping.target || undefined}
                          onChange={(v) => updateMapping(entry.key, mapping.key, 'target', v as string)}
                          optionList={targetOptions}
                          style={{ flex: 1 }}
                          filter
                        />

                        <Button
                          type="tertiary"
                          size="small"
                          icon={<IconMinus />}
                          onClick={() => removeMapping(entry.key, mapping.key)}
                        />
                      </div>
                    ))}

                    {/* 添加映射规则按钮 */}
                    <Button
                      size="small"
                      type="tertiary"
                      icon={<IconPlus />}
                      onClick={() => addMapping(entry.key)}
                    >
                      添加映射规则
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 添加服务按钮 */}
          <div style={{ marginTop: 12 }}>
            <Button
              theme="light"
              size="small"
              icon={<IconPlus />}
              onClick={() => setSelectServiceModalVisible(true)}
              disabled={availableServiceOptions.length === 0}
            >
              添加服务
            </Button>
          </div>
        </Form.Slot>
      </Form>

      {/* 服务选择对话框 */}
      <SelectModal
        title="选择服务"
        visible={selectServiceModalVisible}
        onCancel={() => {
          setSelectServiceModalVisible(false);
          setSelectedServiceId('');
        }}
        onOk={() => {
          if (selectedServiceId) {
            addService(selectedServiceId);
            setSelectServiceModalVisible(false);
            setSelectedServiceId('');
          }
        }}
        okText="添加"
        cancelText="取消"
        width={400}
      >
        <div style={{ padding: '16px 0' }}>
          <Select
            placeholder="请选择要添加的服务"
            value={selectedServiceId || undefined}
            onChange={(v) => setSelectedServiceId(v as string)}
            optionList={availableServiceOptions}
            style={{ width: '100%' }}
            filter
          />
        </div>
      </SelectModal>
    </Modal>
  );
}
