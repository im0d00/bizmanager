const db = require('../database/db');

const DEFAULT_WAREHOUSE_ID = 'wh-default';

const ensureDefaultWarehouse = () => {
  db.prepare(
    `INSERT OR IGNORE INTO warehouses (id, name, code, is_active) VALUES (?, 'Main Warehouse', 'MAIN', 1)`
  ).run(DEFAULT_WAREHOUSE_ID);

  const count = db.prepare(`SELECT COUNT(*) AS val FROM product_inventory`).get().val;
  if (count === 0) {
    db.prepare(
      `INSERT OR IGNORE INTO product_inventory (product_id, warehouse_id, stock, updated_at)
       SELECT id, ?, stock, datetime('now') FROM products`
    ).run(DEFAULT_WAREHOUSE_ID);
  }
};

const upsertInventoryBalance = (productId, warehouseId, stock) => {
  db.prepare(
    `INSERT INTO product_inventory (product_id, warehouse_id, stock, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(product_id, warehouse_id)
     DO UPDATE SET stock=excluded.stock, updated_at=datetime('now')`
  ).run(productId, warehouseId, stock);
};

const adjustInventoryBalance = (productId, warehouseId, delta) => {
  const existing = db.prepare(
    `SELECT stock FROM product_inventory WHERE product_id=? AND warehouse_id=?`
  ).get(productId, warehouseId);

  const current = existing ? existing.stock : 0;
  const next = current + Number(delta || 0);
  if (next < 0) {
    throw Object.assign(new Error('Insufficient warehouse stock'), { statusCode: 400 });
  }

  upsertInventoryBalance(productId, warehouseId, next);
  return next;
};

const getProductTotalStock = (productId) => {
  const row = db.prepare(
    `SELECT COALESCE(SUM(stock),0) AS total FROM product_inventory WHERE product_id=?`
  ).get(productId);
  return row ? row.total : 0;
};

const syncProductGlobalStock = (productId) => {
  const total = getProductTotalStock(productId);
  db.prepare(`UPDATE products SET stock=?, updated_at=datetime('now') WHERE id=?`).run(total, productId);
  return total;
};

const createLowStockNotification = (product) => {
  const users = db.prepare(
    `SELECT id FROM users WHERE role IN ('admin', 'manager') AND is_active=1`
  ).all();

  const stmt = db.prepare(
    `INSERT INTO notifications (user_id, title, message, type, is_read)
     VALUES (?, ?, ?, 'warning', 0)`
  );

  for (const user of users) {
    stmt.run(
      user.id,
      'Low stock alert',
      `${product.name} is low in stock (${product.stock} left, threshold ${product.low_stock_at}).`
    );
  }
};

const maybeNotifyLowStock = (productId) => {
  const product = db.prepare(`SELECT id, name, stock, low_stock_at FROM products WHERE id=?`).get(productId);
  if (!product) return;
  if (product.stock <= product.low_stock_at) {
    createLowStockNotification(product);
  }
};

module.exports = {
  DEFAULT_WAREHOUSE_ID,
  ensureDefaultWarehouse,
  upsertInventoryBalance,
  adjustInventoryBalance,
  getProductTotalStock,
  syncProductGlobalStock,
  maybeNotifyLowStock
};
