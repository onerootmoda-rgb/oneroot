# One Root Co.

Tienda de ropa streetwear minimalista colombiana. Stack: React + Express + SQLite.

---

## Estructura del proyecto

```
oneroot/
├── client/               # Frontend React (Vite)
│   └── src/
│       ├── App.jsx       # Rutas y lazy loading
│       ├── components/   # Nav, Footer, CartDrawer, Toast, ProductCard, CheckoutModal
│       ├── hooks/        # useAuth (singleton), useCart
│       ├── lib/          # apiFetch, fmtCOP, utils de admin
│       └── pages/        # Todas las páginas públicas y panel admin
├── routes/               # API Express: auth, products, cart, orders, settings, analytics, design
├── middleware/           # authMiddleware, eventLog, imageProcessor, mailer
├── data/
│   ├── database.js       # SQLite (better-sqlite3), schema, migrations, seed
│   ├── oneroot.db        # Base de datos principal
│   ├── backups/          # Backups automáticos cada 6h (últimos 7)
│   └── products.json     # Seed inicial de productos
├── uploads/              # Imágenes subidas: products/, collections/, designs/, generated/
├── server.js             # Servidor Express principal
├── .env                  # Variables de entorno (NO subir a git)
└── monochrome_urbanity/  # Sistema de diseño: colores, tipografía, espaciado
    └── DESIGN.md
```

---

## Cómo correr en desarrollo

### 1. Backend (Express + SQLite)
```bash
node server.js
# Corre en http://localhost:3000
```

### 2. Frontend (React con hot reload)
```bash
cd client
npm run dev
# Corre en http://localhost:5173
# El proxy Vite redirige /api → :3000 automáticamente
```

### 3. Producción (Express sirve React)
```bash
cd client
npm run build          # Genera /dist en la raíz del proyecto

# En .env:
USE_REACT=true

node server.js
# Todo en http://localhost:3000
```

---

## Variables de entorno (.env)

```env
PORT=3000
ADMIN_EMAIL=tu@email.com
ADMIN_PASSWORD=contraseña_segura
JWT_SECRET=secreto_largo_aleatorio
CORS_ORIGIN=http://localhost:3000
USE_REACT=true
```

---

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login admin (rate limited: 10/15min) |
| GET | `/api/auth/me` | Verificar sesión admin |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/products` | Listar productos (filtros: category, size, search) |
| GET | `/api/products/:id` | Detalle de producto |
| PUT | `/api/products/:id` | Actualizar producto (admin) |
| GET | `/api/cart` | Ver carrito (por sessionId) |
| POST | `/api/cart/add` | Agregar item al carrito |
| PUT | `/api/cart/:productId` | Actualizar cantidad (qty ≤ 0 elimina) |
| DELETE | `/api/cart` | Vaciar carrito |
| POST | `/api/orders` | Crear pedido |
| GET | `/api/orders` | Listar pedidos (admin) |
| PUT | `/api/orders/:id/status` | Cambiar estado del pedido |
| GET | `/api/settings/home` | Configuración de home |
| PUT | `/api/settings/home` | Guardar configuración de home |
| GET | `/api/analytics` | Resumen de analítica (admin) |
| POST | `/api/design/generate` | Generador de diseños IA |

---

## Panel admin

URL: `/admin/login`

Credenciales definidas en `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

Secciones disponibles:
- **Dashboard** — resumen de pedidos y métricas
- **Pedidos** — gestión de órdenes con cambio de estado
- **Catálogo** — activar/desactivar productos
- **Colecciones** — editar colecciones destacadas en home
- **Diseños** — catálogo de diseños para el personalizador
- **Analítica** — visitas, fuentes de tráfico, conversión
- **Usuarios** — admins registrados
- **Home Editor** — editar textos del hero y secciones

---

## Base de datos

SQLite con WAL mode. Tablas principales:

- `products` — catálogo con stock por talla
- `admins` — usuarios del panel
- `cart_items` — carritos anónimos por sessionId
- `orders` — pedidos (pending → processing → completed)
- `settings` — configuración de home y colecciones (JSON por clave)
- `analytics_events` — visitas por página
- `design_catalog` / `garment_templates` — datos del personalizador

Backups automáticos en `data/backups/` cada 6 horas. Se mantienen los últimos 7.

---

## Diseño

El sistema de diseño está documentado en `monochrome_urbanity/DESIGN.md`.

Paleta: escala acromática (negro puro #000000 / blanco). Tipografía: Montserrat (display), Hanken Grotesk (cuerpo), JetBrains Mono (etiquetas y precios). Bordes: 0px radius (estética brutalista arquitectónica).
