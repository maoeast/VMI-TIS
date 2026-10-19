import { useState } from 'react';
import { CheckCircle2, Clock, Video } from 'lucide-react';
import type { HomeworkCheckin } from '@vmi-tis/shared-types';
import { homeworkApi } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { formatDate } from '../../utils/format';

interface TasksTabProps {
  homework: HomeworkCheckin[];
  onRefresh: () => Promise<void>;
}

export function TasksTab({ homework, onRefresh }: TasksTabProps) {
  const showToast = useAppStore((state) => state.showToast);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const pending = homework.filter((item) => item.status !== 'COMPLETED');
  const completed = homework.filter((item) => item.status === 'COMPLETED');

  const uploadAndCheckin = async (item: HomeworkCheckin, file: File) => {
    setUploadingId(item.id);
    try {
      const uploaded = await homeworkApi.uploadVideo(item.id, file);
      await homeworkApi.checkin(item.id, {
        videoUrl: uploaded.videoUrl,
        videoDurationSec: 0,
        parentNote: '今天主动完成了家庭练习，上传了视频。',
      });
      showToast('视频已上传，打卡成功并同步给治疗师', 'success');
      await onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-slate-800">今日家庭任务</div>
          <span className="badge bg-amber-100 text-amber-800">
            {pending.length} 项待完成
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          每天 8–10 分钟，家长陪伴完成并在小程序打卡。
        </p>
      </div>

      {pending.map((item) => (
        <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-slate-800">{item.taskName}</div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                截止 {formatDate(item.dueDate)} · 建议 {item.durationMin ?? 10} 分钟
              </div>
            </div>
            <span className="badge bg-amber-100 text-amber-800">待打卡</span>
          </div>
          <label
            className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F4C5C] py-2.5 text-xs font-bold text-white ${
              uploadingId === item.id ? 'cursor-wait opacity-70' : ''
            }`}
          >
            <Video className="h-4 w-4" />
            {uploadingId === item.id ? '上传中…' : '上传视频并打卡'}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploadingId === item.id}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void uploadAndCheckin(item, file);
              }}
            />
          </label>
        </div>
      ))}

      {pending.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-center text-xs text-slate-400">
          今天的任务都完成了，真棒！
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-bold text-slate-500">已完成</div>
          <div className="space-y-2">
            {completed.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {item.taskName}
                  </div>
                  <span className="badge bg-emerald-100 text-emerald-800">已完成</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {formatDate(item.submittedAt ?? item.assignedDate)}
                  {item.parentNote ? ` · ${item.parentNote}` : ''}
                </div>
                {item.teacherReply && (
                  <div className="mt-2 rounded-lg bg-teal-50 p-2 text-[11px] text-teal-900">
                    治疗师：{item.teacherReply}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
