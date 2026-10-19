import { useState } from 'react';
import { Send } from 'lucide-react';
import type { HomeworkCheckin } from '@vmi-tis/shared-types';
import { homeworkApi } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

interface ChatTabProps {
  homework: HomeworkCheckin[];
  studentName?: string;
  onRefresh: () => Promise<void>;
}

export function ChatTab({ homework, studentName, onRefresh }: ChatTabProps) {
  const showToast = useAppStore((state) => state.showToast);
  const [message, setMessage] = useState('');
  const latest = homework[0];

  const send = async () => {
    if (!latest || !message.trim()) {
      showToast('请输入留言内容', 'error');
      return;
    }
    try {
      await homeworkApi.parentMessage(latest.id, message.trim());
      setMessage('');
      showToast('留言已发送至医教团队', 'success');
      await onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-800">家校留言</div>
        <p className="mt-1 text-xs text-slate-500">
          留言会同步至周敏治疗师与医教多学科团队。
        </p>
      </div>

      {!latest && (
        <div className="rounded-2xl bg-white p-6 text-center text-xs text-slate-400">
          暂无留言记录
        </div>
      )}

      {latest && (
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">
            关于：{latest.taskName}
          </div>
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal-50 px-3 py-2 text-xs text-teal-900">
              <div className="text-[10px] font-bold text-teal-700">
                {studentName ? `${studentName}妈妈` : '家长'}
              </div>
              {latest.parentNote ?? '今天完成了家庭练习。'}
            </div>
          </div>
          {latest.teacherReply && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-xs text-slate-700">
                <div className="text-[10px] font-bold text-slate-500">周敏 (OT)</div>
                {latest.teacherReply}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void send();
          }}
          placeholder="输入留言…"
          className="input text-xs"
        />
        <button type="button" className="btn-primary px-3" onClick={() => void send()}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
