import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, ShoppingCart, Receipt,
  UserCheck, BarChart2, Settings, Building2, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'employee'] },
  { to: '/customers', icon: Users, label: 'Customers', roles: ['admin', 'manager', 'employee'] },
  { to: '/products', icon: Package, label: 'Inventory', roles: ['admin', 'manager'] },
  { to: '/sales', icon: ShoppingCart, label: 'Sales', roles: ['admin', 'manager', 'employee'] },
  { to: '/expenses', icon: Receipt, label: 'Expenses', roles: ['admin', 'manager'] },
  { to: '/employees', icon: UserCheck, label: 'Employees', roles: ['admin', 'manager'] },
  { to: '/reports', icon: BarChart2, label: 'Reports', roles: ['admin', 'manager'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] }
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const navigate = useNavigate();

  const filtered = navItems.filter(item => user && item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 flex-shrink-0`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
        <div className="flex items-center gap-2 overflow-hidden">
          <Building2 className="w-7 h-7 text-blue-400 flex-shrink-0" />
          {sidebarOpen && <span className="font-bold text-lg whitespace-nowrap">BizManager</span>}
        </div>
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-white p-1 rounded flex-shrink-0">
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {filtered.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-4">
        {sidebarOpen ? (
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 p-1 rounded" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 p-1 rounded w-full flex justify-center" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
