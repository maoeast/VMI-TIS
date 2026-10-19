import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  MessageCircle,
  TrendingUp,
  Video,
} from 'lucide-react';
import type { HomeworkCheckin } from '@vmi-tis/shared-types';
import { Header } from '../../components/Header';
import { homeworkApi, studentApi, type StudentDetail } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { levelLabel } from '../../utils/format';
import { ChatTab } from './ChatTab';
import { ProgressTab } from './ProgressTab';
import { TasksTab } from './TasksTab';
import { VideosTab } from './VideosTab';

type ParentTab = 'task' | 'video' | 'growth' | 'chat';

const TABS: Array<{
  key: ParentTab;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { key: 'task', label: '今日任务', icon: ClipboardList },
  { key: 'video', label: '视频打卡', icon: Video },
  { key: 'growth', label: '成长曲线', icon: TrendingUp },
  { key: 'chat', label: '家校留言', icon: MessageCircle },
];

export function ParentAppPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const [tab, setTab] = useState<ParentTab>('task');
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [homework, setHomework] = useState<HomeworkCheckin[]>([]);

  const load = useCallback(async () => {
    if (!activeStudentId) return;
    try {
      const [detail, items] = await Promise.all([
        studentApi.get(activeStudentId),
        homeworkApi.list(activeStudentId),
      ]);
      setStudent(detail);
      setHomework(items);
    } catch {
      // 后端未启动时由页面空状态提示。
    }
  }, [activeStudentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-200 to-slate-100">
      <Header />
      <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-white shadow-2xl">
        <div className="bg-[#0F4C5C] px-5 py-4 text-white">
          <div className="text-[11px] text-teal-100/80">家长端 · 微信小程序</div>
          <div className="mt-1 text-lg font-bold">
            {student?.name ?? '请选择学生'}
          </div>
          <div className="text-[11px] text-teal-100/80">
            {student
              ? `${levelLabel(student.currentLevel)} · ${student.schoolScene}`
              : '在顶部选择一名学生'}
          </div>
        </div>

        <div className="h-[560px] overflow-y-auto bg-slate-50 p-4">
          {tab === 'task' && (
            <TasksTab homework={homework} onRefresh={load} />
          )}
          {tab === 'video' && <VideosTab homework={homework} />}
          {tab === 'growth' && <ProgressTab studentId={activeStudentId} />}
          {tab === 'chat' && (
            <ChatTab
              homework={homework}
              studentName={student?.name}
              onRefresh={load}
            />
          )}
        </div>

        <nav className="grid grid-cols-4 border-t border-slate-200 bg-white">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={
                  tab === item.key
                    ? 'flex flex-col items-center gap-1 py-3 text-[11px] font-bold text-[#0F4C5C]'
                    : 'flex flex-col items-center gap-1 py-3 text-[11px] font-medium text-slate-400'
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
