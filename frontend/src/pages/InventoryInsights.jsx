import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ArrowRightLeft, BrainCircuit } from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store/appStore';

export default function InventoryInsights() {
  const [overview, setOverview] = useState({ warehouses: [], stock_by_warehouse: [], low_stock: [], top_movers: [] });
  const [predictive, setPredictive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [form, setForm] = useState({ product_id: '', from_warehouse_id: 'wh-default', to_warehouse_id: '', quantity: 1, note: '' });
  const { addNotification } = useAppStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        api.get('/inventory/overview'),
        api.get('/inventory/predictive-reorder')
      ]);
      setOverview(o.data);
      setPredictive(p.data.data || []);
      setForm((prev) => ({
        ...prev,
        to_warehouse_id: prev.to_warehouse_id || (o.data.warehouses.find((w) => w.id !== 'wh-default')?.id || '')
      }));
    } catch {
      addNotification({ type: 'error', message: 'Failed to load inventory insights' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 15000);
    return () => clearInterval(timer);
  }, []);

  const transferOptions = useMemo(() => overview.low_stock.map((x) => ({ id: x.id, name: x.name })), [overview.low_stock]);

  const onTransfer = async (e) => {
    e.preventDefault();
    setTransferring(true);
    try {
      await api.post('/inventory/transfer', form);
      addNotification({ type: 'success', message: 'Stock transferred successfully' });
      setForm((prev) => ({ ...prev, quantity: 1, note: '' }));
      fetchData();
    } catch (err) {
      addNotification({ type: 'error', message: err.response?.data?.error || 'Transfer failed' });
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory Insights</h2>
          <p className="text-sm text-gray-500">Real-time warehouse analytics and predictive reorder guidance</p>
        </div>
        <button className="btn-secondary" onClick={fetchData}><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {overview.stock_by_warehouse.map((kpi) => (
          <div key={kpi.warehouse_id} className="card p-4">
            <p className="text-sm text-gray-500">{kpi.warehouse_name}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.stock_units}</p>
            <p className="text-xs text-gray-400">{kpi.sku_count} active SKUs</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Predictive reorder recommendations</h3>
          {predictive.length === 0 ? (
            <p className="text-sm text-gray-400">No reorder recommendations right now.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {predictive.map((item) => (
                <div key={item.product_id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                    <span className="badge-yellow">Reorder {item.suggested_reorder_qty}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">SKU {item.sku || '—'} · {item.days_of_cover ?? '∞'} days cover · avg/day {item.avg_daily_demand}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" />Warehouse transfer</h3>
          <form className="space-y-3" onSubmit={onTransfer}>
            <div>
              <label className="label">Product</label>
              <select className="input" required value={form.product_id} onChange={(e) => setForm((p) => ({ ...p, product_id: e.target.value }))}>
                <option value="">Select product</option>
                {transferOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">From</label>
                <select className="input" required value={form.from_warehouse_id} onChange={(e) => setForm((p) => ({ ...p, from_warehouse_id: e.target.value }))}>
                  {overview.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">To</label>
                <select className="input" required value={form.to_warehouse_id} onChange={(e) => setForm((p) => ({ ...p, to_warehouse_id: e.target.value }))}>
                  <option value="">Select warehouse</option>
                  {overview.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" min="1" type="number" required value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Note</label>
              <input className="input" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
            </div>
            <button className="btn-primary" type="submit" disabled={transferring}>{transferring ? 'Transferring...' : 'Transfer stock'}</button>
          </form>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><BrainCircuit className="w-4 h-4" />Low stock watchlist</h3>
        {overview.low_stock.length === 0 ? (
          <p className="text-sm text-gray-400">No low-stock products.</p>
        ) : (
          <div className="space-y-2">
            {overview.low_stock.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                  <p className="text-xs text-gray-500">SKU {item.sku || '—'} · reorder at {item.reorder_point || item.low_stock_at}</p>
                </div>
                <span className="badge-yellow">{item.stock} left</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
