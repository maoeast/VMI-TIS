import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Student } from '@vmi-tis/shared-types';
import { studentApi } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { levelLabel } from '../utils/format';

export function StudentSelector() {
  const location = useLocation();
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const setActiveStudent = useAppStore((state) => state.setActiveStudent);
  const teacherSwitchStudent = useAppStore(
    (state) => state.teacherSwitchStudent,
  );
  const studentsVersion = useAppStore((state) => state.studentsVersion);
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
    // 首次挂载加载；新建/导入/删除学生后通过 studentsVersion 触发刷新。
    // 切换学生本身不重新拉列表。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentsVersion]);

  return (
    <label className="flex items-center gap-2 text-xs text-teal-100">
      <span className="hidden sm:inline">当前学生</span>
      <select
        value={activeStudentId ?? ''}
        onChange={(event) => {
          const nextId = event.target.value || null;
          // 本地先生效：学生端/家长端的这个下拉框只改本窗口当前学生。
          setActiveStudent(nextId);
          // 只有教师工作台把选择广播出去；发送槽为 null（无教师 socket）时静默跳过。
          if (nextId && location.pathname.startsWith('/web')) {
            teacherSwitchStudent?.(nextId);
          }
        }}
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
