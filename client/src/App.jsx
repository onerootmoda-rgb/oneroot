import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

// Todas las páginas se cargan de forma lazy para que el bundle inicial sea mínimo.
// Cada página genera su propio chunk en /dist/assets/ que solo se descarga al navegar.

const Home        = lazy(() => import('./pages/Home'))
const Catalog     = lazy(() => import('./pages/Catalog'))
const Product     = lazy(() => import('./pages/Product'))
const Cart        = lazy(() => import('./pages/Cart'))
const About       = lazy(() => import('./pages/About'))
const Designer    = lazy(() => import('./pages/Designer'))

const Privacidad   = lazy(() => import('./pages/legal/Privacidad'))
const Terminos     = lazy(() => import('./pages/legal/Terminos'))
const Devoluciones = lazy(() => import('./pages/legal/Devoluciones'))

const AdminLogin   = lazy(() => import('./pages/admin/Login'))
const AdminLayout  = lazy(() => import('./pages/admin/AdminLayout'))
const Dashboard    = lazy(() => import('./pages/admin/Dashboard'))
const AdminCatalog = lazy(() => import('./pages/admin/Catalog'))
const Orders       = lazy(() => import('./pages/admin/Orders'))
const Analytics    = lazy(() => import('./pages/admin/Analytics'))
const Users        = lazy(() => import('./pages/admin/Users'))
const Collections  = lazy(() => import('./pages/admin/Collections'))
const Designs      = lazy(() => import('./pages/admin/Designs'))
const HomeEditor   = lazy(() => import('./pages/admin/HomeEditor'))
const Customers    = lazy(() => import('./pages/admin/Customers'))
const Inventory    = lazy(() => import('./pages/admin/Inventory'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</span>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:slug" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/about" element={<About />} />
          <Route path="/personalizar" element={<Designer />} />

          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/devoluciones" element={<Devoluciones />} />

          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="catalog" element={<AdminCatalog />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="users" element={<Users />} />
            <Route path="collections" element={<Collections />} />
            <Route path="designs" element={<Designs />} />
            <Route path="home-editor" element={<HomeEditor />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
