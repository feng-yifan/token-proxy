import { useState, useRef, useEffect } from 'react';
import { Modal, Form, Button, Input, Select, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconMinus } from '@douyinfe/semi-icons';
import { createService, updateService } from '../services';
import { getErrorMessage } from '../utils/error';
import { sanitizeInput } from '../utils/sanitize';
import type { ApiService, ModelConfig } from '../types';

interface ServiceModalProps {
  visible: boolean;
  editingService: ApiService | null;
  onClose: () => void;
  onSuccess: () => void;
}

const API_TYPE_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic', disabled: false },
  { value: 'openai', label: 'OpenAI', disabled: true },
];

export default function ServiceModal({
  visible,
  editingService,
  onClose,
  onSuccess,
}: ServiceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);
  const [apiType, setApiType] = useState('anthropic');
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [defaultModel, setDefaultModel] = useState('');

  // 编辑模式回填
  useEffect(() => {
    if (editingService) {
      setApiType(editingService.api_type);
      setModels(editingService.models);
      setDefaultModel(editingService.default_model);
    } else {
      setApiType('anthropic');
      setModels([]);
      setDefaultModel('');
    }
  }, [editingService, visible]);

  const addModel = () => {
    setModels([...models, { name: '' }]);
    // 自动将新模型设为默认模型
    if (models.length === 0) {
      setDefaultModel('');
    }
  };

  const removeModel = (index: number) => {
    if (models.length <= 1) {
      Toast.error('至少需要保留一个模型');
      return;
    }
    const removed = models[index];
    setModels(models.filter((_, i) => i !== index));
    // 如果移除的是默认模型，重置默认模型
    if (removed.name === defaultModel) {
      setDefaultModel('');
    }
  };

  const updateModelName = (index: number, name: string) => {
    const sanitized = sanitizeInput(name);
    setModels(models.map((m, i) => (i === index ? { ...m, name: sanitized } : m)));
    // 如果没有设置默认模型，自动设为第一个模型
    if (!defaultModel && sanitized) {
      setDefaultModel(sanitized);
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // 验证模型列表
    const validModels = models.filter((m) => m.name.trim());
    if (validModels.length === 0) {
      Toast.error('请至少添加一个模型');
      return;
    }

    // 验证默认模型
    if (!defaultModel) {
      Toast.error('请选择默认模型');
      return;
    }
    if (!validModels.some((m) => m.name === defaultModel)) {
      Toast.error('默认模型必须在模型列表中');
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedValues = {
        name: sanitizeInput(values.name as string),
        base_url: sanitizeInput(values.base_url as string),
        api_key: sanitizeInput(values.api_key as string),
      };

      if (editingService) {
        await updateService({
          id: editingService.id,
          name: sanitizedValues.name,
          base_url: sanitizedValues.base_url,
          api_key: sanitizedValues.api_key,
          api_type: apiType,
          models: validModels,
          default_model: defaultModel,
        });
        Toast.success('服务已更新');
      } else {
        await createService({
          name: sanitizedValues.name,
          base_url: sanitizedValues.base_url,
          api_key: sanitizedValues.api_key,
          api_type: apiType,
          models: validModels,
          default_model: defaultModel,
        });
        Toast.success('服务已创建');
      }
      onClose();
      onSuccess();
    } catch (error) {
      Toast.error(`保存失败: ${getErrorMessage(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 默认模型选项
  const defaultModelOptions = models.map((m) => ({
    value: m.name,
    label: m.name,
  }));

  return (
    <Modal
      title={editingService ? '编辑服务' : '添加服务'}
      visible={visible}
      onCancel={onClose}
      onOk={() => formRef.current?.submitForm()}
      confirmLoading={submitting}
      okText={editingService ? '更新' : '创建'}
      cancelText="取消"
      width={560}
    >
      <Form
        onSubmit={handleSubmit}
        getFormApi={(api) => {
          formRef.current = api;
        }}
        initValues={
          editingService
            ? {
                name: editingService.name,
                base_url: editingService.base_url,
                api_key: editingService.api_key,
              }
            : undefined
        }
      >
        <Form.Input
          field="name"
          label="名称"
          placeholder="请输入服务名称"
          rules={[{ required: true, message: '请输入服务名称' }]}
        />

        <Form.Slot label="API 类型">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {API_TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                theme={apiType === opt.value ? 'solid' : 'light'}
                disabled={opt.disabled}
                onClick={() => !opt.disabled && setApiType(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </Form.Slot>

        <Form.Input
          field="base_url"
          label="Base URL"
          placeholder="https://api.example.com"
          rules={[{ required: true, message: '请输入 Base URL' }]}
        />
        <Form.Input
          field="api_key"
          label="API Key"
          placeholder="请输入 API Key"
          mode="password"
          rules={[{ required: true, message: '请输入 API Key' }]}
        />

        <Form.Slot label={{ text: '默认模型', required: true }}>
          <Select
            placeholder="请选择默认模型"
            value={defaultModel || undefined}
            onChange={(v) => setDefaultModel(v as string)}
            style={{ width: '100%' }}
          >
            {defaultModelOptions.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Slot>

        <Form.Slot label="模型列表">
          <div>
            {models.map((model, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  alignItems: 'center',
                }}
              >
                <Input
                  placeholder="模型名称 (如 deepseek-v4-pro)"
                  value={model.name}
                  onChange={(v) => updateModelName(index, v)}
                  style={{ flex: 1 }}
                />
                <Button
                  type="tertiary"
                  size="small"
                  icon={<IconMinus />}
                  onClick={() => removeModel(index)}
                />
              </div>
            ))}
            <Button
              icon={<IconPlus />}
              onClick={addModel}
              size="small"
            >
              添加模型
            </Button>
          </div>
        </Form.Slot>
      </Form>
    </Modal>
  );
}
