import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Trash2, Search, X, Printer } from 'lucide-react';
import api from '../api/axios';
import { DataTable, Pagination } from '../components/DataTable';
import Modal from '../components/Modal';
import { useAppStore } from '../store/appStore';
import { formatCurrency, formatDateTime } from '../utils/format';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [discount, setDiscount] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const { addNotification, showConfirm, settings } = useAppStore();
  const symbol = settings?.currency_symbol || '$';
  const taxRate = parseFloat(settings?.tax_rate) || 0;
  const taxName = settings?.tax_name || 'Tax';

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sales', { params: { search, page, limit: 20 } });
      setSales(data.sales);
      setTotal(data.total);
    } catch {
      addNotification({ type: 'error', message: 'Failed to load sales' });
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const openNewSale = async () => {
    const [cRes, pRes] = await Promise.all([
      api.get('/customers', { params: { limit: 100 } }),
      api.get('/products', { params: { limit: 200 } })
    ]);
    setCustomers(cRes.data.customers);
    setProducts(pRes.data.products);
    setCartItems([]);
    setSelectedCustomer('');
    setDiscount(0);
    setSaleNotes('');
    setProductSearch('');
    setProductResults([]);
    setModal('new');
  };

  const openView = async (sale) => {
    const { data } = await api.get(`/sales/${sale.id}`);
    setSaleDetail(data);
    setModal('view');
  };

  const handleProductSearch = (q) => {
    setProductSearch(q);
    if (!q) { setProductResults([]); return; }
    const results = products.filter(p =>
      (p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku || '').toLowerCase().includes(q.toLowerCase())) && p.is_active
    ).slice(0, 10);
    setProductResults(results);
  };

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    setProductSearch('');
    setProductResults([]);
  };

  const updateQty = (id, qty) => {
    if (qty < 1) return;
    setCartItems(prev => prev.map(i => i.product_id === id ? { ...i, quantity: parseInt(qty) } : i));
  };

  const removeFromCart = (id) => setCartItems(prev => prev.filter(i => i.product_id !== id));

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const saleTotal = subtotal + taxAmount - parseFloat(discount || 0);

  const handleCreateSale = async () => {
    if (!cartItems.length) {
      addNotification({ type: 'error', message: 'Cart is empty' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/sales', {
        customer_id: selectedCustomer || null,
        items: cartItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        discount: parseFloat(discount) || 0,
        notes: saleNotes
      });
      addNotification({ type: 'success', message: 'Sale created successfully' });
      setModal(null);
      fetchSales();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create sale' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sale) => {
    const confirmed = await showConfirm({ title: 'Delete Sale', message: 'Delete this sale? Stock will be restored.' });
    if (!confirmed) return;
    try {
      await api.delete(`/sales/${sale.id}`);
      addNotification({ type: 'success', message: 'Sale deleted' });
      fetchSales();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    }
  };

  const statusBadge = (status) => {
    const map = { paid: 'badge-green', pending: 'badge-yellow', cancelled: 'badge-red' };
    return <span className={map[status] || 'badge-gray'}>{status}</span>;
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice', render: (v, row) => <button className="font-mono font-medium text-primary-600 hover:underline" onClick={() => openView(row)}>{v}</button> },
    { key: 'customer_name', label: 'Customer', render: v => v || 'Walk-in' },
    { key: 'total', label: 'Total', render: v => <span className="font-semibold">{formatCurrency(v, symbol)}</span> },
    { key: 'status', label: 'Status', render: v => statusBadge(v) },
    { key: 'created_at', label: 'Date', render: v => formatDateTime(v) },
    {
      key: 'id', label: 'Actions', render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => openView(row)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Eye className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(row)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} total sales</p>
        </div>
        <button className="btn-primary" onClick={openNewSale}><Plus className="w-4 h-4" />New Sale</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by invoice or customer..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={sales} loading={loading} emptyMessage="No sales found" />
        <div className="px-4 pb-4">
          <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
        </div>
      </div>

      {/* New Sale Modal */}
      <Modal isOpen={modal === 'new'} onClose={() => setModal(null)} title="New Sale" size="lg">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div>
              <label className="label">Customer</label>
              <select className="input" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="label">Add Product</label>
              <input
                className="input"
                placeholder="Search product by name or SKU..."
                value={productSearch}
                onChange={e => handleProductSearch(e.target.value)}
              />
              {productResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {productResults.map(p => (
                    <button key={p.id} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 flex justify-between text-sm" onClick={() => addToCart(p)}>
                      <span>{p.name} <span className="text-gray-400 text-xs">{p.sku}</span></span>
                      <span className="text-primary-600">{formatCurrency(p.price, symbol)} | {p.stock} in stock</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 w-20 text-center">Qty</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map(item => (
                    <tr key={item.product_id} className="border-b dark:border-gray-700/50">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-right">{formatCurrency(item.price, symbol)}</td>
                      <td className="py-2 text-center">
                        <input type="number" min="1" className="input w-16 text-center px-2" value={item.quantity} onChange={e => updateQty(item.product_id, e.target.value)} />
                      </td>
                      <td className="py-2 text-right">{formatCurrency(item.price * item.quantity, symbol)}</td>
                      <td className="py-2">
                        <button onClick={() => removeFromCart(item.product_id)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={saleNotes} onChange={e => setSaleNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Order Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal, symbol)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{taxName} ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount, symbol)}</span>
                </div>
              )}
              <div>
                <label className="label">Discount</label>
                <input className="input" type="number" step="0.01" min="0" value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>
              <div className="flex justify-between font-bold text-primary-600 border-t dark:border-gray-700 pt-2">
                <span>Total</span>
                <span>{formatCurrency(saleTotal, symbol)}</span>
              </div>
              <button className="btn-primary w-full justify-center" disabled={saving || !cartItems.length} onClick={handleCreateSale}>
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Invoice Modal */}
      {saleDetail && (
        <Modal isOpen={modal === 'view'} onClose={() => setModal(null)} title={`Invoice ${saleDetail.invoice_number}`} size="md">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{saleDetail.customer_name || 'Walk-in Customer'}</p>
                {saleDetail.customer_email && <p className="text-gray-500">{saleDetail.customer_email}</p>}
              </div>
              <div className="text-right">
                <p className="text-gray-500">{formatDateTime(saleDetail.created_at)}</p>
                <span className={saleDetail.status === 'paid' ? 'badge-green' : saleDetail.status === 'pending' ? 'badge-yellow' : 'badge-red'}>{saleDetail.status}</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 text-xs text-gray-500">
                  <th className="text-left pb-2">Item</th>
                  <th className="text-right pb-2">Qty</th>
                  <th className="text-right pb-2">Price</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(saleDetail.items || []).map(item => (
                  <tr key={item.id} className="border-b dark:border-gray-700/50">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.price, symbol)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.subtotal, symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm border-t dark:border-gray-700 pt-3">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(saleDetail.subtotal, symbol)}</span></div>
              {saleDetail.tax_amount > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(saleDetail.tax_amount, symbol)}</span></div>}
              {saleDetail.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatCurrency(saleDetail.discount, symbol)}</span></div>}
              <div className="flex justify-between font-bold text-primary-600 border-t dark:border-gray-700 pt-2">
                <span>Total</span><span>{formatCurrency(saleDetail.total, symbol)}</span>
              </div>
            </div>
            <div className="flex gap-3 no-print">
              <button className="btn-secondary" onClick={() => window.print()}><Printer className="w-4 h-4" />Print</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
