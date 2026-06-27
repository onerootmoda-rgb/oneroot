const express    = require('express');
const router     = express.Router();
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const rateLimit  = require('express-rate-limit');
const sharp      = require('sharp');
const { v4: uuidv4 } = require('uuid');
const db = require('../data/database');
const { requireAdmin } = require('../middleware/authMiddleware');
const { processAndSave, validateImageBuffer } = require('../middleware/imageProcessor');

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Borrar un archivo solo si está dentro de /uploads/ (previene path traversal)
const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
function safeUnlink(fileUrl) {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
    const target = path.resolve(__dirname, '..', fileUrl);
    if (target.startsWith(UPLOADS_ROOT + path.sep)) {
        try { fs.unlinkSync(target); } catch {}
    }
}

// ── Rate limiters ────────────────────────────────────────────────
const generateLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minuto
    max: 4,                    // 4 generaciones por IP por minuto
    message: { error: 'Demasiadas generaciones. Espera un momento e intenta de nuevo.' },
    standardHeaders: true,
    legacyHeaders: false
});

const compositeLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minuto
    max: 30,                   // 30 uploads por IP por minuto (para multi-capa)
    message: { error: 'Demasiadas subidas. Intenta de nuevo en un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ── POST /api/design/generate ─────────────────────────────────────
// Proxy hacia Hugging Face — la HF_TOKEN nunca llega al frontend
router.post('/generate', generateLimiter, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'Prompt requerido' });

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) return res.status(503).json({ error: 'HF_TOKEN no configurada en .env' });

    try {
        const hfRes = await fetch(
            'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: prompt })
            }
        );

        if (!hfRes.ok) {
            const txt = await hfRes.text();
            console.error('[HuggingFace]', hfRes.status, txt);
            const userMsg = hfRes.status === 503 ? 'El servicio de generación está ocupado. Intenta en unos segundos.'
                : hfRes.status === 429 ? 'Límite de generaciones alcanzado. Intenta más tarde.'
                : 'No se pudo generar la imagen. Intenta de nuevo.';
            return res.status(502).json({ error: userMsg });
        }

        const buffer   = Buffer.from(await hfRes.arrayBuffer());
        const filename = `gen-${Date.now()}-${uuidv4().slice(0, 8)}.png`;
        const outDir   = path.join(__dirname, '../uploads/generated');
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, filename), buffer);
        return res.json({ url: `/uploads/generated/${filename}` });
    } catch (e) {
        console.error('[HuggingFace]', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/design/catalog ───────────────────────────────────────
router.get('/catalog', (req, res) => {
    const rows = db.prepare('SELECT * FROM design_catalog ORDER BY createdAt DESC').all();
    res.json({ designs: rows });
});

// ── POST /api/design/catalog (admin) ─────────────────────────────
router.post('/catalog', requireAdmin, memUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });
    const { name = 'Sin nombre', category = 'General' } = req.body;
    try {
        const filename = `design-${Date.now()}-${uuidv4().slice(0, 8)}.webp`;
        const outPath  = path.join(__dirname, '../uploads/designs', filename);
        await processAndSave(req.file.buffer, outPath, 'product');
        const url = `/uploads/designs/${filename}`;
        const id  = uuidv4();
        db.prepare('INSERT INTO design_catalog (id,name,category,imageUrl,createdAt) VALUES (?,?,?,?,?)').run(
            id, name, category, url, new Date().toISOString()
        );
        res.json({ id, name, category, imageUrl: url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/design/catalog/:id (admin) ───────────────────────
router.delete('/catalog/:id', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT imageUrl FROM design_catalog WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    safeUnlink(row.imageUrl);
    db.prepare('DELETE FROM design_catalog WHERE id=?').run(req.params.id);
    res.json({ ok: true });
});

// ── POST /api/design/save-composite (guarda el resultado final) ──
router.post('/save-composite', compositeLimiter, memUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });

    try {
        await validateImageBuffer(req.file.buffer);
    } catch {
        return res.status(400).json({ error: 'El archivo no es una imagen válida o el formato no está permitido' });
    }

    try {
        const filename = `composite-${Date.now()}-${uuidv4().slice(0, 8)}.webp`;
        const outPath  = path.join(__dirname, '../uploads/composites', filename);
        await processAndSave(req.file.buffer, outPath, 'product');
        res.json({ url: `/uploads/composites/${filename}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/design/garments ──────────────────────────────────────
router.get('/garments', (req, res) => {
    const rows = db.prepare('SELECT * FROM garment_templates ORDER BY createdAt DESC').all();
    res.json({ garments: rows });
});

// ── POST /api/design/garments (admin) — acepta front + back ──────
router.post('/garments', requireAdmin, memUpload.fields([{ name: 'front', maxCount: 1 }, { name: 'back', maxCount: 1 }]), async (req, res) => {
    const frontFile = req.files && req.files['front'] && req.files['front'][0];
    if (!frontFile) return res.status(400).json({ error: 'Imagen frontal requerida' });
    const { name = 'Prenda' } = req.body;
    try {
        await validateImageBuffer(frontFile.buffer);
        const backFile = req.files && req.files['back'] && req.files['back'][0];
        if (backFile) await validateImageBuffer(backFile.buffer);
        const saveFile = async (buf, prefix) => {
            const filename = `${prefix}-${Date.now()}-${uuidv4().slice(0, 8)}.webp`;
            const outPath  = path.join(__dirname, '../uploads/garments', filename);
            await processAndSave(buf, outPath, 'product');
            return `/uploads/garments/${filename}`;
        };
        const frontUrl = await saveFile(frontFile.buffer, 'garment-front');
        const backUrl  = backFile ? await saveFile(backFile.buffer, 'garment-back') : '';
        const id = uuidv4();
        db.prepare('INSERT INTO garment_templates (id,name,imageUrl,backImageUrl,createdAt) VALUES (?,?,?,?,?)').run(
            id, name, frontUrl, backUrl, new Date().toISOString()
        );
        res.json({ id, name, imageUrl: frontUrl, backImageUrl: backUrl });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// ── DELETE /api/design/garments/:id (admin) ──────────────────────
router.delete('/garments/:id', requireAdmin, (req, res) => {
    const row = db.prepare('SELECT imageUrl, backImageUrl FROM garment_templates WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    safeUnlink(row.imageUrl);
    safeUnlink(row.backImageUrl);
    db.prepare('DELETE FROM garment_templates WHERE id=?').run(req.params.id);
    res.json({ ok: true });
});

module.exports = router;
