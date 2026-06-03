import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store/appStore';
import { formatDateTime } from '../utils/format';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useAppStore();

  useEffect(() => {
    api.get('/audit', { params: { limit: 100 } })
      .then((r) => setLogs(r.data.logs || []))
      .catch(() => addNotification({ type: 'error', message: 'Failed to load audit logs' }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><ShieldCheck className="w-6 h-6" />Audit Logs</h2>
        <p className="text-sm text-gray-500">Track user activity for compliance and oversight</p>
      </div>

      <div className="card p-4 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No logs available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2 pr-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="py-2 pr-4">{log.user_name || 'System'}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{log.action}</td>
                  <td className="py-2 pr-4">{log.entity_type}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">{log.metadata || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
