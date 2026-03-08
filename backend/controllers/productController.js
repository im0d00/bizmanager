const db = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20, category_id, low_stock } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;

    let where = `(p.name LIKE ? OR p.sku LIKE ?)`;
    const params = [like, like];

    if (category_id) {
      where += ` AND p.category_id = ?`;
      params.push(category_id);
    }
    if (low_stock === 'true') {
      where += ` AND p.stock <= p.low_stock_at`;
    }

    const products = db.prepare(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    const { total } = db.prepare(
      `SELECT COUNT(*) as total FROM products p WHERE ${where}`
    ).get(...params);

    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

    res.json({ products, total, categories });
  } catch (err) {
    next(err);
  }
};

const getLowStock = (req, res, next) => {
  try {
    const products = db.prepare(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.stock <= p.low_stock_at AND p.is_active=1
       ORDER BY p.stock ASC`
    ).all();
    res.json({ products });
  } catch (err) {
    next(err);
  }
};

const getOne = (req, res, next) => {
  try {
    const product = db.prepare(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`
    ).get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const create = (req, res, next) => {
  try {
    const { name, sku, description, price, cost, stock, low_stock_at, category_id, is_active = 1 } = req.body;
    const result = db.prepare(
      `INSERT INTO products (name, sku, description, price, cost, stock, low_stock_at, category_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(name, sku || null, description || null, parseFloat(price) || 0, parseFloat(cost) || 0,
      parseInt(stock) || 0, parseInt(low_stock_at) || 10, category_id || null, is_active ? 1 : 0);
    const product = db.prepare('SELECT * FROM products WHERE rowid = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

const update = (req, res, next) => {
  try {
    const { name, sku, description, price, cost, stock, low_stock_at, category_id, is_active } = req.body;
    db.prepare(
      `UPDATE products SET name=?, sku=?, description=?, price=?, cost=?, stock=?, low_stock_at=?,
       category_id=?, is_active=?, updated_at=datetime('now') WHERE id=?`
    ).run(name, sku || null, description || null, parseFloat(price) || 0, parseFloat(cost) || 0,
      parseInt(stock) || 0, parseInt(low_stock_at) || 10, category_id || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const remove = (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

const createCategory = (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    const category = db.prepare('SELECT * FROM categories WHERE rowid = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getLowStock, getOne, create, update, remove, createCategory };
