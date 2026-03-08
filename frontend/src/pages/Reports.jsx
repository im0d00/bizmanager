import { useState, useEffect } from 'react';
import { format, startOfMonth } from 'date-fns';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import StatsCard from '../components/StatsCard';
import { DollarSign, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { useAppStore } from '../store/appStore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function Reports() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [expensesByCat, setExpensesByCat] = useState([]);
  const { settings } = useAppStore();
  const symbol = settings?.currency_symbol || '$';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, d, m, tp, ec] = await Promise.all([
        api.get('/reports/summary', { params: { from, to } }),
        api.get('/reports/daily-sales', { params: { days: 30 } }),
        api.get('/reports/monthly-sales'),
        api.get('/reports/top-products', { params: { from, to, limit: 10 } }),
        api.get('/reports/expenses-by-category', { params: { from, to } })
      ]);
      setSummary(s.data);
      setDailySales(d.data.data);
      setMonthlySales(m.data.data);
      setTopProducts(tp.data.data);
      setExpensesByCat(ec.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [from, to]);

  const monthlyData = MONTHS.map((m, i) => {
    const month = String(i + 1).padStart(2, '0');
    const found = monthlySales.find(r => r.month === month);
    return { month: m, revenue: found ? found.revenue : 0 };
  });

  const maxRevenue = topProducts[0]?.revenue || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h2>
          <p className="text-sm text-gray-500">Business analytics and insights</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <label className="label m-0">From:</label>
            <input className="input w-36" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="label m-0">To:</label>
            <input className="input w-36" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={DollarSign} title="Total Revenue" value={formatCurrency(summary.revenue, symbol)} color="blue" />
          <StatsCard icon={TrendingDown} title="Total Expenses" value={formatCurrency(summary.expenses, symbol)} color="red" />
          <StatsCard icon={TrendingUp} title="Gross Profit" value={formatCurrency(summary.gross_profit, symbol)} color="green" />
          <StatsCard icon={Package} title="Net Profit" value={formatCurrency(summary.net_profit, symbol)} color={summary.net_profit >= 0 ? 'green' : 'red'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Sales (30 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip formatter={v => [formatCurrency(v, symbol), 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip formatter={v => [formatCurrency(v, symbol), 'Revenue']} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No sales data for period</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.product_id || i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(p.revenue, symbol)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Expenses by Category</h3>
          {expensesByCat.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No expenses for period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensesByCat} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={true}>
                  {expensesByCat.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => [formatCurrency(v, symbol), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
