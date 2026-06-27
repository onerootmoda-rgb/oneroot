const express = require('express');
const db = require('../data/database');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/customers — lista paginada con búsqueda (admin only)
router.get('/', requireAdmin, (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const q     = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const city  = typeof req.query.city === 'string' ? req.query.city.trim() : '';

    const conditions = [];
    const params = [];

    if (q) {
        conditions.push('(LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(email) LIKE ?)');
        const like = `%${q.toLowerCase()}%`;
        params.push(like, `%${q}%`, like);
    }
    if (city) { conditions.push('LOWER(city) = LOWER(?)'); params.push(city); }

    const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as n FROM customers ${where}`).get(...params).n;
    const rows  = db.prepare(`SELECT * FROM customers ${where} ORDER BY lastOrderAt DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    // Ciudades únicas para filtro
    const cities = db.prepare("SELECT DISTINCT city FROM customers WHERE city != '' ORDER BY city").all().map(r => r.city);

    res.json({ customers: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, cities });
});

// GET /api/customers/:id — un cliente con sus pedidos
router.get('/:id', requireAdmin, (req, res) => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

    const orders = db.prepare(
        'SELECT id, status, total, createdAt, items FROM orders WHERE customerPhone = ? ORDER BY createdAt DESC'
    ).all(customer.phone).map(o => ({ ...o, items: JSON.parse(o.items || '[]') }));

    res.json({ customer, orders });
});

module.exports = router;
