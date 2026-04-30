import { useState } from 'react';
import {
  Table,
  Button,
  Select,
  Tag,
  SideSheet,
  Toast,
  Popconfirm,
  TextArea,
} from '@douyinfe/semi-ui';
import { IconRefresh, IconClear } from '@douyinfe/semi-icons';
import { queryLogs, clearLogs, listAccessPoints } from '../services';
import { useApiData } from '../hooks/useApiData';
import { getErrorMessage } from '../utils/error';
import type { ProxyLog, PaginatedLogs, AccessPoint } from '../types';

function StatusCodeTag({ code }: { code: number }) {
  let color: 'green' | 'orange' | 'red' = 'red';
  if (code >= 200 && code < 300) {
    color = 'green';
  } else if (code >= 400 && code < 500) {
    color = 'orange';
  }
  return <Tag color={color}>{code}</Tag>;
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [filterAccessPointId, setFilterAccessPointId] = useState<string | undefined>(undefined);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProxyLog | null>(null);

  const {
    data: logData,
    loading,
    fetchData: fetchLogs,
  } = useApiData<PaginatedLogs>(
    () => queryLogs({ page, page_size: pageSize, access_point_id: filterAccessPointId }),
    [page, pageSize, filterAccessPointId],
    '获取日志失败',
  );

  const { data: accessPoints } = useApiData<AccessPoint[]>(
    listAccessPoints,
    [],
    '获取接入点失败',
  );

  const handleClear = async () => {
    try {
      const count = await clearLogs();
      Toast.success(`已清空 ${count} 条日志`);
      setPage(1);
      fetchLogs();
    } catch (error) {
      Toast.error(`清空失败: ${getErrorMessage(error)}`);
    }
  };

  const handleRowClick = (record: ProxyLog) => {
    setSelectedLog(record);
    setDrawerVisible(true);
  };

  const apMap = new Map((accessPoints ?? []).map((ap) => [ap.id, ap.path]));

  const columns = [
    {
      title: '时间',
      dataIndex: 'request_timestamp',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    { title: '路径', dataIndex: 'request_path', width: 300 },
    { title: '方法', dataIndex: 'method', width: 80 },
    {
      title: '状态码',
      dataIndex: 'status_code',
      width: 90,
      render: (code: number) => <StatusCodeTag code={code} />,
    },
    {
      title: '延迟 (ms)',
      dataIndex: 'latency_ms',
      width: 100,
    },
    {
      title: '关联接入点',
      dataIndex: 'access_point_id',
      width: 200,
      render: (id: string) => apMap.get(id) || id,
    },
  ];

  const detailStyle = {
    label: { fontWeight: 600 as const, marginBottom: 4 },
    value: { fontSize: 13, color: 'var(--semi-color-text-2)' as const },
    section: { marginBottom: 16 },
  };

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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>请求日志</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select
            placeholder="全部接入点"
            value={filterAccessPointId}
            onChange={(v) => {
              setFilterAccessPointId(v as string | undefined);
              setPage(1);
            }}
            style={{ width: 200 }}
            showClear
          >
            {(accessPoints ?? []).map((ap) => (
              <Select.Option key={ap.id} value={ap.id}>
                {ap.path}
              </Select.Option>
            ))}
          </Select>
          <Button icon={<IconRefresh />} onClick={fetchLogs}>
            刷新
          </Button>
          <Popconfirm
            title="确认清空"
            content="确定要清空所有日志吗？此操作不可撤销。"
            position="bottomRight"
            onConfirm={handleClear}
          >
            <Button icon={<IconClear />} type="danger">
              清空日志
            </Button>
          </Popconfirm>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={logData?.logs ?? []}
        rowKey="id"
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize,
          total: logData?.total ?? 0,
          showSizeChanger: true,
          pageSizeOpts: [10, 15, 30, 50],
          onPageChange: (p: number) => setPage(p),
          onPageSizeChange: (s: number) => {
            setPageSize(s);
            setPage(1);
          },
        }}
        empty="暂无日志数据"
        onRow={(record) => ({
          onClick: () => record && handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
      />

      <SideSheet
        title="日志详情"
        visible={drawerVisible}
        onCancel={() => setDrawerVisible(false)}
        width={600}
        placement="right"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={detailStyle.section}>
              <div style={detailStyle.label}>请求信息</div>
              <div style={detailStyle.value}>
                <div>方法: {selectedLog.method}</div>
                <div>路径: {selectedLog.request_path}</div>
                <div>状态码: {selectedLog.status_code}</div>
                <div>延迟: {selectedLog.latency_ms} ms</div>
                <div>
                  时间:{' '}
                  {new Date(selectedLog.request_timestamp).toLocaleString(
                    'zh-CN',
                  )}
                </div>
              </div>
            </div>

            {selectedLog.request_body !== null && (
              <div style={detailStyle.section}>
                <div style={detailStyle.label}>请求体</div>
                <TextArea
                  value={selectedLog.request_body}
                  rows={6}
                  readonly
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
            )}

            {selectedLog.response_body !== null && (
              <div style={detailStyle.section}>
                <div style={detailStyle.label}>响应体</div>
                <TextArea
                  value={selectedLog.response_body}
                  rows={6}
                  readonly
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
            )}
          </div>
        )}
      </SideSheet>
    </div>
  );
}
