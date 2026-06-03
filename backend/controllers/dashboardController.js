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

    const warehouseKpis = db.prepare(
      `SELECT w.id, w.name,
              COALESCE(SUM(pi.stock),0) AS stock_units,
              COUNT(DISTINCT pi.product_id) AS sku_count
       FROM warehouses w
       LEFT JOIN product_inventory pi ON pi.warehouse_id=w.id
       WHERE w.is_active=1
       GROUP BY w.id, w.name
       ORDER BY w.name ASC`
    ).all();

    const predictive = db.prepare(
      `SELECT p.id, p.name, p.stock, p.low_stock_at,
              COALESCE(SUM(CASE WHEN im.movement_type='sale' THEN im.quantity ELSE 0 END),0) AS sold_units_14d
       FROM products p
       LEFT JOIN inventory_movements im ON im.product_id=p.id AND im.created_at >= datetime('now','-14 days')
       WHERE p.is_active=1
       GROUP BY p.id
       HAVING p.stock <= p.low_stock_at OR sold_units_14d > 0
       ORDER BY sold_units_14d DESC, p.stock ASC
       LIMIT 6`
    ).all().map((row) => {
      const avgDaily = row.sold_units_14d / 14;
      return {
        ...row,
        avg_daily_demand: Number(avgDaily.toFixed(2)),
        projected_7d_need: Math.ceil(avgDaily * 7),
        reorder_recommended: row.stock <= row.low_stock_at || row.stock <= Math.ceil(avgDaily * 7)
      };
    });

    const pendingOrders = db.prepare(
      `SELECT COUNT(*) AS val FROM sales WHERE status='pending'`
    ).get().val;

    res.json({
      stats: {
        today_revenue: todayRevenue,
        month_revenue: monthRevenue,
        month_expenses: monthExpenses,
        net_profit: monthRevenue - monthExpenses,
        total_customers: totalCustomers,
        total_products: totalProducts,
        low_stock_count: lowStockCount,
        pending_orders: pendingOrders
      },
      low_stock_items: lowStockItems,
      recent_sales: recentSales,
      charts: {
        daily_sales: dailySales,
        monthly_sales: monthlySales
      },
      kpis_by_location: warehouseKpis,
      predictive_insights: predictive
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
