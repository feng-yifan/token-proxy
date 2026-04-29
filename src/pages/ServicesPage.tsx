import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Toast,
  Popconfirm,
} from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconDelete } from '@douyinfe/semi-icons';
import { listServices, createService, updateService, deleteService } from '../services';
import type { ApiService } from '../types';

export default function ServicesPage() {
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ApiService | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listServices();
      setServices(data);
    } catch (error) {
      Toast.error(`获取服务列表失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAdd = () => {
    setEditingService(null);
    setModalVisible(true);
  };

  const handleEdit = (service: ApiService) => {
    setEditingService(service);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService(id);
      Toast.success('服务已删除');
      fetchServices();
    } catch (error) {
      Toast.error(`删除失败: ${error}`);
    }
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
      setModalVisible(false);
      fetchServices();
    } catch (error) {
      Toast.error(`保存失败: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 200 },
    { title: 'Base URL', dataIndex: 'base_url', width: 400 },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 200,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 160,
      render: (_: string, record: ApiService) => (
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
            content="确定要删除此服务吗？此操作不可撤销。"
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>API 服务</h2>
        <Button icon={<IconPlus />} type="primary" onClick={handleAdd}>
          添加服务
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={services}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        empty="暂无服务数据"
      />

      <Modal
        title={editingService ? '编辑服务' : '添加服务'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form
          onSubmit={handleSubmit}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 24,
            }}
          >
            <Button onClick={() => setModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingService ? '更新' : '创建'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
