const { v4: uuidv4 } = require('uuid');
const db = require('../data/database');

function logEvent(adminId, adminEmail, action, target, detail, ip) {
    try {
        db.prepare('INSERT INTO event_logs (id,adminId,adminEmail,action,target,detail,ip,timestamp) VALUES (?,?,?,?,?,?,?,?)')
          .run(uuidv4(), adminId || '', adminEmail || '', action, target || '', JSON.stringify(detail || {}), ip || '', new Date().toISOString());
    } catch(e) {
        console.error('[eventLog]', e.message);
    }
}

module.exports = { logEvent };
