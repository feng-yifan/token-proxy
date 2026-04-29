import { useState, useEffect, useCallback } from 'react';
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
  const [data, setData] = useState<PaginatedLogs | null>(null);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [filterAccessPointId, setFilterAccessPointId] = useState<string | undefined>(undefined);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProxyLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryLogs({
        page,
        page_size: pageSize,
        access_point_id: filterAccessPointId,
      });
      setData(result);
    } catch (error) {
      Toast.error(`获取日志失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterAccessPointId]);

  const fetchAccessPoints = useCallback(async () => {
    try {
      const points = await listAccessPoints();
      setAccessPoints(points);
    } catch {
      // 静默处理
    }
  }, []);

  useEffect(() => {
    fetchAccessPoints();
  }, [fetchAccessPoints]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClear = async () => {
    try {
      const count = await clearLogs();
      Toast.success(`已清空 ${count} 条日志`);
      setPage(1);
      fetchLogs();
    } catch (error) {
      Toast.error(`清空失败: ${error}`);
    }
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleRowClick = (record: ProxyLog) => {
    setSelectedLog(record);
    setDrawerVisible(true);
  };

  const apMap = new Map(accessPoints.map((ap) => [ap.id, ap.path]));

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
            {accessPoints.map((ap) => (
              <Select.Option key={ap.id} value={ap.id}>
                {ap.path}
              </Select.Option>
            ))}
          </Select>
          <Button icon={<IconRefresh />} onClick={handleRefresh}>
            刷新
          </Button>
          <Popconfirm
            title="确认清空"
            content="确定要清空所有日志吗？此操作不可撤销。"
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
        dataSource={data?.logs ?? []}
        rowKey="id"
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize,
          total: data?.total ?? 0,
          onPageChange: (p: number) => setPage(p),
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
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>请求信息</div>
              <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>
                <div>方法: {selectedLog.method}</div>
                <div>路径: {selectedLog.request_path}</div>
                <div>状态码: {selectedLog.status_code}</div>
                <div>
                  延迟: {selectedLog.latency_ms} ms
                </div>
                <div>
                  时间:{' '}
                  {new Date(selectedLog.request_timestamp).toLocaleString(
                    'zh-CN',
                  )}
                </div>
              </div>
            </div>

            {selectedLog.request_body !== null && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  请求体
                </div>
                <TextArea
                  value={selectedLog.request_body}
                  rows={6}
                  readonly
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {selectedLog.response_body !== null && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  响应体
                </div>
                <TextArea
                  value={selectedLog.response_body}
                  rows={6}
                  readonly
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>
        )}
      </SideSheet>
    </div>
  );
}
