'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { Employee, PaginatedEmployees } from '@/lib/types'
import { apiFetch, getRole } from '@/lib/api'
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
	const [cols, setCols] = useState<{ nip: boolean; nama: boolean; unit: boolean; induk: boolean; jabatan: boolean; pangkat: boolean; golongan: boolean; tmt_jabatan: boolean; tmt_pensiun: boolean; actions: boolean }>({ nip: true, nama: true, unit: true, induk: true, jabatan: true, pangkat: true, golongan: true, tmt_jabatan: false, tmt_pensiun: false, actions: true })
	const [colsOpen, setColsOpen] = useState(false)
	const colsRef = useRef<HTMLDivElement | null>(null)
	const searchRef = useRef<HTMLInputElement | null>(null)
	const [indukFilter, setIndukFilter] = useState<string>('')
	const [statusFilter, setStatusFilter] = useState<string>('')
	const [exporting, setExporting] = useState(false)
	const [indukOptions, setIndukOptions] = useState<string[]>([])
	const [indukSearch, setIndukSearch] = useState<string>('')
	const [indukModalOpen, setIndukModalOpen] = useState(false)
	const [statusModalOpen, setStatusModalOpen] = useState(false)
	const indukModalRef = useRef<HTMLDialogElement | null>(null)
	const statusModalRef = useRef<HTMLDialogElement | null>(null)
	const [statistics, setStatistics] = useState<{ total: number; aktif: number; pensiun: number }>({ total: 0, aktif: 0, pensiun: 0 })
	const [role, setRole] = useState<string>('')
	const perPageRef = useRef(perPage)
	const pages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage])
	const visibleCount = useMemo(() => Object.values(cols).filter(Boolean).length, [cols])
	const isRetired = (tmtPensiun?: string | null) => {
		if (!tmtPensiun) return false
		const d = new Date(tmtPensiun)
		if (Number.isNaN(d.getTime())) return false
		const today = new Date()
		// compare by day
		today.setHours(0,0,0,0)
		d.setHours(0,0,0,0)
		return d.getTime() <= today.getTime()
	}
	
	// Keep perPageRef in sync with perPage
	useEffect(() => {
		perPageRef.current = perPage
	}, [perPage])

    // Calculate statistics with filters: query exact totals from filtered endpoints
	async function loadFilteredStatistics(currSearch = search, currInduk = indukFilter, currStatus = statusFilter) {
		try {
            // If no filters, use backend statistics endpoint (fast and accurate)
            if (!currSearch && !currInduk && !currStatus) {
                try {
                    const json = await apiFetch<{ success: boolean; data: { total: number; aktif: number; pensiun: number } }>(`/employees/statistics`)
                    if (json?.data) {
                        setStatistics(json.data)
                        return
                    }
                } catch {}
            }
			const baseQuery = (statusOverride?: 'aktif' | 'pensiun') => {
                const params: string[] = ['per_page=10', 'page=1']
				if (currSearch) params.push(`search=${encodeURIComponent(currSearch)}`)
				if (currInduk) params.push(`induk=${encodeURIComponent(currInduk)}`)
				const statusParam = statusOverride !== undefined ? statusOverride : (currStatus || '')
				if (statusParam) params.push(`status=${encodeURIComponent(statusParam as string)}`)
				return `/employees?${params.join('&')}`
			}
			// total with current filters
            const totalRes = await apiFetch<PaginatedEmployees>(baseQuery())
			const filteredTotal = Number(totalRes?.data?.total ?? 0)
			// counts by status (if a status filter is already applied, shortcut)
			let aktifCount = 0
			let pensiunCount = 0
			if (currStatus === 'aktif') {
				aktifCount = filteredTotal
				pensiunCount = 0
			} else if (currStatus === 'pensiun') {
				aktifCount = 0
				pensiunCount = filteredTotal
			} else {
				const aktifRes = await apiFetch<PaginatedEmployees>(baseQuery('aktif'))
				const pensiunRes = await apiFetch<PaginatedEmployees>(baseQuery('pensiun'))
				aktifCount = Number(aktifRes?.data?.total ?? 0)
				pensiunCount = Number(pensiunRes?.data?.total ?? 0)
			}
			setStatistics({ total: filteredTotal, aktif: aktifCount, pensiun: pensiunCount })
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
		const r = getRole()
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

	// Handle modal open/close
	useEffect(() => {
		if (indukModalOpen && indukModalRef.current) {
			indukModalRef.current.showModal()
			setIndukSearch('')
		} else if (indukModalRef.current) {
			indukModalRef.current.close()
		}
	}, [indukModalOpen])

	useEffect(() => {
		if (statusModalOpen && statusModalRef.current) {
			statusModalRef.current.showModal()
		} else if (statusModalRef.current) {
			statusModalRef.current.close()
		}
	}, [statusModalOpen])

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
		const next = parseInt(value, 10)
		setPage(1)
		setPerPage(next)
		load(1, search, next)
	}

	async function fetchAllData(): Promise<Employee[]> {
		const indukParam = indukFilter ? `&induk=${encodeURIComponent(indukFilter)}` : ''
		const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''
		const allRows: Employee[] = []
		let currentPage = 1
		const perPageFetch = 1500 // Use max allowed per page
		
		while (true) {
			const json = await apiFetch<PaginatedEmployees>(`/employees?per_page=${perPageFetch}&page=${currentPage}&search=${encodeURIComponent(search)}${indukParam}${statusParam}`)
			const pageRows = json.data.data || []
			if (pageRows.length === 0) break
			
			allRows.push(...pageRows)
			
			// Check if there are more pages
			const total = json.data.total || 0
			if (allRows.length >= total || pageRows.length < perPageFetch) break
			
			currentPage++
		}
		
		return allRows
	}

	async function exportCsv(sepType: 'comma' | 'semicolon', exportAll: boolean = false) {
		try {
			setExporting(true)
			if (exportAll) {
				info('Mengambil semua data... Ini mungkin memakan waktu beberapa saat.')
			}
			let rows: Employee[] = []
			
			if (exportAll) {
				// Fetch all data without pagination limit
				rows = await fetchAllData()
			} else {
				// Fetch data according to current perPage selection (current page only)
				const indukParam = indukFilter ? `&induk=${encodeURIComponent(indukFilter)}` : ''
				const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''
				const json = await apiFetch<PaginatedEmployees>(`/employees?per_page=${perPage}&page=${page}&search=${encodeURIComponent(search)}${indukParam}${statusParam}`)
				rows = json.data.data || []
			}
			// build CSV with selectable separator and dynamic columns
			const sep = sepType === 'semicolon' ? ';' : ','
			const clean = (v: string | null | undefined) => (v ?? '').replace(/[\r\n]+/g, ' ').trim()
			const formatDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('id-ID') : '')
			const selected: { key: string; header: string; get: (row: Employee) => string }[] = []
			if (cols.nip) selected.push({ key: 'nip', header: 'NIP', get: (row) => "'" + (row.NIP_BARU || '') })
			if (cols.nama) selected.push({ key: 'nama', header: 'Nama', get: (row) => clean(row.NAMA_LENGKAP) })
			if (cols.unit) selected.push({ key: 'unit', header: 'Unit Kerja', get: (row) => clean(row.SATUAN_KERJA) })
			if (cols.induk) selected.push({ key: 'induk', header: 'Induk', get: (row) => clean(row.induk_unit) })
			if (cols.jabatan) selected.push({ key: 'jabatan', header: 'Jabatan', get: (row) => clean(row.KET_JABATAN) })
			if (cols.pangkat) selected.push({ key: 'pangkat', header: 'Pangkat', get: (row) => clean(row.pangkat_asn) })
			if (cols.golongan) selected.push({ key: 'golongan', header: 'Golongan', get: (row) => clean(row.GOL_RUANG) })
			if (cols.tmt_jabatan) selected.push({ key: 'tmt_jabatan', header: 'TMT Jabatan', get: (row) => formatDate(row.TMT_JABATAN) })
			if (cols.tmt_pensiun) selected.push({ key: 'tmt_pensiun', header: 'TMT Pensiun', get: (row) => formatDate(row.TMT_PENSIUN) })
			const header = selected.map(s => s.header)
			const csvLines = [header.join(sep)]
			for (const r of rows) {
				const line = selected.map(s => JSON.stringify(s.get(r)))
				csvLines.push(line.join(sep))
			}
			const now = new Date()
			const pad = (n: number) => String(n).padStart(2, '0')
			const suffix = exportAll ? 'all' : `page${perPage}`
			const fname = `pegawai_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}_${sepType === 'semicolon' ? 'semicolon' : 'comma'}_${suffix}_${rows.length}.csv`
			const blob = new Blob(["\uFEFF" + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = fname
			a.click()
			URL.revokeObjectURL(url)
			if (exportAll) {
				info(`Berhasil mengekspor ${rows.length.toLocaleString('id-ID')} data ke file ${fname}`, 'Export Berhasil')
			}
		} catch (e) {
			console.error('Export failed', e)
			if (exportAll) {
				info('Gagal mengekspor data. Silakan coba lagi.', 'Export Gagal')
			}
		} finally {
			setExporting(false)
		}
	}

	async function exportXlsxLike(exportAll: boolean = false) {
		try {
			setExporting(true)
			if (exportAll) {
				info('Mengambil semua data... Ini mungkin memakan waktu beberapa saat.')
			}
			let rows: Employee[] = []
			
			if (exportAll) {
				// Fetch all data without pagination limit
				rows = await fetchAllData()
			} else {
				// Fetch data according to current perPage selection (current page only)
				const indukParam = indukFilter ? `&induk=${encodeURIComponent(indukFilter)}` : ''
				const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''
				const json = await apiFetch<PaginatedEmployees>(`/employees?per_page=${perPage}&page=${page}&search=${encodeURIComponent(search)}${indukParam}${statusParam}`)
				rows = json.data.data || []
			}
			// Build a real XLSX workbook (no more Excel warnings) with dynamic columns
			const formatDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('id-ID') : '')
			const selected: { key: string; header: string; get: (row: Employee) => string }[] = []
			if (cols.nip) selected.push({ key: 'nip', header: 'NIP', get: (row) => row.NIP_BARU || '' })
			if (cols.nama) selected.push({ key: 'nama', header: 'Nama', get: (row) => row.NAMA_LENGKAP || '' })
			if (cols.unit) selected.push({ key: 'unit', header: 'Unit Kerja', get: (row) => row.SATUAN_KERJA || '' })
			if (cols.induk) selected.push({ key: 'induk', header: 'Induk', get: (row) => row.induk_unit || '' })
			if (cols.jabatan) selected.push({ key: 'jabatan', header: 'Jabatan', get: (row) => row.KET_JABATAN || '' })
			if (cols.pangkat) selected.push({ key: 'pangkat', header: 'Pangkat', get: (row) => row.pangkat_asn || '' })
			if (cols.golongan) selected.push({ key: 'golongan', header: 'Golongan', get: (row) => row.GOL_RUANG || '' })
			if (cols.tmt_jabatan) selected.push({ key: 'tmt_jabatan', header: 'TMT Jabatan', get: (row) => formatDate(row.TMT_JABATAN) })
			if (cols.tmt_pensiun) selected.push({ key: 'tmt_pensiun', header: 'TMT Pensiun', get: (row) => formatDate(row.TMT_PENSIUN) })
			const header = selected.map(s => s.header)
			const data = rows.map(r => selected.map(s => s.get(r)))
			const worksheet = XLSX.utils.aoa_to_sheet([header, ...data])
			// If NIP column is selected, ensure that column is treated as text by Excel
			const nipColIndex = selected.findIndex(s => s.key === 'nip')
			if (nipColIndex >= 0) {
				const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
				for (let row = range.s.r + 1; row <= range.e.r; row++) { // skip header row
					const cellRef = XLSX.utils.encode_cell({ r: row, c: nipColIndex })
					const cell = worksheet[cellRef]
					if (cell) {
						cell.t = 's'
						;(cell as any).z = '@'
					}
				}
			}
			const workbook = XLSX.utils.book_new()
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Pegawai')
			const wbArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
			const blob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			const suffix = exportAll ? 'all' : `page${perPage}`
			const timestamp = new Date().toISOString().slice(0,16).replace(/[-:T]/g,'')
			a.download = `pegawai_${timestamp}_${suffix}_${rows.length}.xlsx`
			a.click()
			URL.revokeObjectURL(url)
			if (exportAll) {
				info(`Berhasil mengekspor ${rows.length.toLocaleString('id-ID')} data ke file Excel`, 'Export Berhasil')
			}
		} catch (e) {
			console.error('Export failed', e)
			if (exportAll) {
				info('Gagal mengekspor data. Silakan coba lagi.', 'Export Gagal')
			}
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
						<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.tmt_jabatan} onChange={()=>toggleCol('tmt_jabatan')} /><span>TMT Jabatan</span></label></li>
						<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.tmt_pensiun} onChange={()=>toggleCol('tmt_pensiun')} /><span>TMT Pensiun</span></label></li>
							<li><label className="flex items-center gap-2"><input type="checkbox" className="checkbox checkbox-sm" checked={cols.actions} onChange={()=>toggleCol('actions')} /><span>Actions</span></label></li>
						</ul>
					</div>
				<button
					type="button"
					className="btn btn-sm w-full sm:w-auto sm:max-w-xs md:w-80 text-left justify-start"
					onClick={() => setIndukModalOpen(true)}
				>
					<span className="truncate">{indukFilter || "Semua Induk"}</span>
					<span className="ml-auto">▼</span>
				</button>
				<button
					type="button"
					className="btn btn-sm w-full sm:w-auto sm:max-w-xs"
					onClick={() => setStatusModalOpen(true)}
				>
					<span>{statusFilter === 'aktif' ? 'Aktif' : statusFilter === 'pensiun' ? 'Pensiun' : 'Semua Status'}</span>
					<span className="ml-auto">▼</span>
				</button>
					<button className="btn btn-sm whitespace-nowrap" onClick={resetFilters} title="Reset pencarian dan filter">Reset</button>
					<div className="dropdown">
						<div tabIndex={0} role="button" className="btn btn-sm btn-primary whitespace-nowrap" aria-haspopup="menu">
							{exporting ? <span className="loading loading-dots loading-sm" /> : 'Export'}
						</div>
						<ul className="dropdown-content menu bg-base-100 rounded-box shadow p-2 w-64 z-50" role="menu">
							<li className="menu-title"><span>Halaman Saat Ini ({perPage} data)</span></li>
							<li><button onClick={()=>exportCsv('comma', false)}>CSV (Koma ,)</button></li>
							<li><button onClick={()=>exportCsv('semicolon', false)}>CSV (Titik Koma ;)</button></li>
							<li><button onClick={()=>exportXlsxLike(false)}>Excel (.xlsx)</button></li>
							<li><hr className="my-1" /></li>
							<li className="menu-title"><span>Semua Data (Tanpa Paginasi)</span></li>
							<li><button onClick={()=>exportCsv('comma', true)}>CSV (Koma ,)</button></li>
							<li><button onClick={()=>exportCsv('semicolon', true)}>CSV (Titik Koma ;)</button></li>
							<li><button onClick={()=>exportXlsxLike(true)}>Excel (.xlsx)</button></li>
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
							{cols.tmt_jabatan && <th className="hidden md:table-cell">TMT Jabatan</th>}
							{cols.tmt_pensiun && <th className="hidden md:table-cell">TMT Pensiun</th>}
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
									{isRetired(e.TMT_PENSIUN) && (
										<span className="badge badge-error badge-soft badge-xs text-white">Pensiun</span>
									)}
                                            <button
                                                onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(e.NIP_BARU||''); info('NIP berhasil disalin'); } catch {} }}
                                                className="btn btn-ghost btn-xs opacity-60 hover:opacity-100 focus:opacity-100"
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
									{isRetired(e.TMT_PENSIUN) && (
										<span className="badge badge-error badge-soft badge-xs text-white">Pensiun</span>
									)}
                                            <button
                                                onClick={async ()=>{ try { await navigator.clipboard?.writeText?.(e.NAMA_LENGKAP||''); info('Nama berhasil disalin'); } catch {} }}
                                                className="btn btn-ghost btn-xs opacity-60 hover:opacity-100 focus:opacity-100"
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
								{cols.tmt_jabatan && (
									<td className="hidden md:table-cell">{e.TMT_JABATAN ? new Date(e.TMT_JABATAN).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
								)}
								{cols.tmt_pensiun && (
									<td className="hidden md:table-cell">{e.TMT_PENSIUN ? new Date(e.TMT_PENSIUN).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td>
								)}
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
									{isRetired(e.TMT_PENSIUN) && (
										<span className="badge badge-error badge-soft badge-xs text-white">Pensiun</span>
										)}
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
										{isRetired(e.TMT_PENSIUN) && (
											<span className="badge badge-error badge-soft badge-xs">Pensiun</span>
										)}
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
									{isRetired(selected?.TMT_PENSIUN) && (
										<span className="badge badge-error badge-soft badge-xs text-white">Pensiun</span>
									)}
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
									{isRetired(selected?.TMT_PENSIUN) && (
										<span className="badge badge-error badge-soft badge-xs text-white">Pensiun</span>
									)}
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

			{/* Modal Filter Induk */}
			<dialog ref={indukModalRef} className="modal">
				<div className="modal-box">
					<h3 className="font-bold text-lg mb-4">Pilih Induk</h3>
					<div className="form-control mb-4">
						<input
							type="text"
							className="input input-bordered"
							placeholder="Cari induk..."
							value={indukSearch}
							onChange={(e) => setIndukSearch(e.target.value)}
							autoFocus
						/>
					</div>
					<div className="max-h-96 overflow-y-auto">
						<ul className="menu">
							<li>
								<button
									onClick={() => {
										setIndukFilter('')
										setIndukModalOpen(false)
										setIndukSearch('')
									}}
									className={indukFilter === '' ? 'active' : ''}
								>
									Semua Induk
								</button>
							</li>
							{(indukOptions || [])
								.filter(option => 
									indukSearch === '' || 
									option.toLowerCase().includes(indukSearch.toLowerCase())
								)
								.map(v => (
									<li key={v}>
										<button
											onClick={() => {
												setIndukFilter(v)
												setIndukModalOpen(false)
												setIndukSearch('')
											}}
											className={indukFilter === v ? 'active' : ''}
										>
											{v}
										</button>
									</li>
								))}
							{indukSearch !== '' && (indukOptions || []).filter(option => 
								option.toLowerCase().includes(indukSearch.toLowerCase())
							).length === 0 && (
								<li><span className="text-base-content/50 text-sm px-4 py-2">Tidak ditemukan</span></li>
							)}
						</ul>
					</div>
					<div className="modal-action">
						<form method="dialog">
							<button className="btn" onClick={() => setIndukModalOpen(false)}>Tutup</button>
						</form>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button onClick={() => setIndukModalOpen(false)}>close</button>
				</form>
			</dialog>

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
