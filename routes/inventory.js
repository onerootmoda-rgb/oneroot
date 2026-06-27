const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const db = require('../data/database');
const { requireAdmin } = require('../middleware/authMiddleware');
const { logEvent } = require('../middleware/eventLog');

const router = express.Router();

const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = file.mimetype === 'text/csv' ||
                   file.mimetype === 'application/vnd.ms-excel' ||
                   file.originalname.toLowerCase().endsWith('.csv');
        cb(ok ? null : new Error('Solo archivos CSV'), ok);
    }
});

function splitCSVLine(line) {
    const result = [];
    let inQuote = false, cur = '';
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuote = !inQuote; }
        } else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
        else { cur += ch; }
    }
    result.push(cur);
    return result;
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map(h => h.trim());
    return lines.slice(1)
        .map(line => {
            const vals = splitCSVLine(line);
            const obj = {};
            headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
            return obj;
        })
        .filter(row => Object.values(row).some(v => v !== ''));
}

// ── Calcula reservados y vendidos por productId+talla ─────────────
function calcOrderStats() {
    const orders = db.prepare(
        "SELECT items, status FROM orders WHERE status IN ('pending','processing','completed')"
    ).all();

    const reserved = {}; // `${productId}-${size}` → qty
    const sold     = {};

    orders.forEach(o => {
        let items;
        try { items = JSON.parse(o.items || '[]'); } catch { items = []; }
        items.forEach(item => {
            const key = `${item.productId}-${item.size}`;
            if (o.status === 'pending' || o.status === 'processing') {
                reserved[key] = (reserved[key] || 0) + (item.quantity || 0);
            } else if (o.status === 'completed') {
                sold[key] = (sold[key] || 0) + (item.quantity || 0);
            }
        });
    });

    return { reserved, sold };
}

// GET /api/inventory — lista completa con cálculos (admin only)
router.get('/', requireAdmin, (req, res) => {
    const { productId } = req.query;
    let sql = `
        SELECT i.*, p.name AS productName, p.price AS precioVenta
        FROM inventory i
        JOIN products p ON i.productId = p.id
    `;
    const params = [];
    if (productId) { sql += ' WHERE i.productId = ?'; params.push(productId); }
    sql += ' ORDER BY p.name, i.color, i.talla';

    const rows = db.prepare(sql).all(...params);
    const { reserved, sold } = calcOrderStats();

    const inventory = rows.map(r => {
        const key        = `${r.productId}-${r.talla}`;
        const reservados = reserved[key] || 0;
        const vendidas   = sold[key]     || 0;
        const disponible = Math.max(0, r.stock - reservados);
        return {
            ...r,
            reservados,
            vendidas,
            disponible,
            valorInventario: parseFloat((disponible * r.costo).toFixed(0)),
        };
    });

    // Totales generales
    const totales = {
        totalStock:          inventory.reduce((s, r) => s + r.stock,          0),
        totalDisponible:     inventory.reduce((s, r) => s + r.disponible,     0),
        totalReservados:     inventory.reduce((s, r) => s + r.reservados,     0),
        totalVendidas:       inventory.reduce((s, r) => s + r.vendidas,       0),
        totalValorInventario:inventory.reduce((s, r) => s + r.valorInventario,0),
    };

    res.json({ inventory, totales });
});

// GET /api/inventory/products — lista de productos para el selector
router.get('/products', requireAdmin, (req, res) => {
    const rows = db.prepare('SELECT id, name, price, sku FROM products ORDER BY name').all();
    res.json({ products: rows });
});

// POST /api/inventory/import-csv  (admin only)  — must be before /:id
router.post('/import-csv', requireAdmin, csvUpload.single('csv'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Archivo CSV requerido' });

    const text = req.file.buffer.toString('utf-8').replace(/^﻿/, '');
    const rows = parseCSV(text);
    if (!rows.length) return res.status(400).json({ error: 'CSV vacío o sin filas de datos' });

    let created = 0, updated = 0, errors = 0;

    rows.forEach(row => {
        try {
            const productSku = (row.productSku || '').trim();
            const color = (row.color || '').trim();
            const talla = (row.talla || '').trim().toUpperCase();
            if (!talla) { errors++; return; }

            let productId = (row.productId || '').trim();
            if (!productId && productSku) {
                const p = db.prepare('SELECT id FROM products WHERE sku = ?').get(productSku);
                productId = p?.id || '';
            }
            if (!productId) { errors++; return; }

            const existing = db.prepare(
                'SELECT id FROM inventory WHERE productId=? AND LOWER(color)=LOWER(?) AND LOWER(talla)=LOWER(?)'
            ).get(productId, color, talla);

            const colorHex = (row.hex || row.colorHex || '#1a1a1a').trim();
            const tela     = (row.tela    || '').trim();
            const diseno   = (row.diseno  || '').trim();
            const stock    = parseInt(row.stock)  || 0;
            const costo    = parseFloat(row.costo) || 0;
            const sku      = (row.sku || '').trim();
            const now      = new Date().toISOString();

            if (existing) {
                db.prepare(`UPDATE inventory SET colorHex=?,tela=?,diseno=?,stock=?,costo=?,sku=?,updatedAt=? WHERE id=?`)
                    .run(colorHex, tela, diseno, stock, costo, sku, now, existing.id);
                updated++;
            } else {
                const id = uuidv4();
                db.prepare(`INSERT INTO inventory (id,productId,color,colorHex,tela,diseno,talla,stock,costo,sku,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
                    .run(id, productId, color, colorHex, tela, diseno, talla, stock, costo, sku, now);
                created++;
            }
        } catch (err) {
            console.error('[inventory import-csv]', err.message);
            errors++;
        }
    });

    logEvent(req.admin.id, req.admin.email, 'import_inventory_csv', null, { created, updated, errors }, req.ip);
    res.json({ created, updated, errors });
});

// POST /api/inventory — crear variante (admin only)
router.post('/', requireAdmin, (req, res) => {
    const { productId, color, colorHex, tela, diseno, talla, stock, costo, sku } = req.body;
    if (!productId || !talla) return res.status(400).json({ error: 'productId y talla son requeridos' });

    const product = db.prepare('SELECT id FROM products WHERE id=?').get(productId);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const id  = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO inventory (id, productId, color, colorHex, tela, diseno, talla, stock, costo, sku, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        productId,
        (color    || '').trim(),
        (colorHex || '#1a1a1a').trim(),
        (tela     || '').trim(),
        (diseno   || '').trim(),
        talla.trim().toUpperCase(),
        parseInt(stock)     || 0,
        parseFloat(costo)   || 0,
        (sku || '').trim(),
        now
    );

    logEvent(req.admin.id, req.admin.email, 'inventory_create', id, { productId, color, talla, stock }, req.ip);
    res.status(201).json({ id, ok: true });
});

// PUT /api/inventory/:id — actualizar variante (admin only)
router.put('/:id', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT id FROM inventory WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Variante no encontrada' });

    const { color, colorHex, tela, diseno, talla, stock, costo, sku } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
        UPDATE inventory
        SET color=?, colorHex=?, tela=?, diseno=?, talla=?, stock=?, costo=?, sku=?, updatedAt=?
        WHERE id=?
    `).run(
        (color    || '').trim(),
        (colorHex || '#1a1a1a').trim(),
        (tela     || '').trim(),
        (diseno   || '').trim(),
        (talla    || '').trim().toUpperCase(),
        parseInt(stock)    || 0,
        parseFloat(costo)  || 0,
        (sku || '').trim(),
        now,
        req.params.id
    );

    logEvent(req.admin.id, req.admin.email, 'inventory_update', req.params.id, { stock, costo }, req.ip);
    res.json({ ok: true });
});

// DELETE /api/inventory/:id — eliminar variante (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT id FROM inventory WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Variante no encontrada' });
    db.prepare('DELETE FROM inventory WHERE id=?').run(req.params.id);
    logEvent(req.admin.id, req.admin.email, 'inventory_delete', req.params.id, {}, req.ip);
    res.json({ ok: true });
});

module.exports = router;
