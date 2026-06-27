const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET no definido en .env — servidor no puede arrancar de forma segura.');
    process.exit(1);
}

const COOKIE_NAME = 'one-root-admin';
const COOKIE_OPTS = {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   8 * 60 * 60 * 1000   // 8h — igual que el JWT
};

function requireAdmin(req, res, next) {
    // 1. Prioridad: HttpOnly cookie (más segura)
    let token = req.cookies && req.cookies[COOKIE_NAME];

    // 2. Fallback: Authorization header (compatibilidad con clientes existentes)
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
    }

    if (!token) return res.status(401).json({ error: 'No autenticado' });

    try {
        req.admin = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = { requireAdmin, JWT_SECRET, COOKIE_NAME, COOKIE_OPTS };
