import { useState } from 'react';
import { Table, Button, Switch, Toast, Popconfirm } from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconDelete } from '@douyinfe/semi-icons';
import {
  listAccessPoints,
  deleteAccessPoint,
  toggleAccessPoint,
  listServices,
} from '../services';
import { useApiData } from '../hooks/useApiData';
import { getErrorMessage } from '../utils/error';
import AccessPointModal from '../components/AccessPointModal';
import type { AccessPoint, ApiService } from '../types';

export default function AccessPointsPage() {
  const {
    data: accessPoints,
    loading: pointsLoading,
    fetchData: fetchPoints,
  } = useApiData<AccessPoint[]>(listAccessPoints, [], '获取接入点失败');

  const { data: services } = useApiData<ApiService[]>(
    listServices,
    [],
    '获取服务列表失败',
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPoint, setEditingPoint] = useState<AccessPoint | null>(null);

  const handleAdd = () => {
    setEditingPoint(null);
    setModalVisible(true);
  };

  const handleEdit = (point: AccessPoint) => {
    setEditingPoint(point);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccessPoint(id);
      Toast.success('接入点已删除');
      fetchPoints();
    } catch (error) {
      Toast.error(`删除失败: ${getErrorMessage(error)}`);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleAccessPoint(id);
      fetchPoints();
    } catch (error) {
      Toast.error(`切换失败: ${getErrorMessage(error)}`);
    }
  };

  const serviceMap = new Map((services ?? []).map((s) => [s.id, s.name]));

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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>接入点</h2>
        <Button icon={<IconPlus />} type="primary" onClick={handleAdd}>
          添加接入点
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={accessPoints ?? []}
        rowKey="id"
        loading={pointsLoading}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOpts: [10, 20, 50] }}
        empty="暂无接入点数据"
      />

      <AccessPointModal
        visible={modalVisible}
        editingPoint={editingPoint}
        services={services ?? []}
        onClose={() => setModalVisible(false)}
        onSuccess={fetchPoints}
      />
    </div>
  );
}
