import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store/appStore';
import { formatDateTime } from '../utils/format';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useAppStore();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      addNotification({ type: 'error', message: 'Failed to load notifications' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markOne = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnreadCount((v) => Math.max(0, v - 1));
    } catch {
      addNotification({ type: 'error', message: 'Unable to mark notification as read' });
    }
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      addNotification({ type: 'success', message: 'All notifications marked as read' });
    } catch {
      addNotification({ type: 'error', message: 'Unable to mark all notifications as read' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Bell className="w-6 h-6" />Notification Center</h2>
          <p className="text-sm text-gray-500">{unreadCount} unread alerts</p>
        </div>
        <button className="btn-secondary" onClick={markAll}><CheckCheck className="w-4 h-4" />Mark all read</button>
      </div>

      <div className="card p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No notifications yet.</p>
        ) : notifications.map((n) => (
          <div key={n.id} className={`p-3 rounded-lg border ${n.is_read ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.is_read && <button className="btn-secondary text-xs" onClick={() => markOne(n.id)}>Mark read</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
