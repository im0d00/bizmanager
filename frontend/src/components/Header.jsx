import { Menu, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

export default function Header() {
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode, sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
          <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-gray-700 dark:text-gray-200 font-medium">
          Welcome back, <span className="text-primary-600 font-semibold">{user?.name}</span>
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
