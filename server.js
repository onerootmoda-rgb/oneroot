require('dotenv').config();

const express      = require('express');
const path         = require('path');
const fs           = require('fs');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes      = require('./routes/auth');
const productRoutes   = require('./routes/products');
const cartRoutes      = require('./routes/cart');
const settingsRoutes  = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const ordersRoutes    = require('./routes/orders');
const designRoutes    = require('./routes/design');
const customersRoutes = require('./routes/customers');
const inventoryRoutes = require('./routes/inventory');
const db              = require('./data/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Gzip compression (must be first middleware) ───────────────────
app.use(compression({ level: 6, threshold: 1024 }));

// ── Security headers (helmet) ─────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc:  ["'self'"],
            scriptSrc:   ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:     ["'self'", "https://fonts.gstatic.com"],
            imgSrc:      ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com"],
            connectSrc:  ["'self'", "https://router.huggingface.co"],
            frameSrc:    ["'none'"],
            objectSrc:   ["'none'"],
            baseUri:     ["'self'"],
            formAction:  ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false    // Necesario para Google Fonts + CDN assets
}));

// ── CORS — solo orígenes configurados ────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, cb) => {
        // Allow server-to-server (no origin header) and configured origins
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('CORS no permitido: ' + origin));
    },
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Demasiadas solicitudes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ── Static assets ─────────────────────────────────────────────────
// uploads/ sirve imágenes de productos, colecciones, diseños y fondos
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d',  etag: true }));

// ── Cache-Control: no-store para rutas de API privadas ───────────
app.use('/api/cart',    (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api/orders',  (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api/auth',    (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// ── API routes ────────────────────────────────────────────────────
app.use('/api/auth/login',      loginLimiter);
app.use('/api/analytics/event', analyticsLimiter);
app.use('/api/analytics/track', analyticsLimiter);
app.use('/api/auth',      authRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/cart',      cartRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/orders',    ordersRoutes);
app.use('/api/design',    designRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/inventory', inventoryRoutes);
// ── React SPA (producción) ────────────────────────────────────────
// USE_REACT=true activa el modo SPA: Express sirve dist/index.html para cualquier
// ruta no-API, permitiendo que React Router maneje la navegación del lado cliente.
// En desarrollo (npm run dev en /client) Vite actúa como proxy y esta rama no aplica.
const DIST = path.join(__dirname, 'dist');
if (process.env.USE_REACT === 'true' && fs.existsSync(path.join(DIST, 'index.html'))) {
    app.use(express.static(DIST, { maxAge: '1d', etag: true }));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(DIST, 'index.html'));
    });
    console.log('[react] Serving React SPA from /dist');
}

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err.message);
    res.status(err.status || 500).json({ error: 'Error interno del servidor.' });
});

// ── SQLite WAL checkpoint (cada 30 min) ──────────────────────────
setInterval(() => {
    try { db.pragma('wal_checkpoint(PASSIVE)'); } catch (e) {}
}, 30 * 60 * 1000);

// ── Backup automático de SQLite (cada 6h, mantiene los últimos 7) ─
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');
async function runBackup() {
    try {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const dest  = path.join(BACKUP_DIR, `oneroot-${stamp}.db`);
        await db.backup(dest);
        // Mantener solo los últimos 7 backups
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('oneroot-') && f.endsWith('.db'))
            .sort();
        while (files.length > 7) {
            try { fs.unlinkSync(path.join(BACKUP_DIR, files.shift())); } catch {}
        }
        console.log(`[backup] SQLite → ${path.basename(dest)}`);
    } catch (e) {
        console.error('[backup] Error:', e.message);
    }
}
runBackup();
setInterval(runBackup, 6 * 60 * 60 * 1000);

// ── Limpieza de archivos temporales generados (cada 24h) ─────────
// Borra archivos en uploads/generated/ y uploads/composites/ con más de 7 días
function cleanOldUploads() {
    const DIRS    = ['uploads/generated', 'uploads/composites'];
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días en ms
    const cutoff  = Date.now() - MAX_AGE;
    let deleted = 0;
    for (const dir of DIRS) {
        const full = path.join(__dirname, dir);
        if (!fs.existsSync(full)) continue;
        for (const file of fs.readdirSync(full)) {
            try {
                const fp = path.join(full, file);
                if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); deleted++; }
            } catch {}
        }
    }
    if (deleted > 0) console.log(`[cleanup] ${deleted} archivo(s) temporales eliminados`);
}
cleanOldUploads(); // ejecutar al arrancar también
setInterval(cleanOldUploads, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`\nONE ROOT → http://localhost:${PORT}`);
    console.log(`Admin    → http://localhost:${PORT}/admin/login`);
    console.log(`Env      → ${process.env.ADMIN_EMAIL || 'sin ADMIN_EMAIL en .env'}\n`);
});
