import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit2, Trash2, Search } from 'lucide-react';
import api from '../api/axios';
import { DataTable, Pagination } from '../components/DataTable';
import Modal from '../components/Modal';
import { useAppStore } from '../store/appStore';
import { formatCurrency, formatDate } from '../utils/format';

const emptyForm = { name: '', email: '', phone: '', address: '', notes: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { addNotification, showConfirm, settings } = useAppStore();
  const symbol = settings?.currency_symbol || '$';

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: { search, page, limit: 20 } });
      setCustomers(data.customers);
      setTotal(data.total);
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to load customers' });
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (c) => { setSelected(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', notes: c.notes || '' }); setModal('edit'); };
  const openView = async (c) => {
    try {
      const { data } = await api.get(`/customers/${c.id}`);
      setSelected(data);
      setModal('view');
    } catch { addNotification({ type: 'error', message: 'Failed to load customer details' }); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/customers', form);
        addNotification({ type: 'success', message: 'Customer created' });
      } else {
        await api.put(`/customers/${selected.id}`, form);
        addNotification({ type: 'success', message: 'Customer updated' });
      }
      setModal(null);
      fetchCustomers();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    const confirmed = await showConfirm({ title: 'Delete Customer', message: `Delete "${c.name}"? This cannot be undone.` });
    if (!confirmed) return;
    try {
      await api.delete(`/customers/${c.id}`);
      addNotification({ type: 'success', message: 'Customer deleted' });
      fetchCustomers();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v, row) => <button className="text-primary-600 hover:underline font-medium" onClick={() => openView(row)}>{v}</button> },
    { key: 'phone', label: 'Phone', render: v => v || '—' },
    { key: 'email', label: 'Email', render: v => v || '—' },
    { key: 'total_spent', label: 'Total Spent', render: v => formatCurrency(v, symbol) },
    { key: 'created_at', label: 'Joined', render: v => formatDate(v) },
    {
      key: 'id', label: 'Actions', render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => openView(row)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Eye className="w-4 h-4" /></button>
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-yellow-500 rounded"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(row)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customers</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} total customers</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Customer</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={customers} loading={loading} emptyMessage="No customers found" />
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Customer' : 'Edit Customer'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>Save Customer</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {selected && (
        <Modal isOpen={modal === 'view'} onClose={() => setModal(null)} title="Customer Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[['Name', selected.name], ['Phone', selected.phone || '—'], ['Email', selected.email || '—'], ['Address', selected.address || '—'], ['Total Spent', formatCurrency(selected.total_spent, symbol)], ['Joined', formatDate(selected.created_at)]].map(([k, v]) => (
                <div key={k}>
                  <p className="label">{k}</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{v}</p>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div>
                <p className="label">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selected.notes}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button className="btn-secondary" onClick={() => openEdit(selected)}>Edit</button>
              <button className="btn-danger" onClick={() => { setModal(null); handleDelete(selected); }}>Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
