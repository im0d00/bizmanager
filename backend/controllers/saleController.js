const db = require('../database/db');

const getNextInvoiceNumber = () => {
  const prefixRow = db.prepare(`SELECT value FROM settings WHERE key='invoice_prefix'`).get();
  const prefix = prefixRow ? prefixRow.value : 'INV-';
  const last = db.prepare(
    `SELECT invoice_number FROM sales ORDER BY created_at DESC LIMIT 1`
  ).get();
  let num = 1;
  if (last) {
    const match = last.invoice_number.replace(prefix, '');
    const parsed = parseInt(match);
    if (!isNaN(parsed)) num = parsed + 1;
  }
  return `${prefix}${String(num).padStart(5, '0')}`;
};

const getAll = (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20, status, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;

    let where = `(s.invoice_number LIKE ? OR c.name LIKE ?)`;
    const params = [like, like];

    if (status) {
      where += ` AND s.status = ?`;
      params.push(status);
    }
    if (from) {
      where += ` AND date(s.created_at) >= ?`;
      params.push(from);
    }
    if (to) {
      where += ` AND date(s.created_at) <= ?`;
      params.push(to);
    }

    const sales = db.prepare(
      `SELECT s.*, c.name as customer_name, u.name as user_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE ${where}
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(
      `SELECT COUNT(*) as total FROM sales s LEFT JOIN customers c ON s.customer_id=c.id WHERE ${where}`
    ).get(...params);

    res.json({ sales, total });
  } catch (err) {
    next(err);
  }
};

const getOne = (req, res, next) => {
  try {
    const sale = db.prepare(
      `SELECT s.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
              u.name as user_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`
    ).get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = db.prepare(
      `SELECT si.*, p.sku as product_sku
       FROM sale_items si LEFT JOIN products p ON si.product_id=p.id WHERE si.sale_id=?`
    ).all(req.params.id);

    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    res.json({ ...sale, items, settings });
  } catch (err) {
    next(err);
  }
};

const create = (req, res, next) => {
  try {
    const { customer_id, items, discount = 0, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const createSale = db.transaction(() => {
      const taxRow = db.prepare(`SELECT value FROM settings WHERE key='tax_rate'`).get();
      const taxRate = parseFloat(taxRow ? taxRow.value : 0) || 0;

      let subtotal = 0;
      const resolvedItems = items.map(item => {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw Object.assign(new Error(`Product not found: ${item.product_id}`), { statusCode: 404 });
        if (product.stock < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { statusCode: 400 });
        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;
        return { product, quantity: item.quantity, lineTotal };
      });

      const discountAmt = parseFloat(discount) || 0;
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount - discountAmt;
      const invoiceNumber = getNextInvoiceNumber();

      const saleResult = db.prepare(
        `INSERT INTO sales (invoice_number, customer_id, user_id, subtotal, tax_amount, discount, total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(invoiceNumber, customer_id || null, req.user.id, subtotal, taxAmount, discountAmt, total, notes || null);

      const saleId = db.prepare('SELECT id FROM sales WHERE rowid = ?').get(saleResult.lastInsertRowid).id;

      for (const { product, quantity, lineTotal } of resolvedItems) {
        db.prepare(
          `INSERT INTO sale_items (sale_id, product_id, name, price, cost, quantity, subtotal) VALUES (?,?,?,?,?,?,?)`
        ).run(saleId, product.id, product.name, product.price, product.cost, quantity, lineTotal);
        db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(quantity, product.id);
      }

      if (customer_id) {
        db.prepare(`UPDATE customers SET total_spent = total_spent + ?, updated_at=datetime('now') WHERE id=?`).run(total, customer_id);
      }

      return db.prepare(
        `SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id=c.id WHERE s.id=?`
      ).get(saleId);
    });

    const sale = createSale();
    res.status(201).json(sale);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

const updateStatus = (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['paid', 'pending', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare(`UPDATE sales SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);
    const sale = db.prepare('SELECT * FROM sales WHERE id=?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    next(err);
  }
};

const remove = (req, res, next) => {
  try {
    const deleteSale = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id=?').get(req.params.id);
      if (!sale) throw Object.assign(new Error('Sale not found'), { statusCode: 404 });

      const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(req.params.id);

      for (const item of saleItems) {
        if (item.product_id) {
          db.prepare(`UPDATE products SET stock = stock + ? WHERE id=?`).run(item.quantity, item.product_id);
        }
      }

      if (sale.customer_id && sale.status === 'paid') {
        db.prepare(`UPDATE customers SET total_spent = MAX(0, total_spent - ?), updated_at=datetime('now') WHERE id=?`)
          .run(sale.total, sale.customer_id);
      }

      db.prepare('DELETE FROM sales WHERE id=?').run(req.params.id);
    });

    deleteSale();
    res.json({ message: 'Sale deleted' });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

module.exports = { getAll, getOne, create, updateStatus, remove };
