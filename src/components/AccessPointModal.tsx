import { useState, useEffect } from 'react';
import { Modal, Input, Select, Switch, Button, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconMinusCircle } from '@douyinfe/semi-icons';
import { createAccessPoint, updateAccessPoint } from '../services';
import type { AccessPoint, ApiService, HeaderRule, HeaderAction } from '../types';

const HEADER_ACTIONS: { label: string; value: HeaderAction }[] = [
  { label: '设置', value: 'set' },
  { label: '覆盖', value: 'override' },
  { label: '移除', value: 'remove' },
];

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
  const [formPath, setFormPath] = useState('');
  const [formServiceId, setFormServiceId] = useState('');
  const [formLogFullContent, setFormLogFullContent] = useState(false);
  const [formHeaderRules, setFormHeaderRules] = useState<HeaderRuleEntry[]>([]);

  // 每次打开模态框时根据 editingPoint 初始化表单
  useEffect(() => {
    if (!visible) return;
    if (editingPoint) {
      setFormPath(editingPoint.path);
      setFormServiceId(editingPoint.service_id);
      setFormLogFullContent(editingPoint.log_full_content);
      setFormHeaderRules(
        editingPoint.header_rules.map((rule, index) => ({
          key: `${index}`,
          header_name: rule.header_name,
          header_value: rule.header_value,
          action: rule.action,
        })),
      );
    } else {
      setFormPath('');
      setFormServiceId('');
      setFormLogFullContent(false);
      setFormHeaderRules([]);
    }
  }, [visible, editingPoint]);

  const handleSubmit = async () => {
    if (!formPath) {
      Toast.error('请输入路径');
      return;
    }
    if (!formServiceId) {
      Toast.error('请选择关联服务');
      return;
    }

    setSubmitting(true);
    try {
      const headerRules: HeaderRule[] = formHeaderRules.map((r) => ({
        header_name: r.header_name,
        header_value: r.header_value,
        action: r.action,
      }));

      if (editingPoint) {
        await updateAccessPoint({
          id: editingPoint.id,
          path: formPath,
          service_id: formServiceId,
          header_rules: headerRules,
          log_full_content: formLogFullContent,
        });
        Toast.success('接入点已更新');
      } else {
        await createAccessPoint({
          path: formPath,
          service_id: formServiceId,
          header_rules: headerRules,
          log_full_content: formLogFullContent,
        });
        Toast.success('接入点已创建');
      }
      onClose();
      onSuccess();
    } catch (error) {
      Toast.error(`保存失败: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addHeaderRule = () => {
    setFormHeaderRules([
      ...formHeaderRules,
      {
        key: `${Date.now()}`,
        header_name: '',
        header_value: '',
        action: 'set' as HeaderAction,
      },
    ]);
  };

  const removeHeaderRule = (key: string) => {
    setFormHeaderRules(formHeaderRules.filter((r) => r.key !== key));
  };

  const updateHeaderRule = (
    key: string,
    field: keyof HeaderRuleEntry,
    value: string,
  ) => {
    setFormHeaderRules(
      formHeaderRules.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  return (
    <Modal
      title={editingPoint ? '编辑接入点' : '添加接入点'}
      visible={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={640}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
            路径
          </label>
          <Input
            placeholder="/v1/chat/completions"
            value={formPath}
            onChange={(v) => setFormPath(v)}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
            关联服务
          </label>
          <Select
            placeholder="请选择服务"
            value={formServiceId}
            onChange={(v) => setFormServiceId(v as string)}
            style={{ width: '100%' }}
          >
            {services.map((s) => (
              <Select.Option key={s.id} value={s.id}>
                {s.name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
            记录完整内容
          </label>
          <Switch
            checked={formLogFullContent}
            onChange={(v) => setFormLogFullContent(v)}
          />
        </div>

        <div>
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
          {formHeaderRules.length === 0 && (
            <div style={{ color: 'var(--semi-color-text-2)', fontSize: 13 }}>
              暂无规则
            </div>
          )}
          {formHeaderRules.map((rule) => (
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
                onChange={(v) =>
                  updateHeaderRule(rule.key, 'header_name', v)
                }
                style={{ flex: 1 }}
              />
              <Input
                placeholder="Header 值"
                value={rule.header_value}
                onChange={(v) =>
                  updateHeaderRule(rule.key, 'header_value', v)
                }
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
      </div>
    </Modal>
  );
}
