import { useEffect, useState } from 'react';
import type { Student } from '@vmi-tis/shared-types';
import { studentApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { levelLabel } from '../utils/format';

export function StudentSelector() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const setActiveStudent = useAppStore((state) => state.setActiveStudent);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      studentApi
        .list({ pageSize: 200 })
        .then((response) => {
          if (cancelled) return;
          setStudents(response.items);
          if (!activeStudentId && response.items[0]) {
            setActiveStudent(response.items[0].id);
          }
        })
        .catch(() => {
          // 后端可能比前端晚启动，最多重试 4 次。
          if (!cancelled && attempts < 4) {
            attempts += 1;
            timer = setTimeout(load, 1500);
          }
        });
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // 只在首次挂载时加载；切换学生不重新拉列表。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="flex items-center gap-2 text-xs text-teal-100">
      <span className="hidden sm:inline">当前学生</span>
      <select
        value={activeStudentId ?? ''}
        onChange={(event) => setActiveStudent(event.target.value || null)}
        className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-teal-300"
      >
        {students.length === 0 && <option value="">暂无学生</option>}
        {students.map((student) => (
          <option key={student.id} value={student.id} className="text-slate-800">
            {student.name} · {student.studentCode} · {levelLabel(student.currentLevel)}
          </option>
        ))}
      </select>
    </label>
  );
}
