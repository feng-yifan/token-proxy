import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Toast, Popconfirm } from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconDelete } from '@douyinfe/semi-icons';
import { listServices, deleteService } from '../services';
import ServiceModal from '../components/ServiceModal';
import type { ApiService } from '../types';

export default function ServicesPage() {
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ApiService | null>(null);

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

  const handleModalClose = () => {
    setModalVisible(false);
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
            position="bottomRight"
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

      <ServiceModal
        visible={modalVisible}
        editingService={editingService}
        onClose={handleModalClose}
        onSuccess={fetchServices}
      />
    </div>
  );
}
