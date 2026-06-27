const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../data/database');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

function getSource(referrer, utmSource) {
    if (utmSource) return utmSource.charAt(0).toUpperCase() + utmSource.slice(1).toLowerCase();
    if (!referrer) return 'Directo';
    if (referrer.includes('google')) return 'Google';
    if (referrer.includes('instagram')) return 'Instagram';
    if (referrer.includes('facebook') || referrer.includes('fb.')) return 'Facebook';
    if (referrer.includes('whatsapp')) return 'WhatsApp';
    if (referrer.includes('tiktok')) return 'TikTok';
    if (referrer.includes('twitter') || referrer.includes('t.co')) return 'Twitter/X';
    return 'Otros';
}

const VALID_VID   = /^[a-z0-9_-]{4,64}$/i;
const VALID_EVENT = new Set(['view_product','add_to_cart','whatsapp_click','checkout_start','order_placed','designer_open']);

// POST /api/analytics/event — public
router.post('/event', (req, res) => {
    const visitorId  = typeof req.body.visitorId  === 'string' ? req.body.visitorId.slice(0, 64)  : '';
    const page       = typeof req.body.page       === 'string' ? req.body.page.slice(0, 200)      : '';
    const referrer   = typeof req.body.referrer   === 'string' ? req.body.referrer.slice(0, 300)  : '';
    const utmSource  = typeof req.body.utmSource  === 'string' ? req.body.utmSource.slice(0, 100) : '';
    const utmMedium  = typeof req.body.utmMedium  === 'string' ? req.body.utmMedium.slice(0, 100) : '';

    if (!VALID_VID.test(visitorId) || !page) return res.json({ ok: false });
    if (page.startsWith('/admin')) return res.json({ ok: false });

    // EXISTS es más rápido que COUNT(*) — para en el primer match
    const isNew = db.prepare('SELECT 1 FROM analytics_events WHERE visitorId = ? LIMIT 1').get(visitorId) ? 0 : 1;
    const source = getSource(referrer, utmSource);

    db.prepare(`INSERT INTO analytics_events (id,visitorId,page,referrer,utmSource,utmMedium,duration,isNew,timestamp)
        VALUES (?,?,?,?,?,?,0,?,?)`
    ).run(uuidv4(), visitorId, page, referrer, source, utmMedium, isNew, new Date().toISOString());

    res.json({ ok: true });
});

// POST /api/analytics/duration — public (sendBeacon)
router.post('/duration', (req, res) => {
    const visitorId = typeof req.body.visitorId === 'string' ? req.body.visitorId.slice(0, 64) : '';
    const page      = typeof req.body.page      === 'string' ? req.body.page.slice(0, 200)     : '';
    const duration  = req.body.duration;
    if (!VALID_VID.test(visitorId) || !page || !duration) return res.json({ ok: false });
    const secs = Math.min(Math.max(parseInt(duration) || 0, 0), 7200);
    db.prepare(`UPDATE analytics_events SET duration=? WHERE id=(
        SELECT id FROM analytics_events WHERE visitorId=? AND page=? ORDER BY timestamp DESC LIMIT 1
    ) AND duration=0`).run(secs, visitorId, page);
    res.json({ ok: true });
});

// POST /api/analytics/track — public, custom events (whitelist)
router.post('/track', (req, res) => {
    const visitorId = typeof req.body.visitorId === 'string' ? req.body.visitorId.slice(0, 64) : '';
    const event     = typeof req.body.event     === 'string' ? req.body.event.slice(0, 60)     : '';
    if (!VALID_VID.test(visitorId) || !VALID_EVENT.has(event)) return res.json({ ok: false });
    const data = req.body.data && typeof req.body.data === 'object' ? req.body.data : {};
    db.prepare('INSERT INTO analytics_custom_events (id,visitorId,event,data,timestamp) VALUES (?,?,?,?,?)')
        .run(uuidv4(), visitorId, event, JSON.stringify(data), new Date().toISOString());
    res.json({ ok: true });
});

// GET /api/analytics/summary — admin only
router.get('/summary', requireAdmin, (req, res) => {
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const totalViews     = db.prepare('SELECT COUNT(*) as n FROM analytics_events WHERE timestamp>?').get(since).n;
    const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT visitorId) as n FROM analytics_events WHERE timestamp>?').get(since).n;
    const newVisitors    = db.prepare('SELECT COUNT(DISTINCT visitorId) as n FROM analytics_events WHERE timestamp>? AND isNew=1').get(since).n;
    const avgDurationRow = db.prepare('SELECT AVG(CASE WHEN duration>0 THEN duration END) as avg FROM analytics_events WHERE timestamp>?').get(since);
    const avgDuration    = Math.round(avgDurationRow.avg || 0);

    const byDay = db.prepare(`
        SELECT strftime('%d/%m',timestamp) as day,
               COUNT(*) as views,
               COUNT(DISTINCT visitorId) as visitors
        FROM analytics_events WHERE timestamp>?
        GROUP BY strftime('%Y-%m-%d',timestamp)
        ORDER BY timestamp`).all(since);

    const sources = db.prepare(`
        SELECT utmSource as source, COUNT(*) as visits, COUNT(DISTINCT visitorId) as visitors
        FROM analytics_events WHERE timestamp>?
        GROUP BY utmSource ORDER BY visits DESC`).all(since);

    const topPages = db.prepare(`
        SELECT page, COUNT(*) as views, COUNT(DISTINCT visitorId) as visitors,
               CAST(AVG(CASE WHEN duration>0 THEN duration END) AS INTEGER) as avgDuration
        FROM analytics_events WHERE timestamp>?
        GROUP BY page ORDER BY views DESC LIMIT 8`).all(since);

    const costs = db.prepare('SELECT * FROM analytics_costs').all();

    const productViews   = db.prepare("SELECT COUNT(*) as n FROM analytics_custom_events WHERE event='view_product' AND timestamp>?").get(since).n;
    const addToCarts     = db.prepare("SELECT COUNT(*) as n FROM analytics_custom_events WHERE event='add_to_cart' AND timestamp>?").get(since).n;
    const whatsappClicks = db.prepare("SELECT COUNT(*) as n FROM analytics_custom_events WHERE event='whatsapp_click' AND timestamp>?").get(since).n;
    const uniqueCart     = db.prepare("SELECT COUNT(DISTINCT visitorId) as n FROM analytics_custom_events WHERE event='add_to_cart' AND timestamp>?").get(since).n;

    res.json({ totalViews, uniqueVisitors, newVisitors,
        returningVisitors: uniqueVisitors - newVisitors,
        avgDuration, byDay, sources, topPages, costs,
        productViews, addToCarts, whatsappClicks, uniqueCart });
});

// PUT /api/analytics/costs — admin only
router.put('/costs', requireAdmin, (req, res) => {
    const { costs } = req.body;
    if (!Array.isArray(costs)) return res.status(400).json({ error: 'Invalid' });
    const upsert = db.prepare('INSERT INTO analytics_costs(source,cpc) VALUES(?,?) ON CONFLICT(source) DO UPDATE SET cpc=excluded.cpc');
    db.transaction(() => costs.forEach(c => upsert.run(c.source, parseFloat(c.cpc) || 0)))();
    res.json({ ok: true });
});

module.exports = router;
