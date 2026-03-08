const db = require('../database/db');

const getDashboard = (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const year = today.slice(0, 4);

    const todayRevenue = db.prepare(
      `SELECT COALESCE(SUM(total),0) as val FROM sales WHERE status='paid' AND date(created_at)=?`
    ).get(today).val;

    const monthRevenue = db.prepare(
      `SELECT COALESCE(SUM(total),0) as val FROM sales WHERE status='paid' AND date(created_at)>=? AND date(created_at)<=?`
    ).get(monthStart, today).val;

    const monthExpenses = db.prepare(
      `SELECT COALESCE(SUM(amount),0) as val FROM expenses WHERE date>=? AND date<=?`
    ).get(monthStart, today).val;

    const totalCustomers = db.prepare(`SELECT COUNT(*) as val FROM customers`).get().val;
    const totalProducts = db.prepare(`SELECT COUNT(*) as val FROM products WHERE is_active=1`).get().val;
    const lowStockCount = db.prepare(`SELECT COUNT(*) as val FROM products WHERE stock<=low_stock_at AND is_active=1`).get().val;

    const lowStockItems = db.prepare(
      `SELECT id, name, sku, stock, low_stock_at FROM products WHERE stock<=low_stock_at AND is_active=1 ORDER BY stock ASC LIMIT 5`
    ).all();

    const recentSales = db.prepare(
      `SELECT s.*, c.name as customer_name, u.name as user_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id=c.id
       LEFT JOIN users u ON s.user_id=u.id
       ORDER BY s.created_at DESC LIMIT 10`
    ).all();

    const dailySales = db.prepare(
      `SELECT date(created_at) as date, COALESCE(SUM(total),0) as revenue
       FROM sales WHERE status='paid' AND date(created_at) >= date('now','-30 days')
       GROUP BY date(created_at) ORDER BY date ASC`
    ).all();

    const monthlySales = db.prepare(
      `SELECT strftime('%m', created_at) as month, COALESCE(SUM(total),0) as revenue
       FROM sales WHERE status='paid' AND strftime('%Y', created_at)=?
       GROUP BY strftime('%m', created_at) ORDER BY month ASC`
    ).all(year);

    res.json({
      stats: {
        today_revenue: todayRevenue,
        month_revenue: monthRevenue,
        month_expenses: monthExpenses,
        net_profit: monthRevenue - monthExpenses,
        total_customers: totalCustomers,
        total_products: totalProducts,
        low_stock_count: lowStockCount
      },
      low_stock_items: lowStockItems,
      recent_sales: recentSales,
      charts: {
        daily_sales: dailySales,
        monthly_sales: monthlySales
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
