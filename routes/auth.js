const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../data/database');
const { requireAdmin, JWT_SECRET, COOKIE_NAME, COOKIE_OPTS } = require('../middleware/authMiddleware');
const { logEvent } = require('../middleware/eventLog');

const router = express.Router();

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const admin = db.prepare('SELECT * FROM admins WHERE email=? AND active=1').get(email);
    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
        logEvent('', email, 'login_failed', 'auth', { email }, req.ip);
        return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role || 'admin', name: admin.name || '' },
        JWT_SECRET,
        { expiresIn: '8h' }
    );

    logEvent(admin.id, admin.email, 'login', 'auth', {}, req.ip);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({ ok: true, expiresIn: 28800, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
});

router.post('/logout', (req, res) => {
    const cookie = req.cookies?.[COOKIE_NAME];
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    const rawToken = cookie || bearer;
    if (rawToken) {
        try {
            const payload = jwt.verify(rawToken, JWT_SECRET);
            logEvent(payload.id, payload.email, 'logout', 'auth', {}, req.ip);
        } catch {}
    }
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Sesión cerrada' });
});

router.get('/me', requireAdmin, (req, res) => {
    res.json({ id: req.admin.id, email: req.admin.email, role: req.admin.role, name: req.admin.name });
});

// GET /api/auth/admins — listar admins (admin only)
router.get('/admins', requireAdmin, (req, res) => {
    const admins = db.prepare('SELECT id, email, name, role, active, createdAt FROM admins ORDER BY createdAt').all();
    res.json({ admins });
});

// POST /api/auth/admins — crear admin (admin only)
router.post('/admins', requireAdmin, (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    if (password.length < 8) return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });

    const exists = db.prepare('SELECT id FROM admins WHERE email=?').get(email);
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });

    const id = uuidv4();
    db.prepare('INSERT INTO admins (id,email,passwordHash,name,role,active,createdAt) VALUES (?,?,?,?,?,?,?)')
      .run(id, email.trim().toLowerCase(), bcrypt.hashSync(password, 12), name || '', role || 'admin', 1, new Date().toISOString());

    logEvent(req.admin.id, req.admin.email, 'create_admin', email, { name, role }, req.ip);
    res.status(201).json({ ok: true, id });
});

// PATCH /api/auth/admins/:id — activar/desactivar o cambiar contraseña (admin only)
router.patch('/admins/:id', requireAdmin, (req, res) => {
    const { active, password, name, role } = req.body;
    const target = db.prepare('SELECT * FROM admins WHERE id=?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Admin no encontrado' });
    // Prevent self-deactivation — compare strictly as boolean (active:false) or numeric 0
    const deactivating = active !== undefined && !active;
    if (req.params.id === req.admin.id && deactivating) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });

    if (active !== undefined) db.prepare('UPDATE admins SET active=? WHERE id=?').run(active ? 1 : 0, req.params.id);
    if (name !== undefined) db.prepare('UPDATE admins SET name=? WHERE id=?').run(name, req.params.id);
    if (role !== undefined) db.prepare('UPDATE admins SET role=? WHERE id=?').run(role, req.params.id);
    if (password) {
        if (password.length < 8) return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });
        db.prepare('UPDATE admins SET passwordHash=? WHERE id=?').run(bcrypt.hashSync(password, 12), req.params.id);
    }

    logEvent(req.admin.id, req.admin.email, 'update_admin', target.email, { active, name, role, passwordChanged: !!password }, req.ip);
    res.json({ ok: true });
});

// DELETE /api/auth/admins/:id — eliminar admin (no self-delete)
router.delete('/admins/:id', requireAdmin, (req, res) => {
    if (req.params.id === req.admin.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    const target = db.prepare('SELECT * FROM admins WHERE id=?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'Admin no encontrado' });
    db.prepare('DELETE FROM admins WHERE id=?').run(req.params.id);
    logEvent(req.admin.id, req.admin.email, 'delete_admin', target.email, {}, req.ip);
    res.json({ ok: true });
});

// GET /api/auth/logs — ver event log (admin only)
router.get('/logs', requireAdmin, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const logs = db.prepare('SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
    res.json({ logs });
});

module.exports = router;
