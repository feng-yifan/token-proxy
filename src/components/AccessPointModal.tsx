import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Form, Select, Button, Toast, Input } from '@douyinfe/semi-ui';
import { IconPlus, IconMinusCircle } from '@douyinfe/semi-icons';
import { createAccessPoint, updateAccessPoint } from '../services';
import { getErrorMessage } from '../utils/error';
import type { AccessPoint, ApiService, HeaderRule, HeaderAction } from '../types';

const PATH_PREFIX = '/api/';

const HEADER_ACTIONS: { label: string; value: HeaderAction }[] = [
  { label: '设置', value: 'set' },
  { label: '覆盖', value: 'override' },
  { label: '移除', value: 'remove' },
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

interface HeaderRuleEntry {
  key: string;
  header_name: string;
  header_value: string;
  action: HeaderAction;
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
  const [headerRules, setHeaderRules] = useState<HeaderRuleEntry[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);

  const fullPath = PATH_PREFIX + pathSuffix.replace(/^\/+/, '');

  useEffect(() => {
    if (!visible) return;
    if (editingPoint) {
      const suffix = extractSuffix(editingPoint.path);
      setPathSuffix(suffix);
      setHeaderRules(
        editingPoint.header_rules.map((rule, index) => ({
          key: `${index}`,
          header_name: rule.header_name,
          header_value: rule.header_value,
          action: rule.action,
        })),
      );
      // 延迟设置表单值，确保 formRef 已就绪
      setTimeout(() => {
        formRef.current?.setValues({
          path_suffix: suffix,
          service_id: editingPoint.service_id,
          log_full_content: editingPoint.log_full_content,
        });
      }, 0);
    } else {
      setPathSuffix('');
      setHeaderRules([]);
      setTimeout(() => {
        formRef.current?.reset();
      }, 0);
    }
  }, [visible, editingPoint]);

  const handleGeneratePath = useCallback(() => {
    const suffix = generateRandomSuffix();
    setPathSuffix(suffix);
    formRef.current?.setValues({ path_suffix: suffix });
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const rules: HeaderRule[] = headerRules.map((r) => ({
        header_name: r.header_name,
        header_value: r.header_value,
        action: r.action,
      }));

      if (editingPoint) {
        await updateAccessPoint({
          id: editingPoint.id,
          path: fullPath,
          service_id: values.service_id as string,
          header_rules: rules,
          log_full_content: values.log_full_content as boolean,
        });
        Toast.success('接入点已更新');
      } else {
        await createAccessPoint({
          path: fullPath,
          service_id: values.service_id as string,
          header_rules: rules,
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

  const addHeaderRule = () => {
    setHeaderRules([
      ...headerRules,
      {
        key: `${Date.now()}`,
        header_name: '',
        header_value: '',
        action: 'set' as HeaderAction,
      },
    ]);
  };

  const removeHeaderRule = (key: string) => {
    setHeaderRules(headerRules.filter((r) => r.key !== key));
  };

  const updateHeaderRule = (
    key: string,
    field: keyof HeaderRuleEntry,
    value: string,
  ) => {
    setHeaderRules(
      headerRules.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const isEditing = Boolean(editingPoint);

  return (
    <Modal
      title={isEditing ? '编辑接入点' : '添加接入点'}
      visible={visible}
      onCancel={onClose}
      onOk={() => formRef.current?.submitForm()}
      confirmLoading={submitting}
      width={640}
    >
      <Form
        onSubmit={handleSubmit}
        getFormApi={(api) => {
          formRef.current = api;
        }}
        initValues={
          editingPoint
            ? {
                path_suffix: extractSuffix(editingPoint.path),
                service_id: editingPoint.service_id,
                log_full_content: editingPoint.log_full_content,
              }
            : {
                path_suffix: '',
                service_id: '',
                log_full_content: false,
              }
        }
      >
        <Form.Input
          field="path_suffix"
          label="路径"
          prefix={PATH_PREFIX}
          placeholder="test 或 chat/completions"
          onChange={(v) => setPathSuffix(v)}
          rules={[{ required: true, message: '请输入路径后缀' }]}
          addonAfter={
            <Button
              onClick={handleGeneratePath}
              style={{ margin: '-5px -11px' }}
            >
              随机生成
            </Button>
          }
        />
        <div
          style={{
            color: 'var(--semi-color-text-2)',
            fontSize: 12,
            fontFamily: 'monospace',
            marginBottom: 16,
            marginTop: -8,
          }}
        >
          完整路径: {fullPath || '(请输入后缀)'}
        </div>
        <Form.Select
          field="service_id"
          label="关联服务"
          placeholder="请选择服务"
          rules={[{ required: true, message: '请选择关联服务' }]}
          style={{ width: '100%' }}
        >
          {services.map((s) => (
            <Select.Option key={s.id} value={s.id}>
              {s.name}
            </Select.Option>
          ))}
        </Form.Select>
        <Form.Switch field="log_full_content" label="记录完整内容" />
      </Form>

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <label style={{ fontWeight: 500 }}>Header 规则</label>
          <Button size="small" icon={<IconPlus />} onClick={addHeaderRule}>
            添加规则
          </Button>
        </div>
        {headerRules.length === 0 && (
          <div style={{ color: 'var(--semi-color-text-2)', fontSize: 13 }}>
            暂无规则
          </div>
        )}
        {headerRules.map((rule) => (
          <div
            key={rule.key}
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              alignItems: 'center',
            }}
          >
            <Input
              placeholder="Header 名称"
              value={rule.header_name}
              onChange={(v) => updateHeaderRule(rule.key, 'header_name', v)}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="Header 值"
              value={rule.header_value}
              onChange={(v) => updateHeaderRule(rule.key, 'header_value', v)}
              style={{ flex: 1 }}
            />
            <Select
              value={rule.action}
              onChange={(v) =>
                updateHeaderRule(rule.key, 'action', v as string)
              }
              style={{ width: 100 }}
            >
              {HEADER_ACTIONS.map((a) => (
                <Select.Option key={a.value} value={a.value}>
                  {a.label}
                </Select.Option>
              ))}
            </Select>
            <Button
              icon={<IconMinusCircle />}
              type="danger"
              size="small"
              onClick={() => removeHeaderRule(rule.key)}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
