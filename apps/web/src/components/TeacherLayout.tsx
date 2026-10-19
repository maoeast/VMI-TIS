import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

  useEffect(() => {
    setWebPage(page);
  }, [page, setWebPage]);

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
