import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import { DataTable, Pagination } from '../components/DataTable';
import Modal from '../components/Modal';
import { useAppStore } from '../store/appStore';
import { formatCurrency } from '../utils/format';

const emptyForm = { name: '', sku: '', description: '', price: '', cost: '', stock: '', low_stock_at: '10', category_id: '', is_active: true };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { addNotification, showConfirm, settings } = useAppStore();
  const symbol = settings?.currency_symbol || '$';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', { params: { search, page, limit: 20, low_stock: lowStockOnly || undefined } });
      setProducts(data.products);
      setTotal(data.total);
      setCategories(data.categories);
    } catch {
      addNotification({ type: 'error', message: 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  }, [search, page, lowStockOnly]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => { setSelected(null); setForm(emptyForm); setModal('create'); };
  const openEdit = (p) => {
    setSelected(p);
    setForm({ name: p.name, sku: p.sku || '', description: p.description || '', price: p.price, cost: p.cost, stock: p.stock, low_stock_at: p.low_stock_at, category_id: p.category_id || '', is_active: p.is_active === 1 });
    setModal('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/products', form);
        addNotification({ type: 'success', message: 'Product created' });
      } else {
        await api.put(`/products/${selected.id}`, form);
        addNotification({ type: 'success', message: 'Product updated' });
      }
      setModal(null);
      fetchProducts();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    const confirmed = await showConfirm({ title: 'Delete Product', message: `Delete "${p.name}"? This cannot be undone.` });
    if (!confirmed) return;
    try {
      await api.delete(`/products/${p.id}`);
      addNotification({ type: 'success', message: 'Product deleted' });
      fetchProducts();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    }
  };

  const columns = [
    {
      key: 'name', label: 'Product', render: (v, row) => (
        <div>
          <p className="font-medium">{v}</p>
          <p className="text-xs text-gray-400">{row.sku || '—'}</p>
        </div>
      )
    },
    { key: 'category_name', label: 'Category', render: v => v || '—' },
    { key: 'price', label: 'Price', render: v => formatCurrency(v, symbol) },
    { key: 'cost', label: 'Cost', render: v => formatCurrency(v, symbol) },
    {
      key: 'stock', label: 'Stock', render: (v, row) => (
        <div className="flex items-center gap-1">
          {v <= row.low_stock_at && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
          <span className={v <= row.low_stock_at ? 'text-yellow-600 dark:text-yellow-400 font-medium' : ''}>{v}</span>
        </div>
      )
    },
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} products</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" />Add Product</button>
      </div>

      <div className="card p-4 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="rounded" />
          Low stock only
        </label>
      </div>

      <div className="card">
        <DataTable columns={columns} data={products} loading={loading} emptyMessage="No products found" />
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
        </div>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Product' : 'Edit Product'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price *</label>
              <input className="input" type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cost</label>
              <input className="input" type="number" step="0.01" min="0" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} />
            </div>
            <div>
              <label className="label">Stock</label>
              <input className="input" type="number" min="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
            </div>
            <div>
              <label className="label">Low Stock At</label>
              <input className="input" type="number" min="0" value={form.low_stock_at} onChange={e => setForm(p => ({ ...p, low_stock_at: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            {modal === 'edit' && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Active</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>Save Product</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
