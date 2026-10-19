import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WorkbenchSummaryDto } from '@vmi-tis/shared-types';
import { workbenchApi } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { levelLabel } from '../../utils/format';

export function HomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<WorkbenchSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await workbenchApi.summary());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totalStudents = summary
    ? Object.values(summary.levelDistribution).reduce(
        (sum, value) => sum + value,
        0,
      )
    : 0;

  return (
    <div>
      <PageHeader
        title="工作台首页"
        description="今日训练安排、待办提醒与全员能力分布一屏掌握"
        actions={
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw className="mr-1 inline h-4 w-4" />
            刷新
          </button>
        }
      />

      {error && (
        <div className="card mb-5 border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-bold">后端连接失败</div>
          <p className="mt-1">{error}</p>
          <p className="mt-1 text-xs text-rose-700">
            请先运行 <code className="rounded bg-white px-1">npm run start</code>，确认
            http://localhost:3000/api/health 可访问。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="在训学生"
          value={loading ? '…' : summary?.activeStudentsCount ?? 0}
          hint={`全员 ${totalStudents} 人`}
          icon={Users}
          tone="teal"
        />
        <StatCard
          label="待晋级复核"
          value={loading ? '…' : summary?.pendingPromotions ?? 0}
          hint="连续 3 次课 ≥80%"
          icon={ClipboardList}
          tone="sky"
        />
        <StatCard
          label="待审核转介"
          value={loading ? '…' : summary?.pendingReferrals ?? 0}
          hint="眼科回执待视光师审核"
          icon={ShieldAlert}
          tone="amber"
        />
        <StatCard
          label="今日课次"
          value={loading ? '…' : summary?.todaySchedules.length ?? 0}
          hint="含实体操作与数字训练"
          icon={CalendarDays}
          tone="rose"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-bold text-slate-800">今日训练安排</h2>
            <span className="text-[11px] text-slate-400">按时间排序</span>
          </div>
          <div className="divide-y divide-slate-100">
            {summary?.todaySchedules.length ? (
              summary.todaySchedules.map((item, index) => (
                <div
                  key={`${item.time}-${index}`}
                  className="flex items-center gap-4 px-5 py-3 text-sm"
                >
                  <span className="rounded-lg bg-teal-50 px-2 py-1 font-mono text-xs font-bold text-teal-800">
                    {item.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800">
                      {item.studentName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {item.sopCardTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-teal-700 hover:underline"
                    onClick={() => navigate('/web/session')}
                  >
                    进入记分台
                  </button>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                今天还没有排课，去「课堂记分台」开始一节课。
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-bold text-slate-800">全员能力分布</h2>
          </div>
          <div className="space-y-3 px-5 py-4">
            {summary
              ? Object.entries(summary.levelDistribution).map(([level, count]) => {
                  const max = Math.max(
                    1,
                    ...Object.values(summary.levelDistribution),
                  );
                  return (
                    <div key={level}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">
                          {levelLabel(level)}
                        </span>
                        <span className="font-mono text-slate-500">{count} 人</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#0F4C5C]"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            title: '入案初筛与红区熔断',
            description: '发现屈光参差/斜视等红区指征时自动锁定并生成转介单',
            path: '/web/assessment',
          },
          {
            title: 'IEP 与晋级复核',
            description: '连续 3 次课 ≥80%、跨 2 种材料、1 次家庭打卡即可晋级',
            path: '/web/iep',
          },
          {
            title: '数据画像与眼动趋势',
            description: '查看六维雷达、正确率趋势与数字训练时长',
            path: '/web/analytics',
          },
        ].map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className="card group flex items-start justify-between p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <div className="text-sm font-bold text-slate-800">{item.title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                {item.description}
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 text-slate-300 group-hover:text-teal-700" />
          </button>
        ))}
      </div>
    </div>
  );
}
