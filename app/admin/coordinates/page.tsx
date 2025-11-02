"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { toast } from '@/components/Toaster'
import type { Coordinate } from '@/lib/types'

export default function CoordinatesPage() {
    const router = useRouter()
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [coordinates, setCoordinates] = useState<Coordinate[]>([])
    const [indukUnits, setIndukUnits] = useState<string[]>([])
    const [editing, setEditing] = useState<Coordinate | null>(null)
    const [form, setForm] = useState<{induk_unit: string; latitude: string; longitude: string}>({
        induk_unit: '',
        latitude: '',
        longitude: ''
    })

    useEffect(() => {
        // Check auth dari localStorage dan sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        const r = localStorage.getItem('role') || sessionStorage.getItem('role') || ''
        
        if (!token) {
            router.replace('/auth/login')
            return
        }

        setRole(r)
        setLoadingAuth(false)

        if (r !== 'admin') {
            router.replace('/')
            return
        }

        void fetchCoordinates()
        void fetchIndukUnits()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    async function fetchIndukUnits() {
        try {
            const res = await apiFetch<{success: boolean; data: string[]}>(`/employees/induk-units`)
            setIndukUnits(res.data)
        } catch (e: any) {
            toast('Gagal memuat daftar induk unit', 'error')
        }
    }

    async function fetchCoordinates() {
        setLoading(true)
        try {
            const res = await apiFetch<{success: boolean; data: Coordinate[]}>(`/coordinates`)
            setCoordinates(res.data)
        } catch (e: any) {
            toast('Gagal memuat koordinat', 'error')
        } finally {
            setLoading(false)
        }
    }

    function openEdit(coord?: Coordinate) {
        if (coord) {
            setEditing(coord)
            setForm({
                induk_unit: coord.induk_unit,
                latitude: coord.latitude.toString(),
                longitude: coord.longitude.toString()
            })
        } else {
            setEditing(null)
            setForm({ induk_unit: '', latitude: '', longitude: '' })
        }
        ;(document.getElementById('coord_modal') as HTMLDialogElement)?.showModal()
    }

    async function submitForm() {
        if (!form.induk_unit || !form.latitude || !form.longitude) {
            toast('Harap isi semua field', 'error')
            return
        }

        const payload = {
            induk_unit: form.induk_unit,
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude)
        }

        try {
            if (editing) {
                await apiFetch(`/coordinates/${editing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ latitude: payload.latitude, longitude: payload.longitude }),
                    headers: { 'Content-Type': 'application/json' }
                })
                toast('Koordinat berhasil diupdate', 'success')
            } else {
                await apiFetch(`/coordinates`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'application/json' }
                })
                toast('Koordinat berhasil ditambahkan', 'success')
            }
            ;(document.getElementById('coord_modal') as HTMLDialogElement)?.close()
            await fetchCoordinates()
        } catch (e: any) {
            toast(editing ? 'Gagal mengupdate koordinat' : 'Gagal menambahkan koordinat', 'error')
        }
    }

    async function deleteCoordinate(coord: Coordinate) {
        if (!confirm(`Hapus koordinat untuk ${coord.induk_unit}?`)) return
        try {
            await apiFetch(`/coordinates/${coord.id}`, { method: 'DELETE' })
            toast('Koordinat berhasil dihapus', 'success')
            await fetchCoordinates()
        } catch (e: any) {
            toast('Gagal menghapus koordinat', 'error')
        }
    }

    // Get missing induk units (ones without coordinates)
    const missingUnits = indukUnits.filter(unit => !coordinates.find(c => c.induk_unit === unit))

    // Show loading while checking auth
    if (loadingAuth || role !== 'admin') {
        return (
            <div className="p-4 md:p-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Set Koordinat Kabupaten/Kota</h1>
                <a className="btn" href="/admin">Kembali</a>
            </div>

            <div className="card bg-base-200/40">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm opacity-70">
                            Total: {coordinates.length} dari {indukUnits.length} wilayah sudah memiliki koordinat
                        </p>
                        <button className="btn btn-primary btn-sm" onClick={() => openEdit()}>
                            Tambah Koordinat
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Induk Unit</th>
                                    <th>Latitude</th>
                                    <th>Longitude</th>
                                    <th className="w-32"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4}><div className="skeleton h-6 w-full" /></td></tr>
                                ) : coordinates.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center opacity-70">Belum ada koordinat</td></tr>
                                ) : (
                                    coordinates.map(coord => (
                                        <tr key={coord.id}>
                                            <td className="max-w-md">{coord.induk_unit}</td>
                                            <td>{coord.latitude}</td>
                                            <td>{coord.longitude}</td>
                                            <td>
                                                <div className="join join-horizontal">
                                                    <button className="btn btn-xs join-item" onClick={() => openEdit(coord)}>Edit</button>
                                                    <button className="btn btn-xs btn-error join-item" onClick={() => deleteCoordinate(coord)}>Hapus</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {missingUnits.length > 0 && (
                        <div className="mt-6 alert alert-warning">
                            <div className="text-white">
                                <h3 className="font-semibold">Wilayah yang belum memiliki koordinat:</h3>
                                <ul className="list-disc list-inside mt-2">
                                    {missingUnits.map(unit => (
                                        <li key={unit} className="text-sm">{unit}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <dialog id="coord_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-3">{editing ? 'Edit Koordinat' : 'Tambah Koordinat'}</h3>
                    <div className="space-y-3">
                        <label className="input">
                            <span className="label">Induk Unit</span>
                            <select
                                className="select"
                                value={form.induk_unit}
                                onChange={(e) => setForm(v => ({ ...v, induk_unit: e.target.value }))}
                                disabled={!!editing}
                            >
                                <option value="">Pilih Induk Unit</option>
                                {indukUnits.map(unit => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </label>
                        <label className="input">
                            <span className="label">Latitude</span>
                            <input
                                type="number"
                                step="any"
                                value={form.latitude}
                                onChange={(e) => setForm(v => ({ ...v, latitude: e.target.value }))}
                                placeholder="-8.5833"
                            />
                        </label>
                        <label className="input">
                            <span className="label">Longitude</span>
                            <input
                                type="number"
                                step="any"
                                value={form.longitude}
                                onChange={(e) => setForm(v => ({ ...v, longitude: e.target.value }))}
                                placeholder="116.1167"
                            />
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

