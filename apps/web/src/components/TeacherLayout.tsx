import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppStore } from '../store/useAppStore';
import { AnalyticsPage } from '../pages/web/AnalyticsPage';
import { AssessmentPage } from '../pages/web/AssessmentPage';
import { HomePage } from '../pages/web/HomePage';
import { HomeschoolPage } from '../pages/web/HomeschoolPage';
import { IepPage } from '../pages/web/IepPage';
import { LibraryPage } from '../pages/web/LibraryPage';
import { SessionPage } from '../pages/web/SessionPage';
import { SettingsPage } from '../pages/web/SettingsPage';
import { StudentsPage } from '../pages/web/StudentsPage';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

function renderPage(page: string) {
  switch (page) {
    case 'students':
      return <StudentsPage />;
    case 'assessment':
      return <AssessmentPage />;
    case 'iep':
      return <IepPage />;
    case 'session':
      return <SessionPage />;
    case 'analytics':
      return <AnalyticsPage />;
    case 'homeschool':
      return <HomeschoolPage />;
    case 'library':
      return <LibraryPage />;
    case 'settings':
      return <SettingsPage />;
    case 'home':
    default:
      return <HomePage />;
  }
}

export function TeacherLayout() {
  const { page = 'home' } = useParams();
  const setWebPage = useAppStore((state) => state.setWebPage);
  const setTeacherSwitchStudent = useAppStore(
    (state) => state.setTeacherSwitchStudent,
  );
  const setTeacherEmitAssessmentCard = useAppStore(
    (state) => state.setTeacherEmitAssessmentCard,
  );
  // 教师 socket 只在布局里建一次，子页面切换不重建连接；
  // 选学生事件由 StudentSelector 经 store 里的发送槽发出，
  // 评估题卡出示由评估中心第 4 步经另一个发送槽发出。
  const { emitSwitchStudent, emitAssessmentCardChange } = useWebSocket({
    role: 'therapist',
    studentId: '',
  });

  useEffect(() => {
    setWebPage(page);
  }, [page, setWebPage]);

  useEffect(() => {
    setTeacherSwitchStudent((studentId: string) => {
      emitSwitchStudent({ event: 'SWITCH_STUDENT', studentId });
    });
    return () => setTeacherSwitchStudent(null);
  }, [emitSwitchStudent, setTeacherSwitchStudent]);

  useEffect(() => {
    setTeacherEmitAssessmentCard(emitAssessmentCardChange);
    return () => setTeacherEmitAssessmentCard(null);
  }, [emitAssessmentCardChange, setTeacherEmitAssessmentCard]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-5 lg:p-6">{renderPage(page)}</main>
      </div>
    </div>
  );
}
