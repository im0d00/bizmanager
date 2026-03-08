import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import api from '../api/axios';
import { DataTable, Pagination } from '../components/DataTable';
import Modal from '../components/Modal';
import { useAppStore } from '../store/appStore';
import { formatCurrency, formatDate } from '../utils/format';

const emptyForm = { name: '', email: '', phone: '', role: 'employee', department: '', salary: '', hire_date: '', notes: '', create_user: false, password: '', is_active: true };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
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

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/employees', { params: { search, page, limit: 20 } });
      setEmployees(data.employees);
      setTotal(data.total);
    } catch {
      addNotification({ type: 'error', message: 'Failed to load employees' });
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const openCreate = () => { setSelected(null); setForm(emptyForm); setModal('create'); };
  const openEdit = (e) => {
    setSelected(e);
    setForm({ name: e.name, email: e.email || '', phone: e.phone || '', role: e.role, department: e.department || '', salary: e.salary, hire_date: e.hire_date || '', notes: e.notes || '', create_user: false, password: '', is_active: e.is_active === 1 });
    setModal('edit');
  };

  const roleBadge = (role) => {
    const map = { admin: 'badge-red', manager: 'badge-blue', employee: 'badge-gray' };
    return <span className={map[role] || 'badge-gray'}>{role}</span>;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/employees', form);
        addNotification({ type: 'success', message: 'Employee added' });
      } else {
        await api.put(`/employees/${selected.id}`, form);
        addNotification({ type: 'success', message: 'Employee updated' });
      }
      setModal(null);
      fetchEmployees();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    const confirmed = await showConfirm({ title: 'Delete Employee', message: `Delete "${e.name}"?` });
    if (!confirmed) return;
    try {
      await api.delete(`/employees/${e.id}`);
      addNotification({ type: 'success', message: 'Employee deleted' });
      fetchEmployees();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    }
  };

  const columns = [
    {
      key: 'name', label: 'Name', render: (v, row) => (
        <div>
          <p className="font-medium">{v}</p>
          <p className="text-xs text-gray-400">{row.department || '—'}</p>
        </div>
      )
    },
    { key: 'role', label: 'Role', render: v => roleBadge(v) },
    { key: 'phone', label: 'Phone', render: v => v || '—' },
    { key: 'email', label: 'Email', render: v => v || '—' },
    { key: 'salary', label: 'Salary', render: v => <span>{formatCurrency(v, symbol)}/mo</span> },
    { key: 'hire_date', label: 'Hired', render: v => v ? formatDate(v) : '—' },
    { key: 'is_active', label: 'Status', render: v => <span className={v ? 'badge-green' : 'badge-gray'}>{v ? 'Active' : 'Inactive'}</span> },
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Employees</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} employees</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Employee</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={employees} loading={loading} emptyMessage="No employees found" />
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Employee' : 'Edit Employee'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
            </div>
            <div>
              <label className="label">Salary</label>
              <input className="input" type="number" step="0.01" min="0" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} />
            </div>
            <div>
              <label className="label">Hire Date</label>
              <input className="input" type="date" value={form.hire_date} onChange={e => setForm(p => ({ ...p, hire_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            {modal === 'edit' && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Active</span>
                </label>
              </div>
            )}
            {modal === 'create' && (
              <div className="col-span-2 border-t dark:border-gray-700 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.create_user} onChange={e => setForm(p => ({ ...p, create_user: e.target.checked }))} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Create login account</span>
                </label>
                {form.create_user && (
                  <div className="mt-2">
                    <label className="label">Password *</label>
                    <input className="input" type="password" minLength={6} required={form.create_user} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>Save Employee</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
