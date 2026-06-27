const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../data/database');
const { requireAdmin } = require('../middleware/authMiddleware');
const { logEvent } = require('../middleware/eventLog');

const { processAndSave } = require('../middleware/imageProcessor');
const router = express.Router();

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const ALLOWED_EXTS  = /\.(jpg|jpeg|png|webp|gif|avif)$/i;

// Memory storage — sharp processes before writing to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.test(file.originalname);
        cb(ok ? null : new Error('Tipo de archivo no permitido'), ok);
    }
});

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

function parse(row) {
    if (!row) return null;
    let colors;
    try {
        const raw = JSON.parse(row.colors || '[]');
        colors = Array.isArray(raw) ? raw : (raw && raw.name ? [raw] : []);
    } catch(e) { colors = []; }
    return {
        ...row,
        sizes: JSON.parse(row.sizes || '[]'),
        stock: JSON.parse(row.stock || '{}'),
        images: JSON.parse(row.images || '[]').filter(Boolean),
        tags: JSON.parse(row.tags || '[]'),
        colors,
    };
}

// GET /api/products
router.get('/', (req, res) => {
    const { category, search, status, size } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) { sql += ' AND LOWER(category) = LOWER(?)'; params.push(category); }
    if (search) {
        sql += ' AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(color) LIKE ?)';
        const q = `%${search.toLowerCase()}%`;
        params.push(q, q, q);
    }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    // Filtro de talla: la columna sizes es JSON, usamos LIKE para preseleccionar y luego filtro preciso en JS (única forma con SQLite sin extensiones JSON habilitadas)
    if (size) {
        const s = size.toUpperCase().replace(/[^A-Z0-9]/g, '');
        sql += ` AND sizes LIKE ? AND stock LIKE ?`;
        params.push(`%"${s}"%`, `%"${s}":%`);
    }
    sql += ' ORDER BY createdAt DESC';

    let products = db.prepare(sql).all(...params).map(parse);

    // Segundo pase exacto para descartar false-positives del LIKE (ej: "XL" dentro de "XXL")
    if (size) {
        const s = size.toUpperCase();
        products = products.filter(p => p.sizes.includes(s) && (p.stock[s] || 0) > 0);
    }

    res.json({ products, total: products.length });
});

// GET /api/products/export/excel  — must be before /:id
router.get('/export/excel', requireAdmin, async (req, res) => {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ONE ROOT Admin';
    wb.created = new Date();

    const ws = wb.addWorksheet('Catalog', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
        { header: 'ID', key: 'id', width: 14 },
        { header: 'SKU', key: 'sku', width: 16 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Color', key: 'color', width: 16 },
        { header: 'Price (USD)', key: 'price', width: 12 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Sizes', key: 'sizes', width: 22 },
        { header: 'Stock', key: 'stock', width: 30 },
        { header: 'Total Stock', key: 'totalStock', width: 13 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Badge', key: 'badge', width: 15 },
        { header: 'Tags', key: 'tags', width: 35 },
        { header: 'Description', key: 'description', width: 55 },
        { header: 'Images', key: 'images', width: 45 },
        { header: 'Created At', key: 'createdAt', width: 22 },
    ];

    const hdr = ws.getRow(1);
    hdr.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    hdr.alignment = { vertical: 'middle', horizontal: 'center' };
    hdr.height = 22;

    const products = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all().map(parse);
    products.forEach((p, i) => {
        const row = ws.addRow({
            id: p.id, sku: p.sku, name: p.name, color: p.color,
            price: p.price, category: p.category,
            sizes: p.sizes.join(', '),
            stock: Object.entries(p.stock).map(([s, q]) => `${s}:${q}`).join(', '),
            totalStock: p.totalStock, status: p.status,
            badge: p.badge || '', tags: p.tags.join(', '),
            description: p.description,
            images: p.images.join(' | '), createdAt: p.createdAt,
        });
        if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        row.alignment = { vertical: 'middle', wrapText: false };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="one-root-catalog-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
});

// POST /api/products/import-csv  (admin only)  — must be before /:id
router.post('/import-csv', requireAdmin, csvUpload.single('csv'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Archivo CSV requerido' });

    const text = req.file.buffer.toString('utf-8').replace(/^﻿/, '');
    const rows = parseCSV(text);
    if (!rows.length) return res.status(400).json({ error: 'CSV vacío o sin filas de datos' });

    const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const groups = {};
    rows.forEach(row => {
        const key = (row.name || '').trim();
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    let created = 0, updated = 0, errors = 0;

    for (const [productName, colorRows] of Object.entries(groups)) {
        try {
            const first = colorRows[0];
            const price = parseFloat(first.price) || 0;
            const category = (first.category || 'Otro').trim();
            const badge = (first.badge || '').trim() || null;
            const description = (first.description || '').trim();

            const colors = colorRows
                .filter(r => (r.color || '').trim())
                .map(r => {
                    const stock = {};
                    SIZES.forEach(s => {
                        const v = parseInt(r[s] || '0');
                        if (!isNaN(v) && v >= 0) stock[s] = v;
                    });
                    return { name: r.color.trim(), hex: (r.hex || '#1a1a1a').trim(), stock, images: [] };
                });

            const aggStock = {};
            colors.forEach(c => {
                Object.entries(c.stock).forEach(([s, q]) => { aggStock[s] = (aggStock[s] || 0) + q; });
            });
            const sizeArr = SIZES.filter(s => aggStock[s] !== undefined);
            const totalStock = Object.values(aggStock).reduce((a, b) => a + b, 0);

            const existing = db.prepare('SELECT * FROM products WHERE LOWER(name) = LOWER(?)').get(productName);
            if (existing) {
                const existingColors = JSON.parse(existing.colors || '[]');
                colors.forEach(nc => {
                    const found = existingColors.find(ec => (ec.name || '').toLowerCase() === nc.name.toLowerCase());
                    if (found) { found.stock = nc.stock; } else { existingColors.push(nc); }
                });
                const newAgg = {};
                existingColors.forEach(c => {
                    Object.entries(c.stock || {}).forEach(([s, q]) => { newAgg[s] = (newAgg[s] || 0) + q; });
                });
                const newTotal = Object.values(newAgg).reduce((a, b) => a + b, 0);
                db.prepare(`UPDATE products SET price=?,category=?,badge=?,description=?,sizes=?,stock=?,totalStock=?,colors=?,status=? WHERE id=?`)
                    .run(price, category, badge, description,
                        JSON.stringify(SIZES.filter(s => newAgg[s] !== undefined)),
                        JSON.stringify(newAgg), newTotal,
                        JSON.stringify(existingColors),
                        newTotal > 0 ? 'active' : 'sold-out',
                        existing.id);
                updated++;
            } else {
                const id = uuidv4();
                const count = db.prepare('SELECT COUNT(*) as n FROM products').get().n;
                const sku = `OR-${category.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;
                db.prepare(`INSERT INTO products (id,sku,name,color,price,category,sizes,stock,totalStock,status,badge,description,images,tags,colors,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
                    .run(id, sku, productName, colors[0]?.name || '', price, category,
                        JSON.stringify(sizeArr), JSON.stringify(aggStock), totalStock,
                        totalStock > 0 ? 'active' : 'sold-out',
                        badge, description, '[]', '[]',
                        JSON.stringify(colors), new Date().toISOString());
                created++;
            }
        } catch (err) {
            console.error('[import-csv] Error en', productName, err.message);
            errors++;
        }
    }

    logEvent(req.admin.id, req.admin.email, 'import_products_csv', null, { created, updated, errors }, req.ip);
    res.json({ created, updated, errors, total: Object.keys(groups).length });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
    const product = parse(db.prepare('SELECT * FROM products WHERE id = ? OR sku = ?').get(req.params.id, req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
});

// POST /api/products  (admin only)
router.post('/', requireAdmin, (req, res) => {
    const { name, color, price, category, sizes, stock, description, badge, tags, colors } = req.body;
    if (!name || price === undefined || !category) {
        return res.status(400).json({ error: 'name, price, and category are required' });
    }

    let sizeArr, stockObj, colorsJson;
    if (Array.isArray(colors) && colors.length > 0 && colors.some(c => c.stock && Object.keys(c.stock).length > 0)) {
        const aggStock = {};
        colors.forEach(c => {
            Object.entries(c.stock || {}).forEach(([s, q]) => { aggStock[s] = (aggStock[s] || 0) + (parseInt(q) || 0); });
        });
        sizeArr = sizes || [...new Set(colors.flatMap(c => Object.keys(c.stock || {})))];
        stockObj = aggStock;
        colorsJson = JSON.stringify(colors);
    } else {
        sizeArr = sizes || ['S', 'M', 'L', 'XL'];
        stockObj = stock || Object.fromEntries(sizeArr.map(s => [s, 0]));
        colorsJson = JSON.stringify(colors || []);
    }

    const totalStock = Object.values(stockObj).reduce((a, b) => a + Number(b), 0);
    const count = db.prepare('SELECT COUNT(*) as n FROM products').get().n;

    const id = uuidv4();
    const sku = `OR-${category.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;

    db.prepare(`
        INSERT INTO products (id,sku,name,color,price,category,sizes,stock,totalStock,status,badge,description,images,tags,colors,createdAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
        id, sku, name, color || (colors?.[0]?.name || ''), parseFloat(price), category,
        JSON.stringify(sizeArr), JSON.stringify(stockObj), totalStock,
        totalStock > 0 ? 'active' : 'sold-out',
        badge || null, description || '', '[]',
        JSON.stringify(tags || []),
        colorsJson,
        new Date().toISOString()
    );

    logEvent(req.admin.id, req.admin.email, 'create_product', id, { name, sku, category }, req.ip);
    res.status(201).json(parse(db.prepare('SELECT * FROM products WHERE id = ?').get(id)));
});

// PUT /api/products/:id  (admin only)
router.put('/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { name, color, price, category, sizes, stock, status, badge, description, tags, colors } = req.body;

    let sizeArr, stockObj, colorsJson;
    if (Array.isArray(colors) && colors.length > 0 && colors.some(c => c.stock && Object.keys(c.stock).length > 0)) {
        const aggStock = {};
        colors.forEach(c => {
            Object.entries(c.stock || {}).forEach(([s, q]) => { aggStock[s] = (aggStock[s] || 0) + (parseInt(q) || 0); });
        });
        sizeArr = sizes || [...new Set(colors.flatMap(c => Object.keys(c.stock || {})))];
        stockObj = aggStock;
        colorsJson = JSON.stringify(colors);
    } else {
        sizeArr = sizes || JSON.parse(existing.sizes || '[]');
        stockObj = stock || JSON.parse(existing.stock || '{}');
        colorsJson = JSON.stringify(colors !== undefined ? colors : JSON.parse(existing.colors || '[]'));
    }

    const totalStock = Object.values(stockObj).reduce((a, b) => a + Number(b), 0);

    db.prepare(`
        UPDATE products
        SET name=?,color=?,price=?,category=?,sizes=?,stock=?,totalStock=?,status=?,badge=?,description=?,tags=?,colors=?
        WHERE id=?
    `).run(
        name || existing.name,
        color !== undefined ? color : existing.color,
        price !== undefined ? parseFloat(price) : existing.price,
        category || existing.category,
        JSON.stringify(sizeArr), JSON.stringify(stockObj), totalStock,
        status || (totalStock > 0 ? 'active' : 'sold-out'),
        badge !== undefined ? (badge || null) : existing.badge,
        description !== undefined ? description : existing.description,
        JSON.stringify(tags || JSON.parse(existing.tags || '[]')),
        colorsJson,
        req.params.id
    );

    logEvent(req.admin.id, req.admin.email, 'update_product', req.params.id, { name: name || existing.name }, req.ip);
    res.json(parse(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)));
});

// DELETE /api/products/:id  (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM cart_items WHERE productId = ?').run(req.params.id);

    const uploadDir = path.join(__dirname, '../uploads/products', req.params.id);
    if (fs.existsSync(uploadDir)) fs.rmSync(uploadDir, { recursive: true, force: true });

    logEvent(req.admin.id, req.admin.email, 'delete_product', req.params.id, { name: existing.name }, req.ip);
    res.json({ message: 'Product deleted' });
});

// POST /api/products/:id/images  (admin only) — upload + compress images
router.post('/:id/images', requireAdmin, upload.array('images', 10), async (req, res) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    try {
        const current = JSON.parse(existing.images || '[]');
        const newOnes = [];
        for (const file of (req.files || [])) {
            const filename = `${Date.now()}-${uuidv4().slice(0, 8)}.webp`;
            const outPath = path.join(__dirname, '../uploads/products', req.params.id, filename);
            await processAndSave(file.buffer, outPath, 'product');
            newOnes.push(`/uploads/products/${req.params.id}/${filename}`);
        }
        const all = [...current, ...newOnes].filter(Boolean);
        db.prepare('UPDATE products SET images = ? WHERE id = ?').run(JSON.stringify(all), req.params.id);
        res.json({ images: all });
    } catch (e) {
        res.status(500).json({ error: 'Error procesando imagen: ' + e.message });
    }
});

// DELETE /api/products/:id/images  (admin only) — delete one image by URL
router.delete('/:id/images', requireAdmin, (req, res) => {
    const { imageUrl } = req.body;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const images = JSON.parse(existing.images || '[]').filter(img => img !== imageUrl);
    db.prepare('UPDATE products SET images = ? WHERE id = ?').run(JSON.stringify(images), req.params.id);

    if (imageUrl && imageUrl.startsWith('/uploads/')) {
        const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
        const target      = path.resolve(__dirname, '..', imageUrl);
        // Rechazar si la ruta resuelta sale de /uploads/ (path traversal)
        if (target.startsWith(uploadsRoot + path.sep)) {
            try { fs.unlinkSync(target); } catch {}
        }
    }

    res.json({ images });
});

module.exports = router;
