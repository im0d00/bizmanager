import { useState, useEffect } from 'react';
import { Save, Building2, Download, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store/appStore';

export default function Settings() {
  const [form, setForm] = useState({
    business_name: '', address: '', phone: '', email: '',
    currency: 'USD', currency_symbol: '$', tax_rate: '0', tax_name: 'Tax',
    invoice_prefix: 'INV-', low_stock_threshold: '10'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const { addNotification, setSettings } = useAppStore();

  useEffect(() => {
    api.get('/settings').then(r => {
      setForm(prev => ({ ...prev, ...r.data }));
      setSettings(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings', form);
      setSettings(data);
      addNotification({ type: 'success', message: 'Settings saved' });
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await api.get('/backup/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `bizmanager-backup-${ts}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addNotification({ type: 'success', message: 'Backup downloaded' });
    } catch (err) {
      addNotification({ type: 'error', message: 'Backup failed' });
    } finally {
      setBackupLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="text-sm text-gray-500">Configure your business settings</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Information */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary-600" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Business Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Business Name</label>
              <input className="input" {...f('business_name')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...f('phone')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...f('email')} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input" {...f('address')} />
            </div>
          </div>
        </div>

        {/* Currency & Tax */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Currency & Tax</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Currency Code</label>
              <input className="input" {...f('currency')} placeholder="USD" />
            </div>
            <div>
              <label className="label">Currency Symbol</label>
              <input className="input" {...f('currency_symbol')} placeholder="$" />
            </div>
            <div>
              <label className="label">Tax Name</label>
              <input className="input" {...f('tax_name')} placeholder="Tax" />
            </div>
            <div>
              <label className="label">Tax Rate (%)</label>
              <input className="input" type="number" step="0.01" min="0" {...f('tax_rate')} />
            </div>
          </div>
        </div>

        {/* Invoice & Inventory */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Invoice & Inventory</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Prefix</label>
              <input className="input" {...f('invoice_prefix')} placeholder="INV-" />
            </div>
            <div>
              <label className="label">Low Stock Threshold</label>
              <input className="input" type="number" min="0" {...f('low_stock_threshold')} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </form>

      {/* Backup */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Database Backup</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download a complete backup of your database. Store it in a safe location.
        </p>
        <button className="btn-secondary" onClick={handleBackup} disabled={backupLoading}>
          {backupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download Backup
        </button>
      </div>
    </div>
  );
}
