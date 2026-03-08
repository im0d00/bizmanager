import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationContainer from './NotificationContainer';
import ConfirmModal from './ConfirmModal';

export default function Layout() {
  const { isAuthenticated } = useAuthStore();
  const { sidebarOpen } = useAppStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <NotificationContainer />
      <ConfirmModal />
    </div>
  );
}
