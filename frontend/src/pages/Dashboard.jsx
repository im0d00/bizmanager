import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Package, ShoppingCart, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import StatsCard from '../components/StatsCard';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useAppStore } from '../store/appStore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useAppStore();
  const symbol = settings?.currency_symbol || '$';

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, low_stock_items, recent_sales, charts } = data;

  const monthlySalesData = MONTHS.map((m, i) => {
    const month = String(i + 1).padStart(2, '0');
    const found = charts.monthly_sales.find(r => r.month === month);
    return { month: m, revenue: found ? found.revenue : 0 };
  });

  const statusBadge = (status) => {
    const map = { paid: 'badge-green', pending: 'badge-yellow', cancelled: 'badge-red' };
    return <span className={map[status] || 'badge-gray'}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Business overview</p>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={DollarSign} title="Today's Revenue" value={formatCurrency(stats.today_revenue, symbol)} color="blue" />
        <StatsCard icon={TrendingUp} title="Month Revenue" value={formatCurrency(stats.month_revenue, symbol)} color="green" />
        <StatsCard icon={Users} title="Total Customers" value={stats.total_customers.toLocaleString()} color="purple" />
        <StatsCard icon={Package} title="Total Products" value={stats.total_products.toLocaleString()} color="orange" />
      </div>

      {/* Second stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={ShoppingCart} title="Month Expenses" value={formatCurrency(stats.month_expenses, symbol)} color="red" />
        <StatsCard icon={TrendingUp} title="Net Profit" value={formatCurrency(stats.net_profit, symbol)} color="green" />
        <StatsCard
          icon={AlertTriangle}
          title="Low Stock Items"
          value={stats.low_stock_count}
          subtitle="Products below threshold"
          color="yellow"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Sales (30 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.daily_sales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip formatter={v => [formatCurrency(v, symbol), 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlySalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip formatter={v => [formatCurrency(v, symbol), 'Revenue']} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Low Stock Alerts
          </h3>
          {low_stock_items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">All products have sufficient stock</p>
          ) : (
            <div className="space-y-2">
              {low_stock_items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="text-xs text-gray-500">Min: {item.low_stock_at}</p>
                  </div>
                  <span className="badge-yellow">{item.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Sales</h3>
          <div className="space-y-2">
            {recent_sales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No recent sales</p>
            ) : recent_sales.map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <div>
                  <p className="text-sm font-mono font-medium text-primary-600">{sale.invoice_number}</p>
                  <p className="text-xs text-gray-500">{sale.customer_name || 'Walk-in'} · {formatDateTime(sale.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(sale.status)}
                  <span className="text-sm font-semibold">{formatCurrency(sale.total, symbol)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
