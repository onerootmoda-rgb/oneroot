const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../data/database');

const router = express.Router();

function getSessionId(req) {
    return req.headers['x-session-id'] || req.query.sessionId || null;
}

function parseProduct(row) {
    if (!row) return null;
    return {
        ...row,
        sizes: JSON.parse(row.sizes || '[]'),
        stock: JSON.parse(row.stock || '{}'),
        images: JSON.parse(row.images || '[]').filter(Boolean),
        tags: JSON.parse(row.tags || '[]'),
    };
}

function buildCartResponse(sessionId) {
    // JOIN en una sola query — evita N+1
    const rows = db.prepare(`
        SELECT ci.productId, ci.size, ci.quantity,
               p.id, p.name, p.color, p.price, p.category,
               p.sizes, p.stock, p.images, p.tags, p.status, p.badge, p.sku
        FROM cart_items ci
        JOIN products p ON ci.productId = p.id
        WHERE ci.sessionId = ?
    `).all(sessionId);

    const items = rows.map(row => ({
        productId: row.productId,
        size:      row.size,
        quantity:  row.quantity,
        product:   parseProduct(row)
    }));

    const total     = items.reduce((sum, i) => sum + (i.product ? i.product.price * i.quantity : 0), 0);
    const itemCount = items.reduce((s, i) => s + i.quantity, 0);
    return { sessionId, items, total: parseFloat(total.toFixed(2)), itemCount };
}

// GET /api/cart
router.get('/', (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) return res.status(400).json({ error: 'x-session-id header required' });
    res.json(buildCartResponse(sessionId));
});

// POST /api/cart/add
router.post('/add', (req, res) => {
    const { productId, size, quantity = 1 } = req.body;
    const sessionId = getSessionId(req) || `sess-${uuidv4()}`;

    if (!productId || !size) return res.status(400).json({ error: 'productId and size required' });

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.status === 'sold-out') return res.status(400).json({ error: 'Product is sold out' });

    const stock = JSON.parse(product.stock || '{}');
    const available = stock[size] || 0;
    if (available === 0) return res.status(400).json({ error: `Size ${size} is out of stock` });

    const existing = db.prepare('SELECT * FROM cart_items WHERE sessionId=? AND productId=? AND size=?').get(sessionId, productId, size);
    if (existing) {
        const newQty = Math.min(existing.quantity + Number(quantity), available);
        db.prepare('UPDATE cart_items SET quantity=? WHERE sessionId=? AND productId=? AND size=?').run(newQty, sessionId, productId, size);
    } else {
        db.prepare('INSERT INTO cart_items (sessionId,productId,size,quantity) VALUES (?,?,?,?)').run(
            sessionId, productId, size, Math.min(Number(quantity), available)
        );
    }

    res.json({ sessionId, ...buildCartResponse(sessionId) });
});

// PUT /api/cart/:productId
router.put('/:productId', (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) return res.status(400).json({ error: 'x-session-id required' });
    const { size, quantity } = req.body;
    if (!size || quantity === undefined) return res.status(400).json({ error: 'size and quantity required' });

    if (Number(quantity) <= 0) {
        db.prepare('DELETE FROM cart_items WHERE sessionId=? AND productId=? AND size=?').run(sessionId, req.params.productId, size);
    } else {
        db.prepare('UPDATE cart_items SET quantity=? WHERE sessionId=? AND productId=? AND size=?').run(Number(quantity), sessionId, req.params.productId, size);
    }

    res.json(buildCartResponse(sessionId));
});

// DELETE /api/cart/:productId?size=M
router.delete('/:productId', (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) return res.status(400).json({ error: 'x-session-id required' });
    const { size } = req.query;

    if (size) {
        db.prepare('DELETE FROM cart_items WHERE sessionId=? AND productId=? AND size=?').run(sessionId, req.params.productId, size);
    } else {
        db.prepare('DELETE FROM cart_items WHERE sessionId=? AND productId=?').run(sessionId, req.params.productId);
    }

    res.json(buildCartResponse(sessionId));
});

// DELETE /api/cart
router.delete('/', (req, res) => {
    const sessionId = getSessionId(req);
    if (!sessionId) return res.status(400).json({ error: 'x-session-id required' });
    db.prepare('DELETE FROM cart_items WHERE sessionId=?').run(sessionId);
    res.json({ sessionId, items: [], total: 0, itemCount: 0 });
});

module.exports = router;
