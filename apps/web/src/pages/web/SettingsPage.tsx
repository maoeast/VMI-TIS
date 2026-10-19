import { useEffect, useState } from 'react';
import {
  Database,
  RefreshCw,
  Server,
  Trash2,
} from 'lucide-react';
import type { AuditLogQueryDto } from '@vmi-tis/shared-types';
import { auditApi, healthApi, homeworkApi } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { useAppStore } from '../../store/useAppStore';
import { formatDateTime } from '../../utils/format';

const ACTIONS = [
  'CREATE_STUDENT',
  'UPDATE_STUDENT',
  'DELETE_STUDENT',
  'IMPORT_EXCEL',
  'RED_ZONE_LOCK',
  'UNLOCK_RED_ZONE',
  'UPLOAD_REFERRAL',
  'UPDATE_ASSESSMENT',
  'CREATE_IEP',
  'UPDATE_IEP',
  'CREATE_SESSION',
  'RECORD_TRIAL',
  'UPDATE_STAGE',
  'FINISH_SESSION',
  'APPROVE_PROMOTION',
  'CREATE_HOMEWORK',
  'SUBMIT_CHECKIN',
  'REPLY_CHECKIN',
  'CRON_CLEAN_VIDEOS',
];

export function SettingsPage() {
  const showToast = useAppStore((state) => state.showToast);
  const [logs, setLogs] = useState<AuditLogQueryDto | null>(null);
  const [health, setHealth] = useState<{
    status: string;
    service: string;
    database: string;
    uptimeSec: number;
  } | null>(null);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [auditData, healthData] = await Promise.all([
        auditApi.list({ action, pageSize: 100 }),
        healthApi.get(),
      ]);
      setLogs(auditData);
      setHealth(healthData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const cleanVideos = async () => {
    try {
      const result = await homeworkApi.cleanVideos();
      showToast(
        `清理完成：扫描 ${result.scanned} 条，标记 ${result.cleaned} 条`,
        'success',
      );
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="系统设置与审计"
        description="医疗合规审计日志、服务健康状态、过期视频清理"
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => void cleanVideos()}>
              <Trash2 className="mr-1 inline h-4 w-4" />
              清理过期视频
            </button>
            <button type="button" className="btn-secondary" onClick={() => void load()}>
              <RefreshCw className="mr-1 inline h-4 w-4" />
              刷新
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">API 服务</div>
            <div className="text-sm font-bold text-slate-800">
              {health?.status === 'ok' ? '运行中' : '未连接'}
            </div>
            <div className="text-[11px] text-slate-400">{health?.service ?? 'vmi-tis-api'}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">数据库模式</div>
            <div className="text-sm font-bold text-slate-800">
              {health?.database === 'postgresql' ? 'PostgreSQL' : 'SQLite'}
            </div>
            <div className="text-[11px] text-slate-400">单机/医院服务器双模</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">运行时长</div>
            <div className="text-sm font-bold text-slate-800">
              {health?.uptimeSec ?? 0} 秒
            </div>
            <div className="text-[11px] text-slate-400">报告目录 apps/api/data/reports</div>
          </div>
        </div>
      </div>

      <section className="card mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">审计日志</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              共 {logs?.total ?? 0} 条 · WHO / WHEN / WHAT
            </p>
          </div>
          <select value={action} onChange={(event) => setAction(event.target.value)} className="input w-56 text-xs">
            <option value="">全部动作</option>
            {ACTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="table-head sticky top-0">
              <tr>
                <th className="px-4 py-2">时间</th>
                <th className="px-4 py-2">操作者</th>
                <th className="px-4 py-2">角色</th>
                <th className="px-4 py-2">动作</th>
                <th className="px-4 py-2">目标</th>
                <th className="px-4 py-2">变更</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">加载中…</td>
                </tr>
              ) : (logs?.logs.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">暂无审计日志</td>
                </tr>
              ) : (
                logs?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{log.userName}</td>
                    <td className="px-4 py-2 text-slate-500">{log.userRole}</td>
                    <td className="px-4 py-2">
                      <span className="badge bg-teal-50 font-mono text-teal-800">{log.action}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                      {log.targetType} / {log.targetId.slice(0, 8)}
                    </td>
                    <td className="max-w-[320px] truncate px-4 py-2 text-slate-500" title={log.changesAfterJson ?? ''}>
                      {log.changesAfterJson ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-[11px] leading-5 text-slate-500">
        单机版默认使用 SQLite，数据文件位于 <code className="rounded bg-white px-1">apps/api/data/vmi_tis.db</code>。
        切换 PostgreSQL 时只需修改根目录 <code className="rounded bg-white px-1">prisma/schema.prisma</code> 的 provider 与
        <code className="ml-1 rounded bg-white px-1">DATABASE_URL</code>。
      </div>
    </div>
  );
}
