require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'oneroot.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '',
        price REAL NOT NULL,
        category TEXT NOT NULL,
        sizes TEXT DEFAULT '[]',
        stock TEXT DEFAULT '{}',
        totalStock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        badge TEXT,
        description TEXT DEFAULT '',
        images TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
        sessionId TEXT NOT NULL,
        productId TEXT NOT NULL,
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (sessionId, productId, size)
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        visitorId TEXT NOT NULL,
        page TEXT NOT NULL,
        referrer TEXT DEFAULT '',
        utmSource TEXT DEFAULT '',
        utmMedium TEXT DEFAULT '',
        duration INTEGER DEFAULT 0,
        isNew INTEGER DEFAULT 1,
        timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_costs (
        source TEXT PRIMARY KEY,
        cpc REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_custom_events (
        id TEXT PRIMARY KEY,
        visitorId TEXT NOT NULL,
        event TEXT NOT NULL,
        data TEXT DEFAULT '{}',
        timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        sessionId TEXT DEFAULT '',
        customerName TEXT DEFAULT '',
        customerPhone TEXT DEFAULT '',
        customerAddress TEXT DEFAULT '',
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    );
`);

// Performance indexes — IF NOT EXISTS is idempotent, safe to run every startup
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_session   ON orders(sessionId);
    CREATE INDEX IF NOT EXISTS idx_products_cat     ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_status  ON products(status);
    CREATE INDEX IF NOT EXISTS idx_cart_session     ON cart_items(sessionId);
    CREATE INDEX IF NOT EXISTS idx_analytics_ts     ON analytics_events(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_page   ON analytics_events(page);
    CREATE INDEX IF NOT EXISTS idx_analytics_vis    ON analytics_events(visitorId);
    CREATE INDEX IF NOT EXISTS idx_custom_event     ON analytics_custom_events(event, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_custom_vis       ON analytics_custom_events(visitorId);
`);

// Migrations
try { db.prepare("ALTER TABLE products ADD COLUMN colors TEXT DEFAULT '[]'").run(); } catch(e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN customerEmail TEXT DEFAULT ''").run(); } catch(e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN customerCity TEXT DEFAULT ''").run(); } catch(e) {}
try { db.prepare("ALTER TABLE orders ADD COLUMN customerBarrio TEXT DEFAULT ''").run(); } catch(e) {}
try { db.prepare("ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'admin'").run(); } catch(e) {}
try { db.prepare("ALTER TABLE admins ADD COLUMN active INTEGER DEFAULT 1").run(); } catch(e) {}
try { db.prepare("ALTER TABLE admins ADD COLUMN name TEXT DEFAULT ''").run(); } catch(e) {}
try { db.prepare("ALTER TABLE admins ADD COLUMN createdAt TEXT DEFAULT ''").run(); } catch(e) {}
try { db.exec("CREATE TABLE IF NOT EXISTS event_logs (id TEXT PRIMARY KEY, adminId TEXT DEFAULT '', adminEmail TEXT DEFAULT '', action TEXT NOT NULL, target TEXT DEFAULT '', detail TEXT DEFAULT '{}', ip TEXT DEFAULT '', timestamp TEXT NOT NULL)"); } catch(e) {}
try { db.exec("CREATE TABLE IF NOT EXISTS design_catalog (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT 'General', imageUrl TEXT NOT NULL, createdAt TEXT NOT NULL)"); } catch(e) {}
try { db.exec("CREATE TABLE IF NOT EXISTS garment_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, imageUrl TEXT NOT NULL, createdAt TEXT NOT NULL)"); } catch(e) {}
try { db.prepare("ALTER TABLE garment_templates ADD COLUMN backImageUrl TEXT DEFAULT ''").run(); } catch(e) {}
// Populate colors from existing color field for products that have none
db.prepare("UPDATE products SET colors = json_array(json_object('name', color, 'hex', '#1a1a1a')) WHERE (colors IS NULL OR colors = '[]') AND color IS NOT NULL AND color != ''").run();
// Fix: convert any non-array colors values (objects) to arrays
try { db.prepare("UPDATE products SET colors = '[' || colors || ']' WHERE colors IS NOT NULL AND colors != '[]' AND colors LIKE '{%'").run(); } catch(e) {}

// Seed products from products.json on first run
const pc = db.prepare('SELECT COUNT(*) as n FROM products').get().n;
if (pc === 0) {
    const seed = require('./products.json');
    const ins = db.prepare(`
        INSERT INTO products (id,sku,name,color,price,category,sizes,stock,totalStock,status,badge,description,images,tags,createdAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    db.transaction(() => {
        seed.forEach(p => ins.run(
            p.id, p.sku, p.name, p.color || '', p.price, p.category,
            JSON.stringify(p.sizes || []),
            JSON.stringify(p.stock || {}),
            p.totalStock || 0,
            p.status || 'active',
            p.badge || null,
            p.description || '',
            JSON.stringify(p.image ? [p.image] : []),
            JSON.stringify(p.tags || []),
            p.createdAt || new Date().toISOString()
        ));
    })();
    console.log(`✓ Seeded ${seed.length} products to SQLite (oneroot.db)`);
}

// Seed default admin on first run — credentials from .env
const ac = db.prepare('SELECT COUNT(*) as n FROM admins').get().n;
if (ac === 0) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass  = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) {
        console.error('⚠ ADMIN_EMAIL y ADMIN_PASSWORD no definidos en .env — no se creó admin.');
    } else {
        db.prepare('INSERT INTO admins (id,email,passwordHash) VALUES (?,?,?)').run(
            'admin-001', adminEmail, bcrypt.hashSync(adminPass, 12)
        );
        console.log(`✓ Admin creado: ${adminEmail}`);
    }
}

module.exports = db;
