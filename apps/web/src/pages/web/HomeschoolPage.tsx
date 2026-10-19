import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { HomeworkCheckin } from '@vmi-tis/shared-types';
import { homeworkApi } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { useAppStore } from '../../store/useAppStore';
import {
  formatDate,
  formatDateTime,
} from '../../utils/format';

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待打卡',
  COMPLETED: '已完成',
  OVERDUE: '已逾期',
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  OVERDUE: 'bg-rose-100 text-rose-800',
};

export function HomeschoolPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const showToast = useAppStore((state) => state.showToast);
  const [items, setItems] = useState<HomeworkCheckin[]>([]);
  const [taskName, setTaskName] = useState('找袜子（家庭泛化）');
  const [durationMin, setDurationMin] = useState(10);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!activeStudentId) return;
    setLoading(true);
    try {
      setItems(await homeworkApi.list(activeStudentId));
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

  const createHomework = async () => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    try {
      await homeworkApi.create({
        studentId: activeStudentId,
        taskName: taskName.trim(),
        durationMin,
      });
      showToast('家庭作业已布置', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const simulateCheckin = async (item: HomeworkCheckin) => {
    try {
      await homeworkApi.checkin(item.id, {
        videoUrl: '/uploads/demo-checkin.mp4',
        videoDurationSec: 42,
        parentNote: '家长模拟打卡：今天完成了家庭练习。',
      });
      showToast('家长打卡已提交', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const reply = async (item: HomeworkCheckin) => {
    const text = replies[item.id]?.trim();
    if (!text) {
      showToast('请输入点评内容', 'error');
      return;
    }
    try {
      await homeworkApi.reply(item.id, text);
      showToast('教师点评已保存', 'success');
      setReplies((prev) => ({ ...prev, [item.id]: '' }));
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const cleanVideos = async () => {
    try {
      const result = await homeworkApi.cleanVideos();
      showToast(
        `清理完成：扫描 ${result.scanned} 条，标记 ${result.cleaned} 条，删除文件 ${result.deletedFiles} 个`,
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
        title="家校作业打卡"
        description="家庭泛化任务、视频打卡、教师点评与 7 天过期清理"
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

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-64 flex-1 text-xs font-semibold text-slate-600">
          任务名称
          <input value={taskName} onChange={(event) => setTaskName(event.target.value)} className="input mt-1" />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          建议时长（分钟）
          <input type="number" min={1} max={120} value={durationMin} onChange={(event) => setDurationMin(Number(event.target.value))} className="input mt-1 w-28" />
        </label>
        <button type="button" className="btn-primary" onClick={() => void createHomework()}>
          <Plus className="mr-1 inline h-4 w-4" />
          布置家庭作业
        </button>
      </div>

      <div className="space-y-3">
        {loading && <div className="card p-6 text-sm text-slate-400">加载中…</div>}
        {!loading && items.length === 0 && (
          <div className="card p-8 text-center text-sm text-slate-400">
            当前学生还没有家庭作业记录
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-800">{item.taskName}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  布置 {formatDate(item.assignedDate)} · 截止 {formatDate(item.dueDate)} · 建议 {item.durationMin ?? 10} 分钟
                </div>
              </div>
              <span className={`badge ${STATUS_CLASSES[item.status] ?? 'bg-slate-100 text-slate-700'}`}>
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 lg:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-2.5">
                <div className="font-semibold text-slate-700">家长打卡</div>
                <div className="mt-1">
                  {item.submittedAt
                    ? `${formatDateTime(item.submittedAt)} · ${item.parentNote ?? '无留言'}`
                    : '尚未打卡'}
                </div>
                {item.videoUrl && (
                  <div className="mt-1 font-mono text-[11px] text-slate-500">
                    视频：{item.videoUrl} {item.videoDeletedAt ? '（已过期清理）' : ''}
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-teal-50/70 p-2.5">
                <div className="font-semibold text-teal-900">教师点评</div>
                <div className="mt-1 text-teal-800">
                  {item.teacherReply ?? '暂无点评'}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.status === 'PENDING' && (
                <button type="button" className="btn-secondary text-xs" onClick={() => void simulateCheckin(item)}>
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                  模拟家长打卡
                </button>
              )}
              <input
                value={replies[item.id] ?? ''}
                onChange={(event) =>
                  setReplies((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
                placeholder="填写教师点评…"
                className="input max-w-md flex-1 text-xs"
              />
              <button type="button" className="btn-primary text-xs" onClick={() => void reply(item)}>
                保存点评
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
