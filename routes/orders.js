const express = require('express');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const db = require('../data/database');
const { requireAdmin } = require('../middleware/authMiddleware');
const { logEvent } = require('../middleware/eventLog');
const { sendOrderConfirmation, sendAdminOrderAlert } = require('../middleware/mailer');
const router = express.Router();

const orderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { error: 'Demasiados pedidos. Intenta de nuevo en 10 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

function esc(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

function trim(str, max) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, max);
}

// POST /api/orders — place order (public)
router.post('/', orderLimiter, (req, res) => {
    const raw = req.body;
    const sessionId       = trim(raw.sessionId, 128);
    const customerName    = esc(trim(raw.customerName, 100));
    const customerPhone   = trim(raw.customerPhone, 20).replace(/[^0-9+\-\s()]/g, '');
    const customerAddress = esc(trim(raw.customerAddress, 300));
    const customerCity    = esc(trim(raw.customerCity, 100));
    const customerBarrio  = esc(trim(raw.customerBarrio, 100));
    const customerEmail   = trim(raw.customerEmail, 254).replace(/[^a-zA-Z0-9@._+\-]/g, '');
    const notes           = esc(trim(raw.notes, 500));

    if (!sessionId)      return res.status(400).json({ error: 'sessionId requerido' });
    if (!customerName)   return res.status(400).json({ error: 'Nombre es obligatorio' });
    if (!customerPhone)  return res.status(400).json({ error: 'Teléfono es obligatorio' });
    if (!customerAddress) return res.status(400).json({ error: 'Dirección es obligatoria' });
    if (!customerCity)   return res.status(400).json({ error: 'Ciudad es obligatoria' });

    const cartRows = db.prepare(`
        SELECT ci.productId, ci.size, ci.quantity, p.name, p.price, p.images
        FROM cart_items ci JOIN products p ON ci.productId = p.id
        WHERE ci.sessionId = ?
    `).all(sessionId);

    if (cartRows.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

    // Re-verificar stock actual y construir items en una transacción atómica
    let items;
    try {
        items = db.transaction(() => {
            const built = [];
            for (const r of cartRows) {
                const product = db.prepare('SELECT stock, totalStock, status FROM products WHERE id=?').get(r.productId);
                if (!product) throw Object.assign(new Error(`Producto ${r.name} ya no está disponible`), { status: 409 });

                const stock = JSON.parse(product.stock || '{}');
                const available = stock[r.size] || 0;
                if (available < r.quantity) {
                    throw Object.assign(
                        new Error(`Stock insuficiente para ${r.name} talla ${r.size}. Disponible: ${available}`),
                        { status: 409 }
                    );
                }

                // Descontar stock de forma atómica
                stock[r.size] = available - r.quantity;
                const newTotal = Object.values(stock).reduce((a, b) => a + Number(b), 0);
                db.prepare(
                    'UPDATE products SET stock=?, totalStock=?, status=? WHERE id=?'
                ).run(
                    JSON.stringify(stock),
                    newTotal,
                    newTotal > 0 ? 'active' : 'sold-out',
                    r.productId
                );

                built.push({
                    productId: r.productId,
                    name: r.name,
                    price: r.price,
                    size: r.size,
                    quantity: r.quantity,
                    image: JSON.parse(r.images || '[]')[0] || ''
                });
            }
            return built;
        })();
    } catch (e) {
        return res.status(e.status || 500).json({ error: e.message });
    }

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const id = 'ORD-' + Date.now().toString(36).toUpperCase().slice(-6) + uuidv4().slice(0,4).toUpperCase();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO orders (id,sessionId,customerName,customerPhone,customerEmail,customerAddress,customerCity,customerBarrio,items,total,status,notes,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,'pending',?,?,?)`
    ).run(id, sessionId, customerName, customerPhone, customerEmail, customerAddress, customerCity, customerBarrio, JSON.stringify(items), total, notes, now, now);

    db.prepare('DELETE FROM cart_items WHERE sessionId = ?').run(sessionId);

    logEvent('', customerName, 'order_placed', id, { total, city: customerCity, items: items.length }, req.ip);

    // Emails asíncronos — no bloquean la respuesta
    sendOrderConfirmation({ orderId: id, customerName, customerEmail, customerPhone, customerAddress, customerCity, customerBarrio, items, total }).catch(() => {});
    sendAdminOrderAlert({ orderId: id, customerName, customerPhone, customerCity, items, total }).catch(() => {});

    res.json({ ok: true, orderId: id });
});

// GET /api/orders — admin only (?status=&page=1&limit=50&q=nombre)
router.get('/', requireAdmin, (req, res) => {
    const { status } = req.query;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const q      = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

    const conditions = [];
    const params     = [];

    if (status && status !== 'all') { conditions.push('status=?'); params.push(status); }
    if (q) {
        conditions.push('(LOWER(customerName) LIKE ? OR customerPhone LIKE ? OR id LIKE ?)');
        const like = `%${q.toLowerCase()}%`;
        params.push(like, `%${q}%`, `%${q.toUpperCase()}%`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const total = db.prepare(`SELECT COUNT(*) as n FROM orders ${where}`).get(...params).n;
    const rows  = db.prepare(`SELECT * FROM orders ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    res.json({
        orders: rows.map(o => ({ ...o, items: JSON.parse(o.items || '[]') })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
});

// GET /api/orders/recent — admin only (last 10)
router.get('/recent', requireAdmin, (req, res) => {
    const rows = db.prepare(
        'SELECT id, customerName, customerCity, createdAt, status, total FROM orders ORDER BY createdAt DESC LIMIT 10'
    ).all();
    res.json({ orders: rows });
});

// GET /api/orders/chart — admin only (last 7 days, daily counts + revenue)
router.get('/chart', requireAdmin, (req, res) => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const row = db.prepare(
            "SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM orders WHERE createdAt>=? AND createdAt<?"
        ).get(d.toISOString(), next.toISOString());
        data.push({ date: d.toISOString().slice(0, 10), count: row.count, revenue: row.revenue });
    }
    res.json({ data });
});

// GET /api/orders/stats — admin only
router.get('/stats', requireAdmin, (req, res) => {
    const totalOrders   = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
    const pending       = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status='pending'").get().n;
    const processing    = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status='processing'").get().n;
    const completed     = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status='completed'").get().n;
    const cancelled     = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status='cancelled'").get().n;
    const totalRevenue  = db.prepare("SELECT COALESCE(SUM(total),0) as n FROM orders WHERE status='completed'").get().n;
    const avgOrder      = db.prepare('SELECT COALESCE(AVG(total),0) as n FROM orders').get().n;

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const monthRevenue = db.prepare("SELECT COALESCE(SUM(total),0) as n FROM orders WHERE status='completed' AND createdAt>=?").get(monthStart.toISOString()).n;
    const monthOrders  = db.prepare('SELECT COUNT(*) as n FROM orders WHERE createdAt>=?').get(monthStart.toISOString()).n;

    const totalProducts  = db.prepare('SELECT COUNT(*) as n FROM products').get().n;
    const activeProducts = db.prepare("SELECT COUNT(*) as n FROM products WHERE status='active'").get().n;

    res.json({ totalOrders, pending, processing, completed, cancelled, totalRevenue, avgOrder, monthRevenue, monthOrders, totalProducts, activeProducts });
});

// PATCH /api/orders/:id — admin only
router.patch('/:id', requireAdmin, (req, res) => {
    const { status, notes } = req.body;
    const valid = ['pending', 'processing', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const prev = db.prepare('SELECT status FROM orders WHERE id=?').get(req.params.id);
    db.prepare('UPDATE orders SET status=?,notes=?,updatedAt=? WHERE id=?')
        .run(status, notes !== undefined ? notes : '', new Date().toISOString(), req.params.id);
    logEvent(req.admin.id, req.admin.email, 'order_status_changed', req.params.id, { from: prev?.status, to: status }, req.ip);
    res.json({ ok: true });
});

module.exports = router;
