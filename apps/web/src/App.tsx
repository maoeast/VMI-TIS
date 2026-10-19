import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TeacherLayout } from './components/TeacherLayout';
import { Toast } from './components/Toast';
import { ParentAppPage } from './pages/parent/ParentAppPage';
import { StudentPadPage } from './pages/student/StudentPadPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/web/home" replace />} />
        <Route path="/web/:page" element={<TeacherLayout />} />
        <Route path="/student" element={<StudentPadPage />} />
        <Route path="/parent" element={<ParentAppPage />} />
        <Route path="*" element={<Navigate to="/web/home" replace />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}
