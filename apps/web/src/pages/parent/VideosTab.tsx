import { Play, ShieldCheck, Video } from 'lucide-react';
import type { HomeworkCheckin } from '@vmi-tis/shared-types';
import { resolveApiUrl } from '../../api/client';
import { formatDate } from '../../utils/format';

interface VideosTabProps {
  homework: HomeworkCheckin[];
}

export function VideosTab({ homework }: VideosTabProps) {
  const completed = homework.filter((item) => item.status === 'COMPLETED');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-800">视频打卡记录</div>
        <p className="mt-1 text-xs text-slate-500">
          上传后 7 天自动清理视频文件，文字记录与教师点评永久保留。
        </p>
      </div>

      {completed.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-center text-xs text-slate-400">
          还没有视频打卡记录
        </div>
      )}

      {completed.map((item) => (
        <div key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {item.videoUrl && !item.videoDeletedAt ? (
            <video
              controls
              preload="metadata"
              className="h-40 w-full bg-black object-contain"
              src={resolveApiUrl(item.videoUrl)}
            />
          ) : (
            <div className="relative flex h-40 items-center justify-center bg-slate-900">
              <Video className="h-10 w-10 text-slate-600" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white">
                  <Play className="h-5 w-5" />
                </div>
              </div>
              <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                {item.videoDeletedAt ? '视频已过期清理' : '暂无视频'}
              </span>
            </div>
          )}
          <div className="p-3">
            <div className="text-xs font-bold text-slate-800">{item.taskName}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              打卡 {formatDate(item.submittedAt ?? item.assignedDate)} ·{' '}
              {item.videoDurationSec ?? 0} 秒
            </div>
            {item.parentNote && (
              <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                家长留言：{item.parentNote}
              </div>
            )}
            {item.teacherReply && (
              <div className="mt-1 rounded-lg bg-teal-50 p-2 text-[11px] text-teal-900">
                治疗师点评：{item.teacherReply}
              </div>
            )}
            <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              医疗数据仅限医教团队与家长查看
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
