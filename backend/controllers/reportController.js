const db = require('../database/db');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

const summary = (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const from = req.query.from || monthStart;
    const to = req.query.to || today;

    const revenue = db.prepare(
      `SELECT COALESCE(SUM(total),0) as val FROM sales WHERE status='paid' AND date(created_at)>=? AND date(created_at)<=?`
    ).get(from, to).val;

    const expenses = db.prepare(
      `SELECT COALESCE(SUM(amount),0) as val FROM expenses WHERE date>=? AND date<=?`
    ).get(from, to).val;

    const cogs = db.prepare(
      `SELECT COALESCE(SUM(si.cost * si.quantity),0) as val FROM sale_items si
       JOIN sales s ON si.sale_id=s.id WHERE s.status='paid' AND date(s.created_at)>=? AND date(s.created_at)<=?`
    ).get(from, to).val;

    const todayRevenue = db.prepare(
      `SELECT COALESCE(SUM(total),0) as val FROM sales WHERE status='paid' AND date(created_at)=?`
    ).get(today).val;

    const totalCustomers = db.prepare('SELECT COUNT(*) as val FROM customers').get().val;
    const totalProducts = db.prepare('SELECT COUNT(*) as val FROM products WHERE is_active=1').get().val;
    const lowStockCount = db.prepare('SELECT COUNT(*) as val FROM products WHERE stock<=low_stock_at AND is_active=1').get().val;

    res.json({
      revenue,
      expenses,
      cogs,
      gross_profit: revenue - cogs,
      net_profit: revenue - expenses,
      today_revenue: todayRevenue,
      total_customers: totalCustomers,
      total_products: totalProducts,
      low_stock_count: lowStockCount
    });
  } catch (err) {
    next(err);
  }
};

const dailySales = (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const rows = db.prepare(
      `SELECT date(created_at) as date, COALESCE(SUM(total),0) as revenue, COUNT(*) as count
       FROM sales WHERE status='paid' AND date(created_at) >= date('now', ?)
       GROUP BY date(created_at) ORDER BY date ASC`
    ).all(`-${days} days`);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

const monthlySales = (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();
    const rows = db.prepare(
      `SELECT strftime('%m', created_at) as month, COALESCE(SUM(total),0) as revenue, COUNT(*) as count
       FROM sales WHERE status='paid' AND strftime('%Y', created_at)=?
       GROUP BY strftime('%m', created_at) ORDER BY month ASC`
    ).all(year);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

const topProducts = (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const from = req.query.from || monthStart;
    const to = req.query.to || today;

    const rows = db.prepare(
      `SELECT si.product_id, si.name, SUM(si.quantity) as quantity,
              SUM(si.subtotal) as revenue, SUM(si.cost*si.quantity) as cost
       FROM sale_items si JOIN sales s ON si.sale_id=s.id
       WHERE s.status='paid' AND date(s.created_at)>=? AND date(s.created_at)<=?
       GROUP BY si.product_id, si.name ORDER BY revenue DESC LIMIT ?`
    ).all(from, to, limit);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

const topCustomers = (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT c.id, c.name, c.email, c.total_spent FROM customers c ORDER BY c.total_spent DESC LIMIT 10`
    ).all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

const expensesByCategory = (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const from = req.query.from || monthStart;
    const to = req.query.to || today;

    const rows = db.prepare(
      `SELECT category, SUM(amount) as amount, COUNT(*) as count
       FROM expenses WHERE date>=? AND date<=?
       GROUP BY category ORDER BY amount DESC`
    ).all(from, to);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

const exportInventory = (req, res, next) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const rows = db.prepare(
      `SELECT p.name, p.sku, p.stock, p.low_stock_at, c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.is_active=1
       ORDER BY p.name ASC`
    ).all();

    const date = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const headers = ['Name', 'SKU', 'Category', 'Stock', 'Low Stock At'];
      const lines = [
        headers.join(','),
        ...rows.map((row) => [row.name, row.sku || '', row.category || '', row.stock, row.low_stock_at]
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(','))
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=\"inventory-report-${date}.csv\"`);
      return res.send(lines.join('\n'));
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows.map((row) => ({
        Name: row.name,
        SKU: row.sku || '',
        Category: row.category || '',
        Stock: row.stock,
        LowStockAt: row.low_stock_at
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=\"inventory-report-${date}.xlsx\"`);
      return res.send(buf);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=\"inventory-report-${date}.pdf\"`);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      doc.pipe(res);
      doc.fontSize(16).text('Inventory Report', { align: 'left' });
      doc.moveDown(0.4);
      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown(1);
      doc.fontSize(10).text('Name', 40, doc.y, { width: 180, continued: true });
      doc.text('SKU', { width: 80, continued: true });
      doc.text('Category', { width: 120, continued: true });
      doc.text('Stock', { width: 60, continued: true });
      doc.text('Threshold');
      doc.moveDown(0.4);
      rows.forEach((row) => {
        doc.text(row.name, 40, doc.y, { width: 180, continued: true });
        doc.text(row.sku || '-', { width: 80, continued: true });
        doc.text(row.category || '-', { width: 120, continued: true });
        doc.text(String(row.stock), { width: 60, continued: true });
        doc.text(String(row.low_stock_at));
      });
      doc.end();
      return;
    }

    return res.status(400).json({ error: 'Unsupported format. Use csv, xlsx, or pdf.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { summary, dailySales, monthlySales, topProducts, topCustomers, expensesByCategory, exportInventory };
