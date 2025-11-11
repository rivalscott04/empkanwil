'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Employee, PaginatedEmployees } from '@/lib/types'
import { apiFetch, getRole } from '@/lib/api'
import { info } from '@/components/Info'

interface LocationData {
	location: string
	induk_unit: string
	statistics: {
		total: number
		aktif: number
		pensiun: number
	}
	employees: {
		data: Employee[]
		total: number
		per_page: number
		current_page: number
		last_page: number
		from: number
		to: number
	}
}

export default function EmployeeLocationPage() {
	const params = useParams<{ slug: string }>()
	const router = useRouter()
	const indukUnit = decodeURIComponent(params.slug)
	
	const [data, setData] = useState<LocationData | null>(null)
	const [page, setPage] = useState(1)
	const [perPage, setPerPage] = useState(25)
	const [search, setSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('')
	const [loading, setLoading] = useState(false)
	const [selected, setSelected] = useState<Employee | null>(null)
	const [cols, setCols] = useState<{ nip: boolean; nama: boolean; unit: boolean; induk: boolean; jabatan: boolean; pangkat: boolean; golongan: boolean; actions: boolean }>({ nip: true, nama: true, unit: true, induk: false, jabatan: true, pangkat: true, golongan: true, actions: true })
	const [colsOpen, setColsOpen] = useState(false)
	const colsRef = useRef<HTMLDivElement | null>(null)
	const searchRef = useRef<HTMLInputElement | null>(null)
	const [statusModalOpen, setStatusModalOpen] = useState(false)
	const statusModalRef = useRef<HTMLDialogElement | null>(null)
	const [role, setRole] = useState<string>('')
	const perPageRef = useRef(perPage)
	const pages = useMemo(() => data ? Math.max(1, Math.ceil(data.employees.total / perPage)) : 1, [data, perPage])
	const visibleCount = useMemo(() => Object.values(cols).filter(Boolean).length, [cols])
	
	// Keep perPageRef in sync with perPage
	useEffect(() => {
		perPageRef.current = perPage
	}, [perPage])

	async function load(current: number = page, q: string = search, per: number = perPage, status: string = statusFilter) {
		setLoading(true)
		try {
			const params = new URLSearchParams({
				induk_unit: indukUnit,
				page: String(current),
				per_page: String(per),
			})
			if (q) params.append('search', q)
			if (status) params.append('status', status)
			
			const json = await apiFetch<{ success: boolean; data: LocationData }>(`/employees/by-location?${params.toString()}`)
			setData(json.data)
		} catch (error) {
			console.error('Failed to load location employees:', error)
			info('Gagal memuat data pegawai untuk lokasi ini', 'Error')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		const r = getRole()
		setRole(r)
		load(1, '', 25, '')
	}, [])

	// restore column visibility preferences
	useEffect(() => {
		try {
			const saved = typeof window !== 'undefined' ? localStorage.getItem('employee_table_cols') : null
			if (saved) {
				const parsed = JSON.parse(saved)
				setCols((prev) => ({ ...prev, ...parsed }))
			}
		} catch {}
	}, [])

	// close column dropdown on outside click or Escape
	useEffect(() => {
		function handleDown(e: MouseEvent) {
			if (!colsRef.current) return
			if (!colsRef.current.contains(e.target as Node)) setColsOpen(false)
		}
		function handleKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setColsOpen(false)
		}
		if (colsOpen) {
			document.addEventListener('mousedown', handleDown)
			document.addEventListener('keydown', handleKey)
		}
		return () => {
			document.removeEventListener('mousedown', handleDown)
			document.removeEventListener('keydown', handleKey)
		}
	}, [colsOpen])

	useEffect(() => {
		if (statusModalOpen && statusModalRef.current) {
			statusModalRef.current.showModal()
		} else if (statusModalRef.current) {
			statusModalRef.current.close()
		}
	}, [statusModalOpen])

	// realtime debounced search
	useEffect(() => {
		const id = setTimeout(() => {
			setPage(1)
			load(1, search, perPageRef.current, statusFilter)
		}, 400)
		return () => clearTimeout(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search])

	// reload when status filter changes
	useEffect(() => {
		setPage(1)
		load(1, search, perPageRef.current, statusFilter)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [statusFilter])

	function toggleCol(key: keyof typeof cols) {
		setCols((prev) => {
			const next = { ...prev, [key]: !prev[key] }
			try { localStorage.setItem('employee_table_cols', JSON.stringify(next)) } catch {}
			return next
		})
	}

	function resetFilters() {
		setStatusFilter('')
		setSearch('')
		setPage(1)
		load(1, '', perPage, '')
	}

	function handlePerPageChange(value: string) {
		const next = parseInt(value, 10)
		setPage(1)
		setPerPage(next)
		load(1, search, next, statusFilter)
	}

	const items = data?.employees.data || []
	const statistics = data?.statistics || { total: 0, aktif: 0, pensiun: 0 }

	return (
		<div className="p-2 sm:p-4 md:p-8 overflow-x-hidden max-w-full">
			{/* Header with breadcrumb */}
			<div className="mb-4 space-y-2">
				<div className="breadcrumbs text-sm mb-2">
					<ul>
						<li><a href="/heatmap">Sebaran Pegawai</a></li>
						<li>{data?.location || 'Memuat...'}</li>
					</ul>
				</div>
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div>
						<h1 className="text-2xl font-semibold">Pegawai di {data?.location || 'Memuat...'}</h1>
						<p className="text-sm opacity-70 mt-1">{data?.induk_unit || ''}</p>
					</div>
					<a href="/heatmap" className="btn btn-sm btn-outline">
						← Kembali ke Peta
					</a>
				</div>
				
				{/* Statistics Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
					<div className="card bg-base-300 border border-base-content/20 shadow-lg">
						<div className="card-body py-4">
							<h3 className="text-sm text-base-content/70">Total Pegawai</h3>
							<p className="text-2xl font-bold text-base-content">{statistics.total.toLocaleString('id-ID')}</p>
						</div>
					</div>
					<div className="card bg-base-300 border border-success shadow-lg">
						<div className="card-body py-4">
							<h3 className="text-sm text-base-content/70">Aktif</h3>
							<p className="text-2xl font-bold text-success">{statistics.aktif.toLocaleString('id-ID')}</p>
						</div>
					</div>
					<div className="card bg-base-300 border border-warning shadow-lg">
						<div className="card-body py-4">
							<h3 className="text-sm text-base-content/70">Pensiun</h3>
							<p className="text-2xl font-bold text-warning">{statistics.pensiun.toLocaleString('id-ID')}</p>
						</div>
					</div>
				</div>
				
				{/* Row 1: Per-page on far left */}
				<div className="flex items-center gap-2">
					<span className="text-sm opacity-70">Jumlah Data</span>
					<select className="select select-sm w-24" value={String(perPage)} onChange={(e)=>handlePerPageChange(e.target.value)}>
						<option value="10">10</option>
						<option value="25">25</option>
						<option value="50">50</option>
						<option value="100">100</option>
						<option value="200">200</option>
						<option value="1500">1500</option>
					</select>
				</div>
				{/* Row 2: Search full width */}
				<label className="input input-bordered w-full max-w-full">
					<input ref={searchRef} placeholder="Cari nama / NIP / unit" value={search} onChange={e=>setSearch(e.target.value)} />
					{search !== '' && (
						<button
							type="button"
							className="btn btn-ghost btn-xs"
							onClick={() => { setSearch(''); setPage(1); searchRef.current?.focus() }}
							title="Bersihkan pencarian"
							aria-label="Bersihkan pencarian"
						>
							×
						</button>
					)}
				</label>
				{/* Row 3: Grouped controls under search */}
				<div className="flex flex-wrap items-center gap-2">
					<div ref={colsRef} className={`dropdown ${colsOpen ? 'dropdown-open' : ''}`}>
						<button
							type="button"
							className="btn btn-sm"
							aria-haspopup="menu"
							aria-expanded={colsOpen}
							onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setColsOpen(v => !v) }}
						>
							Kolom
						</button>
						<ul className="dropdown-content menu bg-base-100 rounded-box shadow p-2 w-52 max-h-[60vh] overflow-y-auto" role="menu">
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.nip} onChange={()=>toggleCol('nip')} /><span>NIP</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.nama} onChange={()=>toggleCol('nama')} /><span>Nama</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.unit} onChange={()=>toggleCol('unit')} /><span>Unit Kerja</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.induk} onChange={()=>toggleCol('induk')} /><span>Induk</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.jabatan} onChange={()=>toggleCol('jabatan')} /><span>Jabatan</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.pangkat} onChange={()=>toggleCol('pangkat')} /><span>Pangkat</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.golongan} onChange={()=>toggleCol('golongan')} /><span>Golongan</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.actions} onChange={()=>toggleCol('actions')} /><span>Actions</span></label></li>
						</ul>
					</div>
					<button
						type="button"
						className="btn btn-sm w-full sm:w-auto sm:max-w-xs"
						onClick={() => setStatusModalOpen(true)}
					>
						<span>{statusFilter === 'aktif' ? 'Aktif' : statusFilter === 'pensiun' ? 'Pensiun' : 'Semua Status'}</span>
						<span className="ml-auto">▼</span>
					</button>
					<button className="btn btn-sm whitespace-nowrap" onClick={resetFilters} title="Reset pencarian dan filter">Reset</button>
				</div>
			</div>
			
			{/* Desktop/Tablet table container */}
			<div className="overflow-x-auto rounded-box border border-base-300 hidden md:block">
				<table className="table w-full">
					<thead>
						<tr>
							{cols.nip && <th>NIP</th>}
							{cols.nama && <th>Nama</th>}
							{cols.unit && <th className="hidden md:table-cell">Unit Kerja</th>}
							{cols.induk && <th className="hidden md:table-cell">Induk</th>}
							{cols.jabatan && <th>Jabatan</th>}
							{cols.pangkat && <th>Pangkat</th>}
							{cols.golongan && <th>Golongan</th>}
							{cols.actions && <th className="w-28 text-center">Aksi</th>}
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={visibleCount}><span className="loading loading-bars"></span></td></tr>
						) : items.map(e=> (
							<tr key={e.NIP_BARU}>
								{cols.nip && (
									<td className="group">
										<div className="flex items-center gap-2">
											<span>{e.NIP_BARU}</span>
											<button
												onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(e.NIP_BARU||''); info('NIP berhasil disalin'); } catch {} }}
												className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
												title="Salin NIP"
												aria-label="Salin NIP"
											>
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.103 0-2 .897-2 2v12h2V3h12V1z"></path><path d="M19 5H8c-1.103 0-2 .897-2 2v13c0 1.103.897 2 2 2h11c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zm0 15H8V7h11v13z"></path></svg>
											</button>
										</div>
									</td>
								)}
								{cols.nama && (
									<td className="font-medium group">
										<div className="flex items-center gap-2">
											<button className="text-primary hover:opacity-90 text-left" onClick={()=>{ setSelected(e); (document.getElementById('employee_modal') as HTMLDialogElement)?.showModal() }}>{e.NAMA_LENGKAP}</button>
											<button
												onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(e.NAMA_LENGKAP||''); info('Nama berhasil disalin'); } catch {} }}
												className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
												title="Salin Nama"
												aria-label="Salin Nama"
											>
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.103 0-2 .897-2 2v12h2V3h12V1z"></path><path d="M19 5H8c-1.103 0-2 .897-2 2v13c0 1.103.897 2 2 2h11c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zm0 15H8V7h11v13z"></path></svg>
											</button>
										</div>
									</td>
								)}
								{cols.unit && <td className="hidden md:table-cell whitespace-normal break-words">{e.SATUAN_KERJA ?? '-'}</td>}
								{cols.induk && <td className="hidden md:table-cell whitespace-normal break-words">{e.induk_unit ?? '-'}</td>}
								{cols.jabatan && <td className="hidden md:table-cell whitespace-normal break-words">{e.KET_JABATAN ?? '-'}</td>}
								{cols.pangkat && <td>{e.pangkat_asn ?? '-'}</td>}
								{cols.golongan && <td>{e.GOL_RUANG ?? '-'}</td>}
								{cols.actions && (
									<td className="text-right">
										<div className="join join-horizontal justify-end">
											<button className="btn btn-sm btn-primary join-item" onClick={()=>{ setSelected(e); (document.getElementById('employee_modal') as HTMLDialogElement)?.showModal() }}>Detail</button>
											{(role === 'admin' || role === 'operator') && (
												<a className="btn btn-sm btn-secondary join-item" href={`/employees/${e.NIP_BARU}/edit`}>Edit</a>
											)}
										</div>
									</td>
								)}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile list container */}
			<div className="rounded-box border border-base-300 md:hidden">
				<div className="p-2">
					{loading ? (
						<div className="space-y-3">
							<div className="skeleton h-24 w-full"></div>
							<div className="skeleton h-24 w-full"></div>
							<div className="skeleton h-24 w-full"></div>
						</div>
					) : (
						<div className="space-y-3">
							{items.map((e)=> (
								<div key={e.NIP_BARU} className="card card-border">
									<div className="card-body py-3">
										<div>
											<div className="text-xs opacity-70">NIP</div>
											<div className="flex items-center gap-2 font-mono text-sm">
												<span className="break-all">{e.NIP_BARU}</span>
												<button
													className="btn btn-ghost btn-xs flex-shrink-0"
													title="Salin NIP"
													aria-label="Salin NIP"
													onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(e.NIP_BARU||''); info('NIP berhasil disalin'); } catch {} }}
												>
													<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.103 0-2 .897-2 2v12h2V3h12V1z"></path><path d="M19 5H8c-1.103 0-2 .897-2 2v13c0 1.103.897 2 2 2h11c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zm0 15H8V7h11v13z"></path></svg>
												</button>
											</div>
										</div>
										<div className="mt-2">
											<div className="text-xs opacity-70">Nama</div>
											<div className="flex items-center gap-2">
												<span className="font-medium break-words">{e.NAMA_LENGKAP}</span>
												<button
													className="btn btn-ghost btn-xs flex-shrink-0"
													title="Salin Nama"
													aria-label="Salin Nama"
													onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(e.NAMA_LENGKAP||''); info('Nama berhasil disalin'); } catch {} }}
												>
													<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.103 0-2 .897-2 2v12h2V3h12V1z"></path><path d="M19 5H8c-1.103 0-2 .897-2 2v13c0 1.103.897 2 2 2h11c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zm0 15H8V7h11v13z"></path></svg>
												</button>
											</div>
										</div>
										<div className="collapse collapse-arrow bg-base-200 mt-3">
											<input type="checkbox" className="peer" />
											<div className="collapse-title text-sm font-medium py-2 min-h-0 px-4">
												Detail Lainnya
											</div>
											<div className="collapse-content px-4 pb-2">
												<div className="space-y-3 pt-2">
													{(e.SATUAN_KERJA || cols.unit) && (
														<div>
															<div className="text-xs opacity-70">Unit Kerja</div>
															<div className="whitespace-normal break-words text-sm">{e.SATUAN_KERJA ?? '-'}</div>
														</div>
													)}
													{e.KET_JABATAN && cols.jabatan && (
														<div>
															<div className="text-xs opacity-70">Jabatan</div>
															<div className="whitespace-normal break-words text-sm">{e.KET_JABATAN}</div>
														</div>
													)}
													<div className="flex flex-wrap items-center gap-2">
														{e.pangkat_asn && (
															<div>
																<div className="text-xs opacity-70 mb-1">Pangkat</div>
																<span className="badge badge-soft">{e.pangkat_asn}</span>
															</div>
														)}
														{e.GOL_RUANG && (
															<div>
																<div className="text-xs opacity-70 mb-1">Golongan</div>
																<span className="badge badge-soft">{e.GOL_RUANG}</span>
															</div>
														)}
													</div>
												</div>
											</div>
										</div>
										<div className="card-actions justify-end mt-3">
											<button className="btn btn-sm" onClick={()=>{ setSelected(e); (document.getElementById('employee_modal') as HTMLDialogElement)?.showModal() }}>Detail</button>
											{(role === 'admin' || role === 'operator') && (
												<a className="btn btn-sm btn-primary" href={`/employees/${e.NIP_BARU}/edit`}>Edit</a>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Quick view modal */}
			<dialog id="employee_modal" className="modal">
				<div className="modal-box max-w-full w-full sm:w-auto sm:max-w-2xl p-4 sm:p-6">
					<h3 className="font-bold text-lg">Detail Pegawai</h3>
					<div className="mt-4 space-y-3">
						<div>
							<div className="text-xs opacity-70">NIP</div>
							<div className="flex items-center gap-2">
								<span className="font-mono break-all">{selected?.NIP_BARU ?? '-'}</span>
								<button 
									className="btn btn-ghost btn-xs flex-shrink-0" 
									title="Salin NIP"
									aria-label="Salin NIP"
									onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(selected?.NIP_BARU||''); info('NIP berhasil disalin'); } catch {} }}
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.103 0-2 .897-2 2v12h2V3h12V1z"></path><path d="M19 5H8c-1.103 0-2 .897-2 2v13c0 1.103.897 2 2 2h11c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zm0 15H8V7h11v13z"></path></svg>
								</button>
							</div>
						</div>
						<div>
							<div className="text-xs opacity-70">Nama</div>
							<div className="flex items-center gap-2">
								<span className="font-medium break-words">{selected?.NAMA_LENGKAP ?? '-'}</span>
								<button 
									className="btn btn-ghost btn-xs flex-shrink-0" 
									title="Salin Nama"
									aria-label="Salin Nama"
									onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(selected?.NAMA_LENGKAP||''); info('Nama berhasil disalin'); } catch {} }}
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.103 0-2 .897-2 2v12h2V3h12V1z"></path><path d="M19 5H8c-1.103 0-2 .897-2 2v13c0 1.103.897 2 2 2h11c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zm0 15H8V7h11v13z"></path></svg>
								</button>
							</div>
						</div>
						<div>
							<div className="text-xs opacity-70">Unit Kerja</div>
							<div className="whitespace-normal break-words">{selected?.SATUAN_KERJA ?? '-'}</div>
						</div>
						{selected?.KET_JABATAN && (
							<div>
								<div className="text-xs opacity-70">Jabatan</div>
								<div className="whitespace-normal break-words">{selected.KET_JABATAN}</div>
							</div>
						)}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<div className="text-xs opacity-70">Pangkat</div>
								<div>{selected?.pangkat_asn ?? '-'}</div>
							</div>
							<div>
								<div className="text-xs opacity-70">Golongan</div>
								<div>{selected?.GOL_RUANG ?? '-'}</div>
							</div>
						</div>
					</div>
					<div className="modal-action flex-wrap gap-2">
						{selected && (role === 'admin' || role === 'operator') && (
							<a className="btn btn-primary" href={`/employees/${selected.NIP_BARU}/edit`}>Edit</a>
						)}
						<form method="dialog"><button className="btn">Tutup</button></form>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop"><button>Tutup</button></form>
			</dialog>
			
			<div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
				<div className="text-sm opacity-70">
					{data ? `Menampilkan ${data.employees.from}-${data.employees.to} dari ${data.employees.total} data` : 'Memuat...'}
				</div>
				<div className="join">
					<button className="btn join-item" disabled={page<=1} onClick={()=>{ const p = page-1; setPage(p); load(p, search, perPage, statusFilter) }}>{'«'}</button>
					<button className="btn join-item">{page}</button>
					<button className="btn join-item" disabled={page>=pages} onClick={()=>{ const p = page+1; setPage(p); load(p, search, perPage, statusFilter) }}>{'»'}</button>
				</div>
			</div>

			{/* Modal Filter Status */}
			<dialog ref={statusModalRef} className="modal">
				<div className="modal-box">
					<h3 className="font-bold text-lg mb-4">Pilih Status</h3>
					<ul className="menu">
						<li>
							<button
								onClick={() => {
									setStatusFilter('')
									setStatusModalOpen(false)
								}}
								className={statusFilter === '' ? 'active' : ''}
							>
								Semua Status
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									setStatusFilter('aktif')
									setStatusModalOpen(false)
								}}
								className={statusFilter === 'aktif' ? 'active' : ''}
							>
								Aktif
							</button>
						</li>
						<li>
							<button
								onClick={() => {
									setStatusFilter('pensiun')
									setStatusModalOpen(false)
								}}
								className={statusFilter === 'pensiun' ? 'active' : ''}
							>
								Pensiun
							</button>
						</li>
					</ul>
					<div className="modal-action">
						<form method="dialog">
							<button className="btn" onClick={() => setStatusModalOpen(false)}>Tutup</button>
						</form>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button onClick={() => setStatusModalOpen(false)}>close</button>
				</form>
			</dialog>
		</div>
	)
}

