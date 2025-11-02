"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { toast } from '@/components/Toaster'
import { confirm } from '@/components/Confirm'

type Role = { id: number; name: string }
type UserRow = { id: number; name: string; email: string; role_id: number | null; role?: Role | null }
type Paginated<T> = { success: boolean; data: { current_page: number; data: T[]; last_page: number; per_page: number; total: number } }

export default function AdminPage() {
    const router = useRouter()
    const [role, setRole] = useState('')

    // table state
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState<UserRow[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)

    // form state
    const [editing, setEditing] = useState<UserRow | null>(null)
    const [form, setForm] = useState<{name:string;email:string;password:string;role_id:number|''}>({ name: '', email: '', password: '', role_id: '' })

    useEffect(() => {
        // Check both localStorage and sessionStorage for role (same as Sidebar/Navbar)
        const r = localStorage.getItem('role') || sessionStorage.getItem('role') || ''
        setRole(r)
        if (r !== 'admin') { 
            router.replace('/') 
            return
        }
        void fetchRoles()
        void fetchUsers(1, '')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    async function fetchUsers(p = 1, q = search) {
        setLoading(true)
        try {
            const res = await apiFetch<Paginated<UserRow>>(`/users?per_page=10&page=${p}&search=${encodeURIComponent(q)}`)
            setUsers(res.data.data)
            setPage(res.data.current_page)
            setLastPage(res.data.last_page)
        } finally {
            setLoading(false)
        }
    }

    async function fetchRoles() {
        const res = await apiFetch<{success:boolean; data: Role[]}>(`/users/roles`)
        setRoles(res.data)
    }

    function openCreate() {
        setEditing(null)
        setForm({ name: '', email: '', password: '', role_id: roles[0]?.id ?? '' })
        ;(document.getElementById('user_modal') as HTMLDialogElement)?.showModal()
    }

    function openEdit(u: UserRow) {
        setEditing(u)
        setForm({ name: u.name, email: u.email, password: '', role_id: u.role_id ?? '' })
        ;(document.getElementById('user_modal') as HTMLDialogElement)?.showModal()
    }

    async function submitForm() {
        try {
            const payload: any = { ...form }
            if (editing) {
                if (!payload.password) delete payload.password
                await apiFetch(`/users/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
                toast('User berhasil diupdate', 'success')
            } else {
                await apiFetch(`/users`, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
                toast('User berhasil dibuat', 'success')
            }
            ;(document.getElementById('user_modal') as HTMLDialogElement)?.close()
            await fetchUsers(page)
        } catch (e: any) {
            toast(e?.message || 'Gagal menyimpan user', 'error')
        }
    }

    async function removeUser(u: UserRow) {
        const ok = await confirm({ title: 'Hapus User', message: `Hapus user ${u.name}?`, confirmText: 'Hapus', cancelText: 'Batal' })
        if (!ok) return
        try {
            await apiFetch(`/users/${u.id}`, { method: 'DELETE' })
            toast('User berhasil dihapus', 'success')
            await fetchUsers(page)
        } catch (e: any) {
            toast('Gagal menghapus user', 'error')
        }
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Management User</h1>
                <a className="btn" href="/employees">Kembali</a>
            </div>

            <div className="card bg-base-200/40">
                <div className="card-body">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                        <label className="input max-w-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 opacity-70"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 015.364 10.83l3.278 3.278a.75.75 0 11-1.06 1.06l-3.279-3.278A6.75 6.75 0 1110.5 3.75zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5z" clipRule="evenodd" /></svg>
                            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari nama/email" />
                            <button className="btn btn-sm" onClick={()=>fetchUsers(1, search)}>Cari</button>
                        </label>
                        <button className="btn btn-primary" onClick={openCreate}>Tambah User</button>
                    </div>

                    <div className="overflow-x-auto mt-4">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th className="w-40"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4}><div className="skeleton h-6 w-full" /></td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center opacity-70">Tidak ada data</td></tr>
                                ) : (
                                    users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td className="capitalize">{u.role?.name || '-'}</td>
                                            <td className="text-right">
                                                <div className="join join-horizontal justify-end">
                                                    <button className="btn btn-xs join-item" onClick={()=>openEdit(u)}>Edit</button>
                                                    <button className="btn btn-xs btn-error join-item" onClick={()=>removeUser(u)}>Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="join mt-4 justify-center">
                        <button disabled={page<=1} className="btn btn-sm join-item" onClick={()=>fetchUsers(page-1)}>«</button>
                        <button className="btn btn-sm join-item">Hal {page} / {lastPage}</button>
                        <button disabled={page>=lastPage} className="btn btn-sm join-item" onClick={()=>fetchUsers(page+1)}>»</button>
                    </div>
                </div>
            </div>

            <dialog id="user_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-3">{editing ? 'Edit User' : 'Tambah User'}</h3>
                    <div className="space-y-3">
                        <label className="input">
                            <span className="label">Nama</span>
                            <input value={form.name} onChange={(e)=>setForm(v=>({...v,name:e.target.value}))} />
                        </label>
                        <label className="input">
                            <span className="label">Email</span>
                            <input type="email" value={form.email} onChange={(e)=>setForm(v=>({...v,email:e.target.value}))} />
                        </label>
                        <label className="input">
                            <span className="label">Password {editing && <span className="opacity-60">(biarkan kosong jika tidak diubah)</span>}</span>
                            <input type="password" value={form.password} onChange={(e)=>setForm(v=>({...v,password:e.target.value}))} />
                        </label>
                        <label className="input">
                            <span className="label">Role</span>
                            <select className="select" value={form.role_id} onChange={(e)=>setForm(v=>({...v, role_id: e.target.value ? Number(e.target.value) : ''}))}>
                                {roles.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </label>
                    </div>
                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn">Batal</button>
                        </form>
                        <button className="btn btn-primary" onClick={submitForm}>Simpan</button>
                    </div>
                </div>
            </dialog>
        </div>
    )
}

