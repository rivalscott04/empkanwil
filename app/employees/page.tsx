'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Employee, PaginatedEmployees } from '@/lib/types'
import { apiFetch } from '@/lib/api'
import { info } from '@/components/Info'
import { countEmployeeStatistics } from '@/lib/utils'

export default function EmployeesPage() {
	const [items, setItems] = useState<Employee[]>([])
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [search, setSearch] = useState('')
	const [loading, setLoading] = useState(false)
	const [selected, setSelected] = useState<Employee | null>(null)
	const [cols, setCols] = useState<{ nip: boolean; nama: boolean; unit: boolean; induk: boolean; jabatan: boolean; pangkat: boolean; golongan: boolean; actions: boolean }>({ nip: true, nama: true, unit: true, induk: true, jabatan: true, pangkat: true, golongan: true, actions: true })
	const [colsOpen, setColsOpen] = useState(false)
	const colsRef = useRef<HTMLDivElement | null>(null)
	const searchRef = useRef<HTMLInputElement | null>(null)
	const [indukFilter, setIndukFilter] = useState<string>('')
	const [statusFilter, setStatusFilter] = useState<string>('')
	const [exporting, setExporting] = useState(false)
	const [indukOptions, setIndukOptions] = useState<string[]>([])
	const [statistics, setStatistics] = useState<{ total: number; aktif: number; pensiun: number }>({ total: 0, aktif: 0, pensiun: 0 })
	const [role, setRole] = useState<string>('')
	const perPageRef = useRef(perPage)
	const pages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage])
	const visibleCount = useMemo(() => Object.values(cols).filter(Boolean).length, [cols])
	
	// Keep perPageRef in sync with perPage
	useEffect(() => {
		perPageRef.current = perPage
	}, [perPage])

	// Calculate statistics from filtered data - accepts optional params to avoid stale state
	async function loadFilteredStatistics(currSearch = search, currInduk = indukFilter, currStatus = statusFilter) {
		try {
			const indukParam = currInduk ? `&induk=${encodeURIComponent(currInduk)}` : ''
			const statusParam = currStatus ? `&status=${encodeURIComponent(currStatus)}` : ''
			// Fetch all data with current filters to calculate accurate statistics
			const json = await apiFetch<PaginatedEmployees>(`/employees?per_page=all&page=1&search=${encodeURIComponent(currSearch)}${indukParam}${statusParam}`)
			const allEmployees = json.data.data || []
			
			// Calculate statistics from filtered employees
			const stats = countEmployeeStatistics(allEmployees)
			setStatistics(stats)
		} catch (error) {
			console.error('Failed to load filtered statistics:', error)
		}
	}

	async function load(current: number, q: string, per: number) {
		setLoading(true)
		try {
			const indukParam = indukFilter ? `&induk=${encodeURIComponent(indukFilter)}` : ''
			const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''
			const json = await apiFetch<PaginatedEmployees>(`/employees?per_page=${per}&page=${current}&search=${encodeURIComponent(q)}${indukParam}${statusParam}`)
			setItems(json.data.data || [])
			setTotal(json.data.total || 0)
			// Don't update perPage from backend response to avoid state conflicts
			// setPerPage(json.data.per_page || per)
		} catch (error) {
			console.error('Failed to load employees:', error)
		} finally {
			setLoading(false)
		}
	}

	async function loadStatistics() {
		try {
			const json = await apiFetch<{ success: boolean; data: { total: number; aktif: number; pensiun: number } }>(`/employees/statistics`)
			const backendStats = json.data || { total: 0, aktif: 0, pensiun: 0 }
			setStatistics(backendStats)
		} catch (error) {
			console.error('Failed to load statistics:', error)
		}
	}

	useEffect(() => {
		const r = localStorage.getItem('role') || ''
		setRole(r)
		load(1, '', 10) 
		loadFilteredStatistics()
	}, [])

	// fetch distinct induk units list (dynamic across NTB)
	useEffect(() => {
		(async () => {
			try {
				const res = await apiFetch<{ success: boolean; data: string[] }>(`/employees/induk-units`)
				setIndukOptions(Array.isArray(res.data) ? res.data : [])
			} catch (e) {
				console.error('Failed to load induk units', e)
			}
		})()
	}, [])

	// realtime debounced search
	useEffect(() => {
		const id = setTimeout(() => {
			setPage(1)
			load(1, search, perPageRef.current)
			loadFilteredStatistics(search)
		}, 400)
		return () => clearTimeout(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search])

	// reload when induk filter changes
	useEffect(() => {
		setPage(1)
		load(1, search, perPageRef.current)
		loadFilteredStatistics(search, indukFilter)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [indukFilter])

	// reload when status filter changes
	useEffect(() => {
		setPage(1)
		load(1, search, perPageRef.current)
		loadFilteredStatistics(search, indukFilter, statusFilter)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [statusFilter])

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

	function toggleCol(key: keyof typeof cols) {
		setCols((prev) => {
			const next = { ...prev, [key]: !prev[key] }
			try { localStorage.setItem('employee_table_cols', JSON.stringify(next)) } catch {}
			return next
		})
	}

	function resetFilters() {
		setIndukFilter('')
		setStatusFilter('')
		setSearch('')
		setPage(1)
		load(1, '', perPage)
		// Load statistics with empty filters (reset state)
		loadFilteredStatistics('', '', '')
	}

	function handlePerPageChange(value: string) {
		let next = parseInt(value, 10)
		if (value === 'all') {
			next = 100000 // effectively all
		}
		setPage(1)
		setPerPage(next)
		load(1, search, next)
	}

	async function exportCsv(sepType: 'comma' | 'semicolon') {
		try {
			setExporting(true)
			// fetch data according to current perPage selection; if very large, backend returns all
			const perPageParam = perPage >= 100000 ? 'all' : perPage
			const indukParam = indukFilter ? `&induk=${encodeURIComponent(indukFilter)}` : ''
			const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''
			const json = await apiFetch<PaginatedEmployees>(`/employees?per_page=${perPageParam}&page=1&search=${encodeURIComponent(search)}${indukParam}${statusParam}`)
			let rows = json.data.data || []
			// build CSV with selectable separator
			const sep = sepType === 'semicolon' ? ';' : ','
			const header = ['NIP','Nama','Unit Kerja','Induk','Jabatan','Pangkat','Golongan']
			const csvLines = [header.join(sep)]
			for (const r of rows) {
				const clean = (v: string | null | undefined) => (v ?? '').replace(/[\r\n]+/g, ' ').trim()
				csvLines.push([
					r.NIP_BARU,
					JSON.stringify(clean(r.NAMA_LENGKAP)),
					JSON.stringify(clean(r.SATUAN_KERJA)),
					JSON.stringify(clean(r.induk_unit)),
					JSON.stringify(clean(r.KET_JABATAN)),
					JSON.stringify(clean(r.pangkat_asn)),
					JSON.stringify(clean(r.GOL_RUANG)),
				].join(sep))
			}
			const now = new Date()
			const pad = (n: number) => String(n).padStart(2, '0')
			const fname = `pegawai_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}_${sepType === 'semicolon' ? 'semicolon' : 'comma'}_${rows.length}.csv`
			const blob = new Blob(["\uFEFF" + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = fname
			a.click()
			URL.revokeObjectURL(url)
		} catch (e) {
			console.error('Export failed', e)
		} finally {
			setExporting(false)
		}
	}

	async function exportXlsxLike() {
		try {
			setExporting(true)
			const perPageParam = perPage >= 100000 ? 'all' : perPage
			const indukParam = indukFilter ? `&induk=${encodeURIComponent(indukFilter)}` : ''
			const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''
			const json = await apiFetch<PaginatedEmployees>(`/employees?per_page=${perPageParam}&page=1&search=${encodeURIComponent(search)}${indukParam}${statusParam}`)
			let rows = json.data.data || []
			// Create a minimal HTML table that Excel can open as a spreadsheet
			const esc = (s: string | null | undefined) => (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
			const rowsHtml = rows.map(r => (
				`<tr><td>${esc(r.NIP_BARU)}</td><td>${esc(r.NAMA_LENGKAP)}</td><td>${esc(r.SATUAN_KERJA)}</td><td>${esc(r.induk_unit)}</td><td>${esc(r.KET_JABATAN)}</td><td>${esc(r.pangkat_asn)}</td><td>${esc(r.GOL_RUANG)}</td></tr>`
			)).join('')
			const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table><thead><tr><th>NIP</th><th>Nama</th><th>Unit Kerja</th><th>Induk</th><th>Jabatan</th><th>Pangkat</th><th>Golongan</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
			const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `pegawai_${new Date().toISOString().slice(0,16).replace(/[-:T]/g,'')}.xlsx`
			a.click()
			URL.revokeObjectURL(url)
		} catch (e) {
			console.error('Export failed', e)
		} finally {
			setExporting(false)
		}
	}

	return (
		<div className="p-2 sm:p-4 md:p-8 overflow-x-hidden max-w-full">
			<div className="mb-4 space-y-2">
				<h1 className="text-2xl font-semibold">Data Pegawai</h1>
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
					<select className="select select-sm w-24" value={perPage >= 100000 ? 'all' : String(perPage)} onChange={(e)=>handlePerPageChange(e.target.value)}>
						<option value="10">10</option>
						<option value="25">25</option>
						<option value="50">50</option>
						<option value="100">100</option>
						<option value="all">Semua</option>
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
				<select className="select select-sm w-full sm:w-auto sm:max-w-xs md:w-80 truncate" value={indukFilter} onChange={(e)=>setIndukFilter(e.target.value)}>
						<option value="">Semua Induk</option>
					{(indukOptions || []).map(v => (
						<option key={v} value={v}>{v}</option>
					))}
				</select>
				<select className="select select-sm w-full sm:w-auto sm:max-w-xs" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
					<option value="">Semua Status</option>
					<option value="aktif">Aktif</option>
					<option value="pensiun">Pensiun</option>
				</select>
					<button className="btn btn-sm whitespace-nowrap" onClick={resetFilters} title="Reset pencarian dan filter">Reset</button>
					<div className="dropdown">
						<div tabIndex={0} role="button" className="btn btn-sm btn-primary whitespace-nowrap" aria-haspopup="menu">
							{exporting ? <span className="loading loading-dots loading-sm" /> : 'Export'}
						</div>
						<ul className="dropdown-content menu bg-base-100 rounded-box shadow p-2 w-56" role="menu">
							<li><button onClick={()=>exportCsv('comma')}>CSV (Koma ,)</button></li>
							<li><button onClick={()=>exportCsv('semicolon')}>CSV (Titik Koma ;)</button></li>
							<li><button onClick={()=>exportXlsxLike()}>Excel (.xlsx)</button></li>
						</ul>
					</div>
				</div>
			</div>
			{/* Desktop/Tablet table container */}
			<div className="overflow-x-auto rounded-box border border-base-300 hidden md:block">
				{/* Desktop/Tablet table */}
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
										{/* NIP - Always visible */}
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
										{/* Nama - Always visible */}
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
										
										{/* Collapse for additional details */}
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
										
									{/* Action buttons */}
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
				<div className="text-sm opacity-70">Menampilkan {items.length} dari {total} data</div>
				<div className="join">
					<button className="btn join-item" disabled={page<=1} onClick={()=>{ const p = page-1; setPage(p); load(p, search, perPage) }}>{'«'}</button>
					<button className="btn join-item">{page}</button>
					<button className="btn join-item" disabled={page>=pages} onClick={()=>{ const p = page+1; setPage(p); load(p, search, perPage) }}>{'»'}</button>
				</div>
			</div>
		</div>
	)
}
