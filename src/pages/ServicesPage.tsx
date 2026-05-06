import { useState } from 'react';
import { Table, Button, Tag, Toast, Popconfirm, Typography } from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconDelete } from '@douyinfe/semi-icons';
import { listServices, deleteService } from '../services';
import { useApiData } from '../hooks/useApiData';
import { getErrorMessage } from '../utils/error';
import ServiceModal from '../components/ServiceModal';
import type { ApiService, ModelConfig } from '../types';

export default function ServicesPage() {
  const { data: services, loading, fetchData } = useApiData<ApiService[]>(
    listServices,
    [],
    '获取服务列表失败',
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ApiService | null>(null);

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
      fetchData();
    } catch (error) {
      Toast.error(`删除失败: ${getErrorMessage(error)}`);
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 180 },
    {
      title: 'API 类型',
      dataIndex: 'api_type',
      width: 100,
      render: (val: string) => <Tag color="blue" size="small">{val}</Tag>,
    },
    { title: 'Base URL', dataIndex: 'base_url', width: 300, render: (val: string) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
    {
      title: '模型数',
      dataIndex: 'models',
      width: 80,
      render: (models: ModelConfig[]) => models?.length ?? 0,
    },
    {
      title: '默认模型',
      dataIndex: 'default_model',
      width: 200,
      render: (val: string) => val || '-',
    },
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
        <Typography.Title heading={4} style={{ margin: 0 }}>API 服务</Typography.Title>
        <Button icon={<IconPlus />} type="primary" onClick={handleAdd}>
          添加服务
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={services ?? []}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOpts: [10, 20, 50] }}
        empty="暂无服务数据"
      />

      <ServiceModal
        visible={modalVisible}
        editingService={editingService}
        onClose={() => setModalVisible(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
