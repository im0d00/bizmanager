import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function ConfirmModal() {
  const { confirm } = useAppStore();
  if (!confirm) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{confirm.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{confirm.message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={confirm.onCancel} className="btn-secondary">Cancel</button>
          <button onClick={confirm.onConfirm} className="btn-danger">Confirm</button>
        </div>
      </div>
    </div>
  );
}
