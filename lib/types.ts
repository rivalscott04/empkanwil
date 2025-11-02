export type Employee = {
	NIP: string | null
	NIP_BARU: string
	NAMA_LENGKAP: string
	KODE_PANGKAT: string | null
	GOL_RUANG: string | null
	pangkat_asn: string | null
	TMT_PANGKAT: string | null
	MK_TAHUN: number | null
	MK_BULAN: number | null
	KODE_SATUAN_KERJA: string | null
	SATUAN_KERJA: string | null
	KODE_JABATAN: string | null
	KET_JABATAN: string | null
	TMT_JABATAN: string | null
	NAMA_SEKOLAH: string | null
	KODE_JENJANG_PENDIDIKAN: string | null
	JENJANG_PENDIDIKAN: string | null
	AKTA: string | null
	FAKULTAS_PENDIDIKAN: string | null
	JURUSAN: string | null
	TAHUN_LULUS: number | null
	TGL_LAHIR: string | null
	TEMPAT_LAHIR: string | null
	ISI_UNIT_KERJA: string | null
	kab_kota: string | null
	induk_unit?: string | null
	TMT_PENSIUN: string | null
	tmt_cpns: string | null
}

export type PaginatedEmployees = {
	success: boolean
	data: {
		current_page: number
		data: Employee[]
		from: number | null
		last_page: number
		per_page: number
		to: number | null
		total: number
	}
}

export type Coordinate = {
	id: number
	induk_unit: string
	latitude: number
	longitude: number
	created_at?: string
	updated_at?: string
}

export type HeatmapData = {
	location: string
	induk_unit: string
	count: number
	aktif?: number
	pensiun?: number
	latitude: number
	longitude: number
}
