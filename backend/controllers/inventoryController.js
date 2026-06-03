const db = require('../database/db');
const {
  DEFAULT_WAREHOUSE_ID,
  adjustInventoryBalance,
  syncProductGlobalStock,
  upsertInventoryBalance,
  maybeNotifyLowStock
} = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');

const getOverview = (req, res, next) => {
  try {
    const warehouses = db.prepare(`SELECT * FROM warehouses WHERE is_active=1 ORDER BY name ASC`).all();
    const stockByWarehouse = db.prepare(
      `SELECT w.id AS warehouse_id, w.name AS warehouse_name,
              COUNT(DISTINCT pi.product_id) AS sku_count,
              COALESCE(SUM(pi.stock),0) AS stock_units
       FROM warehouses w
       LEFT JOIN product_inventory pi ON pi.warehouse_id=w.id
       WHERE w.is_active=1
       GROUP BY w.id, w.name
       ORDER BY w.name ASC`
    ).all();

    const lowStock = db.prepare(
      `SELECT p.id, p.name, p.sku, p.stock, p.low_stock_at,
              rr.reorder_point, rr.reorder_quantity, rr.lead_time_days,
              MAX(im.created_at) AS last_movement
       FROM products p
       LEFT JOIN reorder_rules rr ON rr.product_id=p.id AND rr.warehouse_id=?
       LEFT JOIN inventory_movements im ON im.product_id=p.id
       WHERE p.is_active=1
       GROUP BY p.id
       HAVING p.stock <= COALESCE(rr.reorder_point, p.low_stock_at)
       ORDER BY p.stock ASC, p.name ASC`
    ).all(DEFAULT_WAREHOUSE_ID);

    const topMovers = db.prepare(
      `SELECT p.id, p.name, p.sku,
              COALESCE(SUM(CASE WHEN im.movement_type='sale' THEN im.quantity ELSE 0 END),0) AS sold_units_30d,
              COALESCE(SUM(CASE WHEN im.movement_type='transfer' THEN im.quantity ELSE 0 END),0) AS moved_units_30d
       FROM products p
       LEFT JOIN inventory_movements im ON im.product_id=p.id AND im.created_at >= datetime('now','-30 days')
       WHERE p.is_active=1
       GROUP BY p.id
       ORDER BY sold_units_30d DESC
       LIMIT 10`
    ).all();

    res.json({
      warehouses,
      stock_by_warehouse: stockByWarehouse,
      low_stock: lowStock,
      top_movers: topMovers
    });
  } catch (err) {
    next(err);
  }
};

const getBalances = (req, res, next) => {
  try {
    const warehouseId = req.query.warehouse_id || DEFAULT_WAREHOUSE_ID;

    const rows = db.prepare(
      `SELECT p.id AS product_id, p.name, p.sku, p.low_stock_at,
              COALESCE(pi.stock,0) AS stock,
              COALESCE(rr.reorder_point, p.low_stock_at) AS reorder_point,
              COALESCE(rr.reorder_quantity, 0) AS reorder_quantity,
              COALESCE(rr.lead_time_days, 7) AS lead_time_days,
              COALESCE(rr.safety_stock, 2) AS safety_stock
       FROM products p
       LEFT JOIN product_inventory pi ON pi.product_id=p.id AND pi.warehouse_id=?
       LEFT JOIN reorder_rules rr ON rr.product_id=p.id AND rr.warehouse_id=?
       WHERE p.is_active=1
       ORDER BY p.name ASC`
    ).all(warehouseId, warehouseId);

    res.json({ data: rows, warehouse_id: warehouseId });
  } catch (err) {
    next(err);
  }
};

const getPredictive = (req, res, next) => {
  try {
    const warehouseId = req.query.warehouse_id || DEFAULT_WAREHOUSE_ID;

    const rows = db.prepare(
      `SELECT p.id AS product_id, p.name, p.sku,
              COALESCE(pi.stock,0) AS stock,
              COALESCE(rr.reorder_point, p.low_stock_at) AS reorder_point,
              COALESCE(rr.reorder_quantity, 20) AS reorder_quantity,
              COALESCE(rr.lead_time_days, 7) AS lead_time_days,
              COALESCE(rr.safety_stock, 2) AS safety_stock,
              COALESCE(SUM(CASE WHEN im.movement_type='sale' THEN im.quantity ELSE 0 END),0) AS sold_units_30d
       FROM products p
       LEFT JOIN product_inventory pi ON pi.product_id=p.id AND pi.warehouse_id=?
       LEFT JOIN reorder_rules rr ON rr.product_id=p.id AND rr.warehouse_id=?
       LEFT JOIN inventory_movements im ON im.product_id=p.id AND im.warehouse_id=? AND im.created_at >= datetime('now','-30 days')
       WHERE p.is_active=1
       GROUP BY p.id
       ORDER BY p.name ASC`
    ).all(warehouseId, warehouseId, warehouseId);

    const recommendations = rows
      .map((row) => {
        const avgDailyDemand = row.sold_units_30d / 30;
        const projectedLeadTimeDemand = avgDailyDemand * row.lead_time_days;
        const suggestedReorderQty = Math.max(
          row.reorder_quantity,
          Math.ceil(projectedLeadTimeDemand + row.safety_stock - row.stock)
        );
        const daysOfCover = avgDailyDemand > 0 ? Number((row.stock / avgDailyDemand).toFixed(1)) : null;
        const shouldReorder = row.stock <= row.reorder_point || (daysOfCover !== null && daysOfCover <= row.lead_time_days);

        return {
          ...row,
          avg_daily_demand: Number(avgDailyDemand.toFixed(2)),
          projected_lead_time_demand: Math.ceil(projectedLeadTimeDemand),
          days_of_cover: daysOfCover,
          suggested_reorder_qty: shouldReorder ? suggestedReorderQty : 0,
          reorder_recommended: shouldReorder
        };
      })
      .filter((row) => row.reorder_recommended)
      .sort((a, b) => a.days_of_cover - b.days_of_cover);

    res.json({ data: recommendations, warehouse_id: warehouseId });
  } catch (err) {
    next(err);
  }
};

const createWarehouse = (req, res, next) => {
  try {
    const { name, code, address, is_active = 1 } = req.body;
    if (!name) return res.status(400).json({ error: 'Warehouse name is required' });

    const result = db.prepare(
      `INSERT INTO warehouses (name, code, address, is_active) VALUES (?, ?, ?, ?)`
    ).run(name, code || null, address || null, is_active ? 1 : 0);

    const warehouse = db.prepare(`SELECT * FROM warehouses WHERE rowid=?`).get(result.lastInsertRowid);
    logAudit({
      userId: req.user?.id,
      action: 'warehouse.created',
      entityType: 'warehouse',
      entityId: warehouse.id,
      metadata: { name: warehouse.name, code: warehouse.code }
    });
    res.status(201).json(warehouse);
  } catch (err) {
    next(err);
  }
};

const transferStock = (req, res, next) => {
  try {
    const { product_id, from_warehouse_id, to_warehouse_id, quantity, note } = req.body;
    const qty = parseInt(quantity, 10);
    if (!product_id || !from_warehouse_id || !to_warehouse_id || !qty || qty < 1) {
      return res.status(400).json({ error: 'product_id, from_warehouse_id, to_warehouse_id and quantity are required' });
    }
    if (from_warehouse_id === to_warehouse_id) {
      return res.status(400).json({ error: 'Source and destination warehouses must be different' });
    }

    const result = db.transaction(() => {
      adjustInventoryBalance(product_id, from_warehouse_id, -qty);
      adjustInventoryBalance(product_id, to_warehouse_id, qty);
      const total = syncProductGlobalStock(product_id);

      db.prepare(
        `INSERT INTO inventory_movements (product_id, from_warehouse_id, to_warehouse_id, warehouse_id, movement_type, quantity, note, performed_by)
         VALUES (?, ?, ?, ?, 'transfer', ?, ?, ?)`
      ).run(product_id, from_warehouse_id, to_warehouse_id, to_warehouse_id, qty, note || null, req.user?.id || null);

      maybeNotifyLowStock(product_id);

      return { total_stock: total };
    })();

    logAudit({
      userId: req.user?.id,
      action: 'inventory.transferred',
      entityType: 'product',
      entityId: product_id,
      metadata: { from_warehouse_id, to_warehouse_id, quantity: qty }
    });

    res.json({ message: 'Stock transferred', ...result });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

const upsertRule = (req, res, next) => {
  try {
    const { product_id, warehouse_id = DEFAULT_WAREHOUSE_ID, reorder_point, reorder_quantity, lead_time_days, safety_stock } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    db.prepare(
      `INSERT INTO reorder_rules (product_id, warehouse_id, reorder_point, reorder_quantity, lead_time_days, safety_stock, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(product_id, warehouse_id)
       DO UPDATE SET reorder_point=excluded.reorder_point,
                     reorder_quantity=excluded.reorder_quantity,
                     lead_time_days=excluded.lead_time_days,
                     safety_stock=excluded.safety_stock,
                     updated_at=datetime('now')`
    ).run(
      product_id,
      warehouse_id,
      parseInt(reorder_point, 10) || 10,
      parseInt(reorder_quantity, 10) || 20,
      parseInt(lead_time_days, 10) || 7,
      parseInt(safety_stock, 10) || 2
    );

    const rule = db.prepare(`SELECT * FROM reorder_rules WHERE product_id=? AND warehouse_id=?`).get(product_id, warehouse_id);

    logAudit({
      userId: req.user?.id,
      action: 'reorder_rule.saved',
      entityType: 'product',
      entityId: product_id,
      metadata: { warehouse_id, reorder_point: rule.reorder_point, reorder_quantity: rule.reorder_quantity }
    });

    res.json(rule);
  } catch (err) {
    next(err);
  }
};

const syncFromIntegration = (req, res, next) => {
  try {
    const { warehouse_code = 'MAIN', inventory = [] } = req.body;
    const warehouse = db.prepare(`SELECT * FROM warehouses WHERE code=?`).get(warehouse_code);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found for provided code' });

    const result = db.transaction(() => {
      const updated = [];
      for (const item of inventory) {
        if (!item.sku) continue;
        const product = db.prepare(`SELECT id, sku FROM products WHERE sku=?`).get(item.sku);
        if (!product) continue;
        const qty = parseInt(item.stock, 10);
        upsertInventoryBalance(product.id, warehouse.id, Number.isNaN(qty) ? 0 : qty);
        syncProductGlobalStock(product.id);

        db.prepare(
          `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, note, performed_by)
           VALUES (?, ?, 'sync', ?, ?, NULL)`
        ).run(product.id, warehouse.id, Number.isNaN(qty) ? 0 : qty, `Synced by integration ${req.integration?.name || 'external'}`);

        maybeNotifyLowStock(product.id);
        updated.push(product.sku);
      }

      db.prepare(
        `INSERT INTO sync_events (source, event_type, status, payload)
         VALUES (?, 'inventory.sync', 'success', ?)`
      ).run(req.integration?.name || 'integration', JSON.stringify({ warehouse_code, updated_count: updated.length }));

      return updated;
    })();

    res.json({ message: 'Sync completed', updated_skus: result, count: result.length });
  } catch (err) {
    db.prepare(
      `INSERT INTO sync_events (source, event_type, status, error_message)
       VALUES (?, 'inventory.sync', 'failed', ?)`
    ).run(req.integration?.name || 'integration', err.message);
    next(err);
  }
};

module.exports = {
  getOverview,
  getBalances,
  getPredictive,
  createWarehouse,
  transferStock,
  upsertRule,
  syncFromIntegration
};
