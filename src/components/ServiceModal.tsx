import { useState, useRef } from 'react';
import { Modal, Form, Toast } from '@douyinfe/semi-ui';
import { createService, updateService } from '../services';
import { getErrorMessage } from '../utils/error';
import type { ApiService } from '../types';

interface ServiceModalProps {
  visible: boolean;
  editingService: ApiService | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ServiceModal({
  visible,
  editingService,
  onClose,
  onSuccess,
}: ServiceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      if (editingService) {
        await updateService({
          id: editingService.id,
          name: values.name as string,
          base_url: values.base_url as string,
          api_key: values.api_key as string,
        });
        Toast.success('服务已更新');
      } else {
        await createService({
          name: values.name as string,
          base_url: values.base_url as string,
          api_key: values.api_key as string,
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
      width={520}
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
      </Form>
    </Modal>
  );
}
