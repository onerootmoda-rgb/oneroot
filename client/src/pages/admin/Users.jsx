import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { fmtDate, fmtDateTime } from '@/lib/utils'
import { useToast } from '@/components/Toast'

export default function Users() {
  const toast = useToast()
  const [tab, setTab] = useState('admins')
  const [admins, setAdmins] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '', role: 'admin' })
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})

  async function loadAdmins() {
    setLoading(true)
    const res = await apiFetch('/api/auth/admins').catch(() => null)
    if (res?.ok) { const d = await res.json(); setAdmins(d.admins || []) }
    setLoading(false)
  }

  async function loadLogs() {
    const res = await apiFetch('/api/auth/logs?limit=200').catch(() => null)
    if (res?.ok) { const d = await res.json(); setLogs(d.logs || []) }
  }

  useEffect(() => { loadAdmins() }, [])
  useEffect(() => { if (tab === 'logs') loadLogs() }, [tab])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    const res = await apiFetch('/api/auth/admins', {
      method: 'POST',
      body: JSON.stringify(createForm),
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (res?.ok) {
      toast('Admin creado correctamente.', 'success')
      setShowCreate(false)
      setCreateForm({ email: '', password: '', name: '', role: 'admin' })
      loadAdmins()
    } else {
      toast(d?.error || 'Error al crear admin.', 'error')
    }
    setCreating(false)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    const body = {}
    if (editForm.name  !== undefined) body.name     = editForm.name
    if (editForm.role  !== undefined) body.role     = editForm.role
    if (editForm.password)            body.password = editForm.password
    const res = await apiFetch(`/api/auth/admins/${editId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (res?.ok) {
      toast('Admin actualizado.', 'success')
      setEditId(null)
      loadAdmins()
    } else {
      toast(d?.error || 'Error al actualizar.', 'error')
    }
  }

  async function toggleActive(admin) {
    const res = await apiFetch(`/api/auth/admins/${admin.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: admin.active ? 0 : 1 }),
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (res?.ok) {
      toast(admin.active ? 'Admin desactivado.' : 'Admin activado.', 'success')
      loadAdmins()
    } else {
      toast(d?.error || 'Error.', 'error')
    }
  }

  async function handleDelete(admin) {
    if (!window.confirm(`¿Eliminar permanentemente a ${admin.email}?`)) return
    const res = await apiFetch(`/api/auth/admins/${admin.id}`, { method: 'DELETE' }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (res?.ok) {
      toast('Admin eliminado.', 'success')
      loadAdmins()
    } else {
      toast(d?.error || 'Error al eliminar.', 'error')
    }
  }

  return (
    <div className="p-lg space-y-lg">
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <h1 className="font-headline-lg text-headline-lg text-primary">USUARIOS</h1>
        {tab === 'admins' && (
          <button
            onClick={() => { setShowCreate(!showCreate); setEditId(null) }}
            className="font-label-caps text-label-caps bg-primary text-on-primary px-md py-xs hover:bg-white hover:text-primary border border-primary transition-all"
          >
            {showCreate ? 'CANCELAR' : '+ NUEVO ADMIN'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-primary/20">
        {[{ id: 'admins', label: 'ADMINISTRADORES' }, { id: 'logs', label: 'LOG DE EVENTOS' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`font-label-caps text-label-caps px-md py-sm transition-colors border-b-2 ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: ADMINS ── */}
      {tab === 'admins' && (
        <>
          {/* Formulario crear */}
          {showCreate && (
            <form onSubmit={handleCreate} className="border border-primary p-md grid grid-cols-1 md:grid-cols-2 gap-md max-w-2xl">
              <div className="md:col-span-2">
                <p className="font-label-caps text-label-caps mb-md">CREAR ADMINISTRADOR</p>
              </div>
              {[
                { key: 'email',    label: 'EMAIL',      type: 'email',    required: true },
                { key: 'password', label: 'CONTRASEÑA (mín. 8 chars)', type: 'password', required: true },
                { key: 'name',     label: 'NOMBRE',     type: 'text',     required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="font-label-caps text-[10px] text-secondary block mb-xs">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={createForm[f.key]}
                    onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent"
                  />
                </div>
              ))}
              <div>
                <label className="font-label-caps text-[10px] text-secondary block mb-xs">ROL</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full border-b border-primary px-xs py-xs font-label-caps text-label-caps focus:outline-none bg-transparent"
                >
                  <option value="admin">ADMIN</option>
                  <option value="super">SUPER</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-sm pt-sm">
                <button type="submit" disabled={creating}
                  className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-xs disabled:opacity-40">
                  {creating ? 'CREANDO...' : 'CREAR'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="font-label-caps text-label-caps border border-primary px-lg py-xs hover:bg-primary hover:text-on-primary transition-all">
                  CANCELAR
                </button>
              </div>
            </form>
          )}

          {/* Tabla */}
          <div className="border border-primary overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-md">
                <thead>
                  <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                    {['EMAIL', 'NOMBRE', 'ROL', 'ESTADO', 'CREADO', 'ACCIONES'].map(h => (
                      <th key={h} className="px-md py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {loading ? (
                    <tr><td colSpan={6} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">CARGANDO...</td></tr>
                  ) : admins.length === 0 ? (
                    <tr><td colSpan={6} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">SIN ADMINS</td></tr>
                  ) : admins.map(u => (
                    editId === u.id ? (
                      /* Fila de edición inline */
                      <tr key={u.id} className="bg-surface-container-low">
                        <td colSpan={6} className="px-md py-md">
                          <form onSubmit={handleSaveEdit} className="flex flex-wrap gap-sm items-end">
                            <div>
                              <label className="font-label-caps text-[10px] text-secondary block mb-xs">NOMBRE</label>
                              <input
                                defaultValue={u.name}
                                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                className="border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none w-40 bg-transparent"
                              />
                            </div>
                            <div>
                              <label className="font-label-caps text-[10px] text-secondary block mb-xs">ROL</label>
                              <select
                                defaultValue={u.role}
                                onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                                className="border-b border-primary px-xs py-xs font-label-caps text-[10px] focus:outline-none bg-transparent"
                              >
                                <option value="admin">ADMIN</option>
                                <option value="super">SUPER</option>
                              </select>
                            </div>
                            <div>
                              <label className="font-label-caps text-[10px] text-secondary block mb-xs">NUEVA CONTRASEÑA</label>
                              <input
                                type="password"
                                placeholder="(dejar vacío para no cambiar)"
                                onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                                className="border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none w-52 bg-transparent"
                              />
                            </div>
                            <button type="submit" className="font-label-caps text-[10px] bg-primary text-on-primary px-sm py-xs">GUARDAR</button>
                            <button type="button" onClick={() => setEditId(null)} className="font-label-caps text-[10px] border border-primary px-sm py-xs">CANCELAR</button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={u.id} className="hover:bg-surface-container transition-colors">
                        <td className="px-md py-4 text-sm">{u.email}</td>
                        <td className="px-md py-4 text-sm">{u.name || '—'}</td>
                        <td className="px-md py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-label-caps ${u.role === 'super' ? 'bg-primary text-on-primary' : 'border border-primary text-secondary'}`}>
                            {(u.role || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-md py-4">
                          <span className={`px-2 py-0.5 text-[10px] font-label-caps ${u.active ? 'bg-green-100 text-green-800 border border-green-300' : 'border border-red-300 text-red-600'}`}>
                            {u.active ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td className="px-md py-4 font-label-caps text-[10px] text-secondary whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                        <td className="px-md py-4">
                          <div className="flex gap-xs">
                            <button onClick={() => { setEditId(u.id); setEditForm({ name: u.name, role: u.role }); setShowCreate(false) }}
                              className="font-label-caps text-[10px] border border-primary px-xs py-1 hover:bg-primary hover:text-on-primary transition-all">
                              EDITAR
                            </button>
                            <button onClick={() => toggleActive(u)}
                              className={`font-label-caps text-[10px] border px-xs py-1 transition-all ${u.active ? 'border-outline text-secondary hover:border-primary hover:text-primary' : 'border-primary text-primary hover:bg-primary hover:text-on-primary'}`}>
                              {u.active ? 'DESACTIVAR' : 'ACTIVAR'}
                            </button>
                            <button onClick={() => handleDelete(u)}
                              className="font-label-caps text-[10px] border border-red-400 text-red-500 px-xs py-1 hover:bg-red-500 hover:text-white transition-all">
                              ELIMINAR
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: LOGS ── */}
      {tab === 'logs' && (
        <div className="border border-primary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md">
              <thead>
                <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                  {['FECHA Y HORA', 'IP', 'ADMIN', 'ACCIÓN', 'OBJETIVO', 'DETALLE'].map(h => (
                    <th key={h} className="px-md py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">SIN EVENTOS REGISTRADOS</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className="hover:bg-surface-container transition-colors">
                    <td className="px-md py-3 font-label-caps text-[10px] text-secondary whitespace-nowrap">{fmtDateTime(l.timestamp)}</td>
                    <td className="px-md py-3 font-mono text-[10px] text-secondary whitespace-nowrap">{l.ip || '—'}</td>
                    <td className="px-md py-3 text-sm text-secondary">{l.adminEmail || '—'}</td>
                    <td className="px-md py-3 font-label-caps text-[10px]">{l.action}</td>
                    <td className="px-md py-3 text-sm text-secondary truncate max-w-[120px]">{l.target || '—'}</td>
                    <td className="px-md py-3 font-label-caps text-[10px] text-secondary truncate max-w-[180px]">
                      {l.detail && l.detail !== '{}' ? l.detail : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
