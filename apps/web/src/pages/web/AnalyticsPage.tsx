import { useEffect, useState } from 'react';
import { Activity, RefreshCw, Target, TrendingUp, Users } from 'lucide-react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import {
  analyticsApi,
  type AnalyticsOverview,
  type StudentAnalytics,
} from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { useAppStore } from '../../store/useAppStore';
import { formatDate, levelLabel, percent, triageLabel } from '../../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  LineController,
  RadarController,
  Filler,
  Tooltip,
  Legend,
);

const RADAR_KEYS = [
  ['stabilize', '身体稳定'],
  ['efficiency', '视觉效率'],
  ['perception', '视觉感知'],
  ['integration', '运动整合'],
  ['adaptation', '适应应用'],
  ['transfer', '生活迁移'],
] as const;

export function AnalyticsPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const showToast = useAppStore((state) => state.showToast);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [student, setStudent] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [overviewData, studentData] = await Promise.all([
        analyticsApi.overview(),
        activeStudentId ? analyticsApi.student(activeStudentId) : Promise.resolve(null),
      ]);
      setOverview(overviewData);
      setStudent(studentData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId]);

  const trend = student?.accuracyTrend ?? [];

  const trendData = {
    labels: trend.map((item) => item.date.slice(5)),
    datasets: [
      {
        label: '正确率',
        data: trend.map((item) => Math.round(item.accuracyRate * 100)),
        borderColor: '#0F4C5C',
        backgroundColor: 'rgba(15,76,92,0.12)',
        pointBackgroundColor: '#0F4C5C',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const trendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
        },
        grid: { color: '#e2e8f0' },
      },
      x: { grid: { display: false } },
    },
  };

  const radarData = {
    labels: RADAR_KEYS.map(([, label]) => label),
    datasets: [
      {
        label: '六维能力',
        data: RADAR_KEYS.map(([key]) => student?.radarScores?.[key] ?? 0),
        backgroundColor: 'rgba(15,76,92,0.18)',
        borderColor: '#0F4C5C',
        borderWidth: 2,
        pointBackgroundColor: '#0F4C5C',
      },
    ],
  };

  const radarOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
          color: '#94a3b8',
        },
        grid: { color: '#e2e8f0' },
        angleLines: { color: '#e2e8f0' },
        pointLabels: { color: '#475569', font: { size: 10 } },
      },
    },
  };

  return (
    <div>
      <PageHeader
        title="数据画像与眼动热力图"
        description="全员能力分布、六维雷达、正确率趋势与数字训练时长"
        actions={
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw className="mr-1 inline h-4 w-4" />
            刷新
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="全员学生" value={overview?.totalStudents ?? '…'} icon={Users} tone="teal" />
        <StatCard label="已完成课次" value={overview?.finishedSessions ?? '…'} icon={Activity} tone="sky" />
        <StatCard label="平均正确率" value={overview ? percent(overview.averageAccuracy) : '…'} icon={Target} tone="amber" />
        <StatCard label="当前学生完成作业" value={student?.completedHomework ?? '…'} icon={TrendingUp} tone="rose" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">全员能力分布</h2>
          <div className="mt-4 space-y-3">
            {overview
              ? Object.entries(overview.levelDistribution).map(([level, count]) => {
                  const max = Math.max(1, ...Object.values(overview.levelDistribution));
                  return (
                    <div key={level}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-600">{levelLabel(level)}</span>
                        <span className="font-mono text-slate-500">{count} 人</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-[#0F4C5C]"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {overview
              ? Object.entries(overview.triageDistribution).map(([status, count]) => (
                  <span key={status} className="badge bg-slate-100 text-slate-700">
                    {triageLabel(status)}：{count}
                  </span>
                ))
              : null}
          </div>
        </section>

        <section className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-bold text-slate-800">当前学生正确率趋势</h2>
          {trend.length === 0 ? (
            <div className="mt-8 text-center text-xs text-slate-400">
              暂无已结课记录
            </div>
          ) : (
            <div className="mt-2 h-56">
              <Line data={trendData} options={trendOptions} />
            </div>
          )}
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">六维能力雷达</h2>
          <div className="mx-auto mt-2 h-64 w-full max-w-xs">
            <Radar data={radarData} options={radarOptions} />
          </div>
          {Object.keys(student?.radarScores ?? {}).length === 0 && (
            <p className="text-center text-[11px] text-slate-400">
              暂无六维评估数据，保存评估记录后显示
            </p>
          )}
        </section>

        <section className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-bold text-slate-800">数字训练时长</h2>
          <div className="mt-4 flex h-40 items-end gap-3">
            {(student?.digitalTrend ?? []).length === 0 && (
              <div className="w-full text-center text-xs text-slate-400">暂无数据</div>
            )}
            {(student?.digitalTrend ?? []).map((item, index) => (
              <div key={`${item.date}-${index}`} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-[10px] text-slate-500">{item.digitalDurationSec}s</div>
                <div className="flex h-28 w-full items-end rounded-lg bg-slate-100">
                  <div
                    className={
                      item.digitalDurationSec >= 900
                        ? 'w-full rounded-lg bg-rose-500'
                        : 'w-full rounded-lg bg-teal-600'
                    }
                    style={{
                      height: `${Math.max(4, Math.min(100, (item.digitalDurationSec / 900) * 100))}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-400">{item.date.slice(5)}</div>
              </div>
            ))}
          </div>
          {student?.levelHistory?.length ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-bold text-slate-700">定级历史</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {student.levelHistory.map((item) => (
                  <span key={item.id} className="badge bg-teal-50 text-teal-800">
                    {item.date} · {item.autoLevel ?? '—'}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section className="card mt-5">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800">最近课次</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-2">日期</th>
                <th className="px-4 py-2">学生</th>
                <th className="px-4 py-2">操作卡</th>
                <th className="px-4 py-2">正确率</th>
                <th className="px-4 py-2">数字时长</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.recentSessions ?? []).map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-2 text-slate-500">{formatDate(session.date)}</td>
                  <td className="px-4 py-2 font-semibold text-slate-700">{session.studentName}</td>
                  <td className="px-4 py-2 text-slate-600">{session.sopCardTitle}</td>
                  <td className="px-4 py-2 font-mono text-teal-700">{percent(session.accuracyRate)}</td>
                  <td className="px-4 py-2 text-slate-500">{session.digitalDurationSec}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading && <div className="mt-4 text-center text-xs text-slate-400">加载中…</div>}
    </div>
  );
}
