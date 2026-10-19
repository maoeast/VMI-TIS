import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  analyticsApi,
  type StudentAnalytics,
} from '../../api/client';
import { percent } from '../../utils/format';

interface ProgressTabProps {
  studentId: string | null;
}

export function ProgressTab({ studentId }: ProgressTabProps) {
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    analyticsApi
      .student(studentId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (error) {
    return <div className="rounded-2xl bg-white p-4 text-xs text-rose-700">{error}</div>;
  }

  if (!data) {
    return <div className="rounded-2xl bg-white p-4 text-xs text-slate-400">加载成长数据…</div>;
  }

  const trend = data.accuracyTrend;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-800">阶段成长</div>
            <div className="mt-1 text-xs text-slate-500">
              当前层级 {data.student.currentLevel} · 已完成 {data.finishedSessions} 次课
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-[10px] text-slate-400">平均正确率</div>
            <div className="text-sm font-bold text-teal-700">
              {percent(data.averageAccuracy)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-[10px] text-slate-400">累计课次</div>
            <div className="text-sm font-bold text-slate-700">{data.totalSessions}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-[10px] text-slate-400">家庭打卡</div>
            <div className="text-sm font-bold text-slate-700">{data.completedHomework}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-800">最近正确率</div>
        <div className="mt-3 flex h-32 items-end gap-2">
          {trend.length === 0 && (
            <div className="w-full text-center text-xs text-slate-400">暂无课次数据</div>
          )}
          {trend.map((item, index) => (
            <div key={`${item.date}-${index}`} className="flex flex-1 flex-col items-center gap-1">
              <div className="text-[10px] font-semibold text-teal-700">
                {percent(item.accuracyRate)}
              </div>
              <div className="flex h-20 w-full items-end rounded-lg bg-slate-100">
                <div
                  className="w-full rounded-lg bg-[#0F4C5C]"
                  style={{ height: `${Math.max(6, item.accuracyRate * 100)}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-400">{item.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-800">定级变化</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.levelHistory.length === 0 && (
            <span className="text-xs text-slate-400">暂无评估记录</span>
          )}
          {data.levelHistory.map((item) => (
            <span key={item.id} className="badge bg-teal-50 text-teal-800">
              {item.date} · {item.autoLevel ?? '—'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
