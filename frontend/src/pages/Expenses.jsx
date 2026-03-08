import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import api from '../api/axios';
import { DataTable, Pagination } from '../components/DataTable';
import Modal from '../components/Modal';
import { useAppStore } from '../store/appStore';
import { formatCurrency, formatDate } from '../utils/format';

const CATEGORIES = ['General', 'Rent', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Equipment', 'Insurance', 'Maintenance', 'Other'];
const emptyForm = { title: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0], notes: '' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { addNotification, showConfirm, settings } = useAppStore();
  const symbol = settings?.currency_symbol || '$';

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses', { params: { search, page, limit: 20, category: filterCategory || undefined } });
      setExpenses(data.expenses);
      setTotal(data.total);
      setTotalAmount(data.totalAmount);
    } catch {
      addNotification({ type: 'error', message: 'Failed to load expenses' });
    } finally {
      setLoading(false);
    }
  }, [search, page, filterCategory]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const openCreate = () => { setSelected(null); setForm(emptyForm); setModal('create'); };
  const openEdit = (e) => {
    setSelected(e);
    setForm({ title: e.title, amount: e.amount, category: e.category, date: e.date, notes: e.notes || '' });
    setModal('edit');
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/expenses', form);
        addNotification({ type: 'success', message: 'Expense added' });
      } else {
        await api.put(`/expenses/${selected.id}`, form);
        addNotification({ type: 'success', message: 'Expense updated' });
      }
      setModal(null);
      fetchExpenses();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    const confirmed = await showConfirm({ title: 'Delete Expense', message: `Delete "${e.title}"?` });
    if (!confirmed) return;
    try {
      await api.delete(`/expenses/${e.id}`);
      addNotification({ type: 'success', message: 'Expense deleted' });
      fetchExpenses();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    }
  };

  const columns = [
    { key: 'title', label: 'Title', render: v => <span className="font-medium">{v}</span> },
    { key: 'category', label: 'Category', render: v => <span className="badge-blue">{v}</span> },
    { key: 'amount', label: 'Amount', render: v => <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(v, symbol)}</span> },
    { key: 'date', label: 'Date', render: v => formatDate(v) },
    {
      key: 'id', label: 'Actions', render: (_, row) => (
        <div className="flex gap-1">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expenses</h2>
          <p className="text-sm text-red-500 font-medium mt-0.5">Total: {formatCurrency(totalAmount, symbol)}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Expense</button>
      </div>

      <div className="card p-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search expenses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-48" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        <DataTable columns={columns} data={expenses} loading={loading} emptyMessage="No expenses found" />
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Expense' : 'Edit Expense'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount *</label>
              <input className="input" type="number" step="0.01" min="0" required value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>Save Expense</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
