import { useState, useRef, useEffect } from 'react';
import { Modal, Form, Button, Tag, TagInput, Input, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconMinus } from '@douyinfe/semi-icons';
import { createService, updateService } from '../services';
import { getErrorMessage } from '../utils/error';
import type { ApiService, ModelConfig } from '../types';

interface ServiceModalProps {
  visible: boolean;
  editingService: ApiService | null;
  onClose: () => void;
  onSuccess: () => void;
}

const API_TYPE_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic' },
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

  // 编辑模式回填
  useEffect(() => {
    if (editingService) {
      setApiType(editingService.api_type);
      setModels(editingService.models);
    } else {
      setApiType('anthropic');
      setModels([]);
    }
  }, [editingService, visible]);

  const addModel = () => {
    setModels([...models, { name: '', aliases: [] }]);
  };

  const removeModel = (index: number) => {
    setModels(models.filter((_, i) => i !== index));
  };

  const updateModelName = (index: number, name: string) => {
    setModels(models.map((m, i) => (i === index ? { ...m, name } : m)));
  };

  const updateModelAliases = (index: number, aliases: string[]) => {
    setModels(models.map((m, i) => (i === index ? { ...m, aliases } : m)));
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      if (editingService) {
        await updateService({
          id: editingService.id,
          name: values.name as string,
          base_url: values.base_url as string,
          api_key: values.api_key as string,
          api_type: apiType,
          models,
        });
        Toast.success('服务已更新');
      } else {
        await createService({
          name: values.name as string,
          base_url: values.base_url as string,
          api_key: values.api_key as string,
          api_type: apiType,
          models,
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
          <div style={{ display: 'flex', gap: 8 }}>
            {API_TYPE_OPTIONS.map((opt) => (
              <Tag
                key={opt.value}
                color={apiType === opt.value ? 'blue' : 'grey'}
                style={{ cursor: 'pointer' }}
                onClick={() => setApiType(opt.value)}
              >
                {opt.label}
              </Tag>
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

        <Form.Slot label="模型配置">
          <div>
            {models.map((model, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  alignItems: 'flex-start',
                }}
              >
                <Input
                  placeholder="模型名称 (如 claude-sonnet-4)"
                  value={model.name}
                  onChange={(v) => updateModelName(index, v)}
                  style={{ flex: 1 }}
                />
                <TagInput
                  placeholder="别名 (回车添加)"
                  value={model.aliases}
                  onChange={(v) => updateModelAliases(index, v as string[])}
                  style={{ flex: 1 }}
                />
                <Button
                  type="danger"
                  icon={<IconMinus />}
                  onClick={() => removeModel(index)}
                  size="small"
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
