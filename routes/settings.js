const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../data/database');
const { requireAdmin } = require('../middleware/authMiddleware');
const { logEvent } = require('../middleware/eventLog');

const { processAndSave, validateImageBuffer } = require('../middleware/imageProcessor');
const router = express.Router();

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const DEFAULTS = {
    heroBadge: 'ESTABLISHED MMXXIV',
    heroTitle: 'URBAN\nSTRUCTURE',
    heroSubtitle: 'Redefining the metropolitan silhouette through architectural integrity and minimalist raw grit.',
    heroBg: '',
    arrivalsTitle: 'NOVEDADES',
    collectionsTitle: 'COLLECTIONS',
    collectionsSubtitle: 'Curated architectural staples.'
};

function getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const map = {};
    rows.forEach(r => { try { map[r.key] = JSON.parse(r.value); } catch { map[r.key] = r.value; } });
    return Object.assign({}, DEFAULTS, map);
}

// GET /api/settings/home — public
router.get('/home', (req, res) => {
    res.json(getSettings());
});

// PUT /api/settings/home — admin only
router.put('/home', requireAdmin, (req, res) => {
    const allowed = Object.keys(DEFAULTS);
    const upsert = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    db.transaction(() => {
        allowed.forEach(k => {
            if (req.body[k] !== undefined) upsert.run(k, JSON.stringify(req.body[k]));
        });
    })();
    logEvent(req.admin.id, req.admin.email, 'update_home_settings', 'settings', {}, req.ip);
    res.json(getSettings());
});

// GET /api/settings/collections — public
router.get('/collections', (req, res) => {
    const row = db.prepare("SELECT value FROM settings WHERE key='homeCollections'").get();
    const DEFAULT_COLLECTIONS = [
        { id: '1', name: 'CORE ESSENTIALS', label: '', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRK7AOXicWrPGMbsXnlwTV-_Hc6PMSqTV0oR0ZYT9Kc0ajyEoMjVIiZYOWnYFFFgldRFU4ZKM6Wx7g_dPFmPfF2xi37yg5nIpd0UJd1ntonOVafYWjQIt9snjoJF3Xlkq0KrYd20RdwnwLdiW2-WBH29Q8Rh2tqkz0KVoP79URXX8qHJjaiHKOqZZYBgnQ3ekHF_Vy6E8D4oh2d7HSsd9F8k8BCNCbXTr-ZUCaFNulsCqwetnA63i-pGxlBN2Uw3NUO3hFOR3OoUgH', link: '/catalog', featured: true },
        { id: '2', name: 'URBAN NOISE', label: 'SERIES 02', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0DtZ7L6vUWMMP_ZS99cDjfehW8wvFFrfQAM8uB5vRxAEk6HUUM-Rzv-_LNSKVmGAlKBqsefJWuFT1e-kv1bhy0u4IqJqVX1W3lMADOI_Tl6V3LaOfGbiW8W5AOXr6HHsa4U39AE8Z4U2op1-TAvwU3uJtTnLrlXCX-ZlPNDpaNyQK4oGBFkUCDpRvbBbNAiy1fhPi6-la3rwfcLuZCXZ7z-_pTirD25segdtT8j9V-2XVoak_XEM9clKNFyyT1EJFEXuUPOPtsC0', link: '/catalog?category=tops', featured: false },
        { id: '3', name: 'METRO UNIFORM', label: 'LIMITED RUN', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4ae2tkrKhB_U0hRdUfD-1TkQ8NivCWR3M0rvKY8TYwBu3_1o4i5iboExi9i3ef6I2Qp2VZGMQy4eh698y5FCPsDTljf0gvjnyFYtY65tTBbjVdgjnEXNhuoCmRTuNbtHOL4oywCv5KagKedVrao2gCOpt0TBaPp5wwq_DFYBF5EPlNj2TQO99HBoJnhJdw5syrywSROFD9fQSzPTbYVvjb_MdE21IDFi3wxuY5DZHIWFignpbuNo966oLWfXWoldCAPPUVIkFrkpi', link: '/catalog', featured: false }
    ];
    try {
        res.json({ collections: row ? JSON.parse(row.value) : DEFAULT_COLLECTIONS });
    } catch { res.json({ collections: DEFAULT_COLLECTIONS }); }
});

// PUT /api/settings/collections — admin only
router.put('/collections', requireAdmin, (req, res) => {
    const { collections } = req.body;
    if (!Array.isArray(collections)) return res.status(400).json({ error: 'collections debe ser array' });
    db.prepare("INSERT INTO settings (key,value) VALUES ('homeCollections',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(JSON.stringify(collections));
    logEvent(req.admin.id, req.admin.email, 'update_collections', 'settings', { count: collections.length }, req.ip);
    res.json({ ok: true });
});

// POST /api/settings/hero-image — admin only, upload + compress hero
router.post('/hero-image', requireAdmin, memUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    try {
        await validateImageBuffer(req.file.buffer);
        const filename = `hero-${Date.now()}.webp`;
        const outPath = path.join(__dirname, '../uploads/settings', filename);
        await processAndSave(req.file.buffer, outPath, 'hero');
        const url = `/uploads/settings/${filename}`;
        db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('heroBg', JSON.stringify(url));
        res.json({ url });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// POST /api/settings/collection-image — admin only, upload + compress collection image
router.post('/collection-image', requireAdmin, memUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    try {
        await validateImageBuffer(req.file.buffer);
        const filename = `coll-${Date.now()}.webp`;
        const outPath = path.join(__dirname, '../uploads/collections', filename);
        await processAndSave(req.file.buffer, outPath, 'collection');
        const url = `/uploads/collections/${filename}`;
        logEvent(req.admin.id, req.admin.email, 'upload_collection_image', 'settings', { file: filename }, req.ip);
        res.json({ url });
    } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

module.exports = router;
