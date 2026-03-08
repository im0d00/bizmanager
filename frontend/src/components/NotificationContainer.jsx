import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const configs = {
  success: { icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700', text: 'text-green-800 dark:text-green-200', icon_class: 'text-green-500' },
  error: { icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700', text: 'text-red-800 dark:text-red-200', icon_class: 'text-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-200', icon_class: 'text-yellow-500' },
  info: { icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200', icon_class: 'text-blue-500' }
};

export default function NotificationContainer() {
  const { notifications, removeNotification } = useAppStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.map(n => {
        const cfg = configs[n.type] || configs.info;
        const Icon = cfg.icon;
        return (
          <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${cfg.bg}`}>
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.icon_class}`} />
            <div className="flex-1 min-w-0">
              {n.title && <p className={`text-sm font-semibold ${cfg.text}`}>{n.title}</p>}
              <p className={`text-sm ${cfg.text}`}>{n.message}</p>
            </div>
            <button onClick={() => removeNotification(n.id)} className={`${cfg.text} opacity-60 hover:opacity-100`}>
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
