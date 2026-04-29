import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Input,
  Select,
  Switch,
  Toast,
  Popconfirm,
} from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconDelete, IconMinusCircle } from '@douyinfe/semi-icons';
import {
  listAccessPoints,
  createAccessPoint,
  updateAccessPoint,
  deleteAccessPoint,
  toggleAccessPoint,
  listServices,
} from '../services';
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

export default function AccessPointsPage() {
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPoint, setEditingPoint] = useState<AccessPoint | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formPath, setFormPath] = useState('');
  const [formServiceId, setFormServiceId] = useState('');
  const [formLogFullContent, setFormLogFullContent] = useState(false);
  const [formHeaderRules, setFormHeaderRules] = useState<HeaderRuleEntry[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [points, svcs] = await Promise.all([
        listAccessPoints(),
        listServices(),
      ]);
      setAccessPoints(points);
      setServices(svcs);
    } catch (error) {
      Toast.error(`获取数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormPath('');
    setFormServiceId('');
    setFormLogFullContent(false);
    setFormHeaderRules([]);
  };

  const handleAdd = () => {
    setEditingPoint(null);
    resetForm();
    setModalVisible(true);
  };

  const handleEdit = (point: AccessPoint) => {
    setEditingPoint(point);
    setFormPath(point.path);
    setFormServiceId(point.service_id);
    setFormLogFullContent(point.log_full_content);
    setFormHeaderRules(
      point.header_rules.map((rule, index) => ({
        key: `${index}`,
        header_name: rule.header_name,
        header_value: rule.header_value,
        action: rule.action,
      })),
    );
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccessPoint(id);
      Toast.success('接入点已删除');
      fetchData();
    } catch (error) {
      Toast.error(`删除失败: ${error}`);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleAccessPoint(id);
      fetchData();
    } catch (error) {
      Toast.error(`切换失败: ${error}`);
    }
  };

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
      setModalVisible(false);
      fetchData();
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

  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  const columns = [
    { title: '路径', dataIndex: 'path', width: 250 },
    {
      title: '关联服务',
      dataIndex: 'service_id',
      width: 200,
      render: (id: string) => serviceMap.get(id) || id,
    },
    {
      title: '记录完整内容',
      dataIndex: 'log_full_content',
      width: 130,
      render: (val: boolean) => (val ? '是' : '否'),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (val: boolean, record: AccessPoint) => (
        <Switch
          checked={val}
          onChange={() => handleToggle(record.id)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 160,
      render: (_: string, record: AccessPoint) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<IconEdit />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            content="确定要删除此接入点吗？此操作不可撤销。"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<IconDelete />} size="small" type="danger">
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>接入点</h2>
        <Button icon={<IconPlus />} type="primary" onClick={handleAdd}>
          添加接入点
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={accessPoints}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        empty="暂无接入点数据"
      />

      <Modal
        title={editingPoint ? '编辑接入点' : '添加接入点'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
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
    </div>
  );
}
