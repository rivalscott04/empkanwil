<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Http\Requests\EmployeeIndexRequest;
use App\Http\Requests\EmployeeByLocationRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class EmployeeController extends Controller
{
	public function index(EmployeeIndexRequest $request)
	{
		$this->authorize('viewAny', Employee::class);

		$validated = $request->validated();
		
		$perPageRaw = $validated['per_page'] ?? '15';
		$perPage = 15;
		if (is_string($perPageRaw) && strtolower($perPageRaw) === 'all') {
			// Don't allow 'all' in production
			if (app()->environment('production')) {
				$perPage = 1500; // Max in production
			} else {
				$perPage = 10000; // Max in development
			}
		} else {
			$perPage = (int) $perPageRaw;
			$allowed = [10, 25, 50, 100, 200, 1500];
			if (!in_array($perPage, $allowed, true)) {
				$perPage = 15;
			}
		}
		
		// Enforce maximum limit
		$perPage = min($perPage, 1500); // Maximum 1500 records per page
		$search = $validated['search'] ?? '';
		$induk = $validated['induk'] ?? '';
		$jabatan = $validated['jabatan'] ?? '';
		$kodeJabatan = $validated['kode_jabatan'] ?? '';
		$status = $validated['status'] ?? ''; // 'aktif' or 'pensiun'
		$golongan = $validated['golongan'] ?? '';

		$query = Employee::query();
		if ($search !== '') {
			$query->where(function ($q) use ($search) {
				$q->where('NAMA_LENGKAP', 'like', "%$search%")
					->orWhere('SATUAN_KERJA', 'like', "%$search%")
					->orWhere('KET_JABATAN', 'like', "%$search%")
					->orWhere('NIP_BARU', 'like', "%$search%")
					->orWhere('KODE_JABATAN', 'like', "%$search%")
					->orWhere('KODE_SATUAN_KERJA', 'like', "%$search%");
			});
		}

		// Filter by status (aktif/pensiun)
		// Aktif: TMT_PENSIUN null atau TMT_PENSIUN > hari ini (belum sampai tanggal pensiun)
		// Pensiun: TMT_PENSIUN tidak null dan TMT_PENSIUN <= hari ini (sudah lewat atau sama dengan tanggal pensiun)
		if ($status === 'aktif') {
			$query->where(function ($q) {
				$q->whereNull('TMT_PENSIUN')
					->orWhere('TMT_PENSIUN', '>', now()->toDateString());
			});
		} elseif ($status === 'pensiun') {
			$query->whereNotNull('TMT_PENSIUN')
				->where('TMT_PENSIUN', '<=', now()->toDateString());
		}

		// Filter by golongan
		if ($golongan !== '') {
			$query->where('GOL_RUANG', $golongan);
		}

		if ($induk !== '' || $kodeJabatan !== '' || $jabatan !== '') {
		// Manual filter by canonical induk with computed mapping, then manual paginate
		$pageNum = max(1, (int) ($validated['page'] ?? 1));
			// Use chunking to avoid memory exhaustion for large datasets
			$filtered = collect();
			$query->chunk(1000, function ($chunk) use (&$filtered, $induk, $kodeJabatan, $jabatan, $status, $golongan) {
				foreach ($chunk as $e) {
					// Filter by induk
					if ($induk !== '') {
						$computed = $this->computeIndukUnit($e->SATUAN_KERJA, $e->kab_kota, $e->KET_JABATAN ?? null);
						if ($computed !== $induk) {
							continue;
						}
					}
					// Filter by kode_jabatan or jabatan
					if ($kodeJabatan !== '') {
						if ($e->KODE_JABATAN !== $kodeJabatan) {
							continue;
						}
					} elseif ($jabatan !== '') {
						if ($e->KET_JABATAN !== $jabatan) {
							continue;
						}
					}
					// Filter by golongan
					if ($golongan !== '') {
						if ($e->GOL_RUANG !== $golongan) {
							continue;
						}
					}
					// Filter by status
					if ($status === 'aktif' || $status === 'pensiun') {
						$today = now()->toDateString();
						if ($e->TMT_PENSIUN === null) {
							if ($status !== 'aktif') continue;
						} elseif ($status === 'aktif') {
							if ($e->TMT_PENSIUN <= $today) continue;
						} else {
							if ($e->TMT_PENSIUN > $today) continue;
						}
					}
					$filtered->push($e);
				}
			});
			// Sort ALL filtered data first (before pagination) by induk_unit (Kanwil first)
			$kanwilName = 'Kantor Wilayah Kementerian Agama Provinsi Nusa Tenggara Barat';
			$filtered->transform(function ($e) {
				$e->induk_unit = $this->computeIndukUnit($e->SATUAN_KERJA, $e->kab_kota, $e->KET_JABATAN ?? null);
				return $e;
			})->sortBy(function ($e) use ($kanwilName) {
				// Sort: Kanwil first, then alphabetically by induk_unit, then by NAMA_LENGKAP
				$induk = $e->induk_unit ?? '';
				if ($induk === $kanwilName) {
					return '0_' . strtolower($e->NAMA_LENGKAP ?? '');
				}
				return '1_' . strtolower($induk) . '_' . strtolower($e->NAMA_LENGKAP ?? '');
			})->values();
			
			$totalCount = $filtered->count();
			// Apply pagination with max limit
			$items = $filtered->slice(($pageNum - 1) * $perPage, $perPage)->values();
			return response()->json([
				'success' => true,
				'data' => [
					'data' => $items,
					'total' => $totalCount,
					'per_page' => $perPage,
					'current_page' => $pageNum,
				],
			]);
		}

	if ($kodeJabatan !== '') {
		$query->where('KODE_JABATAN', $kodeJabatan);
	} elseif ($jabatan !== '') {
		$query->where('KET_JABATAN', $jabatan);
	}
	
	// Get data with chunking, compute induk_unit, sort, then paginate manually
	$all = collect();
	$query->chunk(1000, function ($chunk) use (&$all) {
		$all = $all->merge($chunk);
	});
	
	// Compute induk_unit for all records
	$all->transform(function ($e) {
		$e->induk_unit = $this->computeIndukUnit($e->SATUAN_KERJA, $e->kab_kota, $e->KET_JABATAN ?? null);
		return $e;
	});
	
	// Sort: Kanwil (Kantor Wilayah) first, then alphabetically by induk_unit, then by NAMA_LENGKAP
	$kanwilName = 'Kantor Wilayah Kementerian Agama Provinsi Nusa Tenggara Barat';
	$sorted = $all->sortBy(function ($e) use ($kanwilName) {
		$induk = $e->induk_unit ?? '';
		if ($induk === $kanwilName) {
			return '0_' . strtolower($e->NAMA_LENGKAP ?? '');
		}
		return '1_' . strtolower($induk) . '_' . strtolower($e->NAMA_LENGKAP ?? '');
	})->values();
	
	// Manual pagination after sorting
	$pageNum = max(1, (int) ($validated['page'] ?? 1));
	$totalCount = $sorted->count();
	$paginatedData = $sorted->slice(($pageNum - 1) * $perPage, $perPage)->values();
	
	return response()->json([
		'success' => true,
		'data' => [
			'data' => $paginatedData,
			'total' => $totalCount,
			'per_page' => $perPage,
			'current_page' => $pageNum,
			'last_page' => (int) ceil($totalCount / $perPage),
			'from' => $totalCount > 0 ? (($pageNum - 1) * $perPage) + 1 : 0,
			'to' => min($pageNum * $perPage, $totalCount),
		],
	]);
	}

	public function show(Employee $employee)
	{
		$this->authorize('view', $employee);
        $employee->induk_unit = $this->computeIndukUnit($employee->SATUAN_KERJA, $employee->kab_kota, $employee->KET_JABATAN ?? null);
		return response()->json(['success' => true, 'data' => $employee]);
	}

	public function store(Request $request)
	{
		$this->authorize('create', Employee::class);

		$data = $this->validateData($request, true);
		$employee = Employee::create($data);
		return response()->json(['success' => true, 'data' => $employee], 201);
	}

	public function update(Request $request, Employee $employee)
	{
		$this->authorize('update', $employee);

		$userRole = $request->user()->loadMissing('role')->role?->name;
		
		// Admin can edit all fields except induk (computed field, read-only for everyone)
		// Operator can edit all fields except NIP_BARU and induk
		if ($userRole === 'admin') {
			// Admin can edit everything except induk (computed field)
			$fillable = ['NIP','NIP_BARU','NAMA_LENGKAP','KODE_PANGKAT','GOL_RUANG','pangkat_asn','TMT_PANGKAT','MK_TAHUN','MK_BULAN','KODE_SATUAN_KERJA','SATUAN_KERJA','KODE_JABATAN','KET_JABATAN','TMT_JABATAN','NAMA_SEKOLAH','KODE_JENJANG_PENDIDIKAN','JENJANG_PENDIDIKAN','AKTA','FAKULTAS_PENDIDIKAN','JURUSAN','TAHUN_LULUS','TGL_LAHIR','TEMPAT_LAHIR','ISI_UNIT_KERJA','kab_kota','TMT_PENSIUN','tmt_cpns'];
		} else if ($userRole === 'operator') {
			// Operator can edit everything except NIP_BARU and induk
			$fillable = ['NIP','NAMA_LENGKAP','KODE_PANGKAT','GOL_RUANG','pangkat_asn','TMT_PANGKAT','MK_TAHUN','MK_BULAN','KODE_SATUAN_KERJA','SATUAN_KERJA','KODE_JABATAN','KET_JABATAN','TMT_JABATAN','NAMA_SEKOLAH','KODE_JENJANG_PENDIDIKAN','JENJANG_PENDIDIKAN','AKTA','FAKULTAS_PENDIDIKAN','JURUSAN','TAHUN_LULUS','TGL_LAHIR','TEMPAT_LAHIR','ISI_UNIT_KERJA','kab_kota','TMT_PENSIUN','tmt_cpns'];
		} else {
			// Other roles cannot update
			abort(403, 'Forbidden');
		}

		$data = $request->only($fillable);
		$employee->fill($data);
		$employee->save();

		return response()->json(['success' => true, 'data' => $employee]);
	}

	public function destroy(Employee $employee)
	{
		$this->authorize('delete', $employee);
		$employee->delete();
		return response()->json(['success' => true]);
	}

	/**
	 * Return distinct induk unit names computed across all employees.
	 */
	public function indukUnits(Request $request)
	{
		$this->authorize('viewAny', Employee::class);
		// NTB has exactly 10 kab/kota + 1 Kanwil; return canonical list
		return response()->json(['success' => true, 'data' => $this->canonicalIndukList()]);
	}

	/**
	 * Return statistics: total, aktif, pensiun
	 */
	public function statistics(Request $request)
	{
		$this->authorize('viewAny', Employee::class);
		
		// Aktif: TMT_PENSIUN null atau TMT_PENSIUN > hari ini (belum sampai tanggal pensiun)
		// Pensiun: TMT_PENSIUN tidak null dan TMT_PENSIUN <= hari ini (sudah lewat atau sama dengan tanggal pensiun)
		$total = Employee::count();
		
		// Count aktif: TMT_PENSIUN is null OR > today
		$aktif = Employee::where(function ($q) {
			$q->whereNull('TMT_PENSIUN')
				->orWhere('TMT_PENSIUN', '>', now()->toDateString());
		})->count();
		
		// Count pensiun: TMT_PENSIUN is not null AND <= today
		$pensiun = Employee::whereNotNull('TMT_PENSIUN')
			->where('TMT_PENSIUN', '<=', now()->toDateString())
			->count();

		return response()->json([
			'success' => true,
			'data' => [
				'total' => $total,
				'aktif' => $aktif,
				'pensiun' => $pensiun,
			],
		]);
	}

	/**
	 * Get heatmap data - count employees per location with coordinates
	 */
	public function heatmap(Request $request)
	{
		$this->authorize('viewAny', Employee::class);

		$type = $request->query('type', 'kabupaten'); // 'kabupaten' or 'kanwil'
		$includeInactive = $request->query('include_inactive', 'false') === 'true';

		// Get canonical list
		$indukUnits = $this->canonicalIndukList();

		// Filter by type
		if ($type === 'kanwil') {
			$indukUnits = array_filter($indukUnits, function($unit) {
				return str_contains($unit, 'Kantor Wilayah');
			});
		} else {
			$indukUnits = array_filter($indukUnits, function($unit) {
				return !str_contains($unit, 'Kantor Wilayah');
			});
		}

		// Build query for employee count
		$query = Employee::query();
		if (!$includeInactive) {
			// Only count active employees
			$query->where(function ($q) {
				$q->whereNull('TMT_PENSIUN')
					->orWhere('TMT_PENSIUN', '>', now()->toDateString());
			});
		}

		// Get employee counts per induk unit with breakdown aktif/pensiun using chunking
		// Single pass calculation to avoid N+1 queries
		$employeeCounts = [];
		$today = now()->toDateString();
		
		foreach ($indukUnits as $indukUnit) {
			$stats = ['total' => 0, 'aktif' => 0, 'pensiun' => 0];
			$employeesQuery = clone $query;
			$employeesQuery->chunk(1000, function ($chunk) use (&$stats, $indukUnit, $today) {
				foreach ($chunk as $emp) {
					if ($this->computeIndukUnit($emp->SATUAN_KERJA, $emp->kab_kota, $emp->KET_JABATAN) === $indukUnit) {
						$stats['total']++;
						if ($emp->TMT_PENSIUN === null || $emp->TMT_PENSIUN > $today) {
							$stats['aktif']++;
						} else {
							$stats['pensiun']++;
						}
					}
				}
			});

			$employeeCounts[$indukUnit] = $stats;
		}

		// Get coordinates from database
		$coordinates = \App\Models\Coordinate::whereIn('induk_unit', $indukUnits)
			->get()
			->keyBy('induk_unit');

		// Build response data
		$data = [];
		foreach ($indukUnits as $indukUnit) {
			$coord = $coordinates->get($indukUnit);
			if ($coord) {
				// Extract location name (simplified)
				$locationName = str_replace('Kantor Kementerian Agama ', '', $indukUnit);
				$locationName = str_replace('Kantor Wilayah Kementerian Agama Provinsi ', '', $locationName);

				$stats = $employeeCounts[$indukUnit] ?? ['total' => 0, 'aktif' => 0, 'pensiun' => 0];
				$data[] = [
					'location' => $locationName,
					'induk_unit' => $indukUnit,
					'count' => $stats['total'],
					'aktif' => $stats['aktif'],
					'pensiun' => $stats['pensiun'],
					'latitude' => (float) $coord->latitude,
					'longitude' => (float) $coord->longitude,
				];
			}
		}

		return response()->json([
			'success' => true,
			'data' => $data,
		]);
	}

	/**
	 * Get employees by location (induk_unit) with statistics
	 * Security: Uses same authorization as index (viewAny policy)
	 * Performance: Uses chunking to avoid N+1 queries and memory issues
	 */
	public function byLocation(EmployeeByLocationRequest $request)
	{
		$this->authorize('viewAny', Employee::class);

		$validated = $request->validated();
		$indukUnit = $validated['induk_unit'];
		$locationName = $validated['location'] ?? '';
		$search = $validated['search'] ?? '';
		$status = $validated['status'] ?? '';
		$perPage = (int) $validated['per_page'];
		$pageNum = max(1, (int) $validated['page']);

		// Validate induk_unit is in canonical list (security)
		$canonicalIndukUnits = $this->canonicalIndukList();
		if (!in_array($indukUnit, $canonicalIndukUnits, true)) {
			return response()->json([
				'success' => false,
				'message' => 'Invalid induk_unit',
			], 400);
		}

		// Build base query
		$query = Employee::query();

		// Apply search filter
		if ($search !== '') {
			$query->where(function ($q) use ($search) {
				$q->where('NAMA_LENGKAP', 'like', "%$search%")
					->orWhere('SATUAN_KERJA', 'like', "%$search%")
					->orWhere('KET_JABATAN', 'like', "%$search%")
					->orWhere('NIP_BARU', 'like', "%$search%");
			});
		}

		// Apply status filter
		if ($status === 'aktif') {
			$query->where(function ($q) {
				$q->whereNull('TMT_PENSIUN')
					->orWhere('TMT_PENSIUN', '>', now()->toDateString());
			});
		} elseif ($status === 'pensiun') {
			$query->whereNotNull('TMT_PENSIUN')
				->where('TMT_PENSIUN', '<=', now()->toDateString());
		}

		// Use chunking to filter by computed induk_unit and calculate statistics in one pass
		$filtered = collect();
		$stats = ['total' => 0, 'aktif' => 0, 'pensiun' => 0];
		$today = now()->toDateString();

		$query->chunk(1000, function ($chunk) use (&$filtered, &$stats, $indukUnit, $today) {
			foreach ($chunk as $e) {
				// Compute induk_unit and check match
				$computedInduk = $this->computeIndukUnit($e->SATUAN_KERJA, $e->kab_kota, $e->KET_JABATAN ?? null);
				if ($computedInduk !== $indukUnit) {
					continue;
				}

				// Add computed field
				$e->induk_unit = $computedInduk;

				// Calculate statistics in same pass (avoid N+1)
				$stats['total']++;
				if ($e->TMT_PENSIUN === null || $e->TMT_PENSIUN > $today) {
					$stats['aktif']++;
				} else {
					$stats['pensiun']++;
				}

				$filtered->push($e);
			}
		});

		// Sort: by NAMA_LENGKAP
		$sorted = $filtered->sortBy(function ($e) {
			return strtolower($e->NAMA_LENGKAP ?? '');
		})->values();

		// Manual pagination
		$totalCount = $sorted->count();
		$paginatedData = $sorted->slice(($pageNum - 1) * $perPage, $perPage)->values();

		// If location name not provided, extract from induk_unit
		if ($locationName === '') {
			$locationName = str_replace('Kantor Kementerian Agama ', '', $indukUnit);
			$locationName = str_replace('Kantor Wilayah Kementerian Agama Provinsi ', '', $locationName);
		}

		return response()->json([
			'success' => true,
			'data' => [
				'location' => $locationName,
				'induk_unit' => $indukUnit,
				'statistics' => $stats,
				'employees' => [
					'data' => $paginatedData,
					'total' => $totalCount,
					'per_page' => $perPage,
					'current_page' => $pageNum,
					'last_page' => (int) ceil($totalCount / $perPage),
					'from' => $totalCount > 0 ? (($pageNum - 1) * $perPage) + 1 : 0,
					'to' => min($pageNum * $perPage, $totalCount),
				],
			],
		]);
	}

	/**
	 * Canonical list of induk units for NTB.
	 */
	private function canonicalIndukList(): array
	{
		return [
			'Kantor Wilayah Kementerian Agama Provinsi Nusa Tenggara Barat',
			'Kantor Kementerian Agama Kota Mataram',
			'Kantor Kementerian Agama Kota Bima',
			'Kantor Kementerian Agama Kabupaten Lombok Barat',
			'Kantor Kementerian Agama Kabupaten Lombok Tengah',
			'Kantor Kementerian Agama Kabupaten Lombok Timur',
			'Kantor Kementerian Agama Kabupaten Lombok Utara',
			'Kantor Kementerian Agama Kabupaten Sumbawa',
			'Kantor Kementerian Agama Kabupaten Sumbawa Barat',
			'Kantor Kementerian Agama Kabupaten Dompu',
			'Kantor Kementerian Agama Kabupaten Bima',
		];
	}

	/**
	 * Return distinct values for a whitelisted column.
	 */
	public function distinct(Request $request)
	{
		$this->authorize('viewAny', Employee::class);
		$column = $request->query('column', '');
		$whitelist = [
			'KET_JABATAN',
			'pangkat_asn',
			'GOL_RUANG',
			'SATUAN_KERJA',
			'kab_kota',
		];
		if (!in_array($column, $whitelist, true)) {
			return response()->json(['success' => false, 'data' => []]);
		}
		$values = Employee::query()
			->select($column)
			->whereNotNull($column)
			->distinct()
			->orderBy($column)
			->pluck($column)
			->filter(function ($v) { return trim((string)$v) !== ''; })
			->values()
			->all();
		return response()->json(['success' => true, 'data' => $values]);
	}

	/**
	 * Return distinct job options as code-name pairs.
	 */
	public function jabatanOptions(Request $request)
	{
		$this->authorize('viewAny', Employee::class);
		$rows = Employee::query()
			->select(['KODE_JABATAN','KET_JABATAN'])
			->whereNotNull('KODE_JABATAN')
			->orderBy('KODE_JABATAN')
			->get();
		$map = [];
		foreach ($rows as $r) {
			$code = trim((string)$r->KODE_JABATAN);
			if ($code === '') continue;
			if (!isset($map[$code])) {
				$name = trim((string)$r->KET_JABATAN) !== '' ? (string)$r->KET_JABATAN : $code;
				$map[$code] = $name;
			}
		}
		$opts = [];
		foreach ($map as $code => $name) {
			$opts[] = ['code' => $code, 'name' => $name];
		}
		return response()->json(['success' => true, 'data' => $opts]);
	}

	private function validateData(Request $request, bool $isCreate = false): array
	{
		$rules = [
			'NIP' => ['nullable','string','max:50'],
			'NIP_BARU' => [$isCreate ? 'required' : 'sometimes','string','max:50'],
			'NAMA_LENGKAP' => ['nullable','string','max:255'],
			'KODE_PANGKAT' => ['nullable','string','max:20'],
			'GOL_RUANG' => ['nullable','string','max:20'],
			'pangkat_asn' => ['nullable','string','max:100'],
			'TMT_PANGKAT' => ['nullable','date'],
			'MK_TAHUN' => ['nullable','integer'],
			'MK_BULAN' => ['nullable','integer'],
			'KODE_SATUAN_KERJA' => ['nullable','string','max:50'],
			'SATUAN_KERJA' => ['nullable','string','max:255'],
			'KODE_JABATAN' => ['nullable','string','max:50'],
			'KET_JABATAN' => ['nullable','string','max:255'],
			'TMT_JABATAN' => ['nullable','date'],
			'NAMA_SEKOLAH' => ['nullable','string','max:255'],
			'KODE_JENJANG_PENDIDIKAN' => ['nullable','string','max:50'],
			'JENJANG_PENDIDIKAN' => ['nullable','string','max:100'],
			'AKTA' => ['nullable','string','max:100'],
			'FAKULTAS_PENDIDIKAN' => ['nullable','string','max:255'],
			'JURUSAN' => ['nullable','string','max:255'],
			'TAHUN_LULUS' => ['nullable','integer'],
			'TGL_LAHIR' => ['nullable','date'],
			'TEMPAT_LAHIR' => ['nullable','string','max:255'],
			'ISI_UNIT_KERJA' => ['nullable','string'],
			'kab_kota' => ['nullable','string','max:100'],
			'TMT_PENSIUN' => ['nullable','date'],
			'tmt_cpns' => ['nullable','date'],
		];

		return $request->validate($rules);
	}

	/**
	 * Compute parent (induk) unit name from unit text and optional kab/kota.
	 * This is a lightweight ruleset; special cases take precedence over generic ones.
	 */
    private function computeIndukUnit(?string $unit, ?string $kabKota, ?string $jabatan = null): ?string
	{
		$src = trim((string)($unit ?? ''));
		if ($src === '' && $kabKota) {
			$src = $kabKota;
		}

        $lower = mb_strtolower($src);
        $jabLower = mb_strtolower(trim((string)($jabatan ?? '')));

        // PRIORITY: If unit is generic (e.g., Sub Bagian Tata Usaha), try to infer from jabatan text first
        // This must be checked BEFORE Kanwil detection to avoid false positives
        // Check for generic unit patterns
        $isGenericUnit = preg_match('/\bsub\s+bagian\b|\bsubbag\b/u', $lower) || 
                         (preg_match('/\btata\s+usaha\b/u', $lower) && !preg_match('/\bbagian\s+tata\s+usaha\b/u', $lower));
        
        if ($isGenericUnit && $jabLower !== '') {
            // Extract kota/kabupaten from jabatan field
            // Pattern: "Kota X Provinsi..." or "Kabupaten X Provinsi..."
            // Example: "Penata Layanan Operasional pada Sub Bagian Tata Usaha Kantor Kementerian Agama Kota Mataram Provinsi Nusa Tenggara Barat"
            
            // Match "Kota [name] Provinsi" or "Kota [name]" 
            if (preg_match('/\bkota\s+([a-zA-Z\s]+?)(?:\s+provinsi|\s+kantor|$)/ui', $jabLower, $m)) {
                $name = trim(strtolower($m[1]));
                // Clean up - remove trailing "provinsi" or other words if captured
                $name = preg_replace('/\s+provinsi.*$/i', '', $name);
                $name = trim($name);
                if ($name === 'mataram') return 'Kantor Kementerian Agama Kota Mataram';
                if ($name === 'bima') return 'Kantor Kementerian Agama Kota Bima';
            }
            
            // Match "Kabupaten [name] Provinsi" or "Kabupaten [name]" or "Kab [name] Provinsi"
            if (preg_match('/\bkab(upaten)?\s+([a-zA-Z\s]+?)(?:\s+provinsi|\s+kantor|$)/ui', $jabLower, $m)) {
                $name = trim(strtolower($m[count($m)-1]));
                // Clean up - remove trailing "provinsi" or other words if captured
                $name = preg_replace('/\s+provinsi.*$/i', '', $name);
                $name = trim($name);
                switch ($name) {
                    case 'lombok barat': return 'Kantor Kementerian Agama Kabupaten Lombok Barat';
                    case 'lombok tengah': return 'Kantor Kementerian Agama Kabupaten Lombok Tengah';
                    case 'lombok timur': return 'Kantor Kementerian Agama Kabupaten Lombok Timur';
                    case 'lombok utara': return 'Kantor Kementerian Agama Kabupaten Lombok Utara';
                    case 'sumbawa barat': return 'Kantor Kementerian Agama Kabupaten Sumbawa Barat';
                    case 'sumbawa': return 'Kantor Kementerian Agama Kabupaten Sumbawa';
                    case 'dompu': return 'Kantor Kementerian Agama Kabupaten Dompu';
                    case 'bima': return 'Kantor Kementerian Agama Kabupaten Bima';
                }
            }
            
            // Also check for "Kantor Kementerian Agama Kota/Kabupaten X" pattern in jabatan
            if (preg_match('/kantor\s+kementerian\s+agama\s+kota\s+([a-zA-Z\s]+?)(?:\s+provinsi|$)/ui', $jabLower, $m)) {
                $name = trim(strtolower($m[1]));
                $name = preg_replace('/\s+provinsi.*$/i', '', $name);
                $name = trim($name);
                if ($name === 'mataram') return 'Kantor Kementerian Agama Kota Mataram';
                if ($name === 'bima') return 'Kantor Kementerian Agama Kota Bima';
            }
            
            if (preg_match('/kantor\s+kementerian\s+agama\s+kab(upaten)?\s+([a-zA-Z\s]+?)(?:\s+provinsi|$)/ui', $jabLower, $m)) {
                $name = trim(strtolower($m[count($m)-1]));
                $name = preg_replace('/\s+provinsi.*$/i', '', $name);
                $name = trim($name);
                switch ($name) {
                    case 'lombok barat': return 'Kantor Kementerian Agama Kabupaten Lombok Barat';
                    case 'lombok tengah': return 'Kantor Kementerian Agama Kabupaten Lombok Tengah';
                    case 'lombok timur': return 'Kantor Kementerian Agama Kabupaten Lombok Timur';
                    case 'lombok utara': return 'Kantor Kementerian Agama Kabupaten Lombok Utara';
                    case 'sumbawa barat': return 'Kantor Kementerian Agama Kabupaten Sumbawa Barat';
                    case 'sumbawa': return 'Kantor Kementerian Agama Kabupaten Sumbawa';
                    case 'dompu': return 'Kantor Kementerian Agama Kabupaten Dompu';
                    case 'bima': return 'Kantor Kementerian Agama Kabupaten Bima';
                }
            }
        }

		// Kanwil detection - structural units that directly belong to Kanwil
		// Note: This is checked AFTER generic unit check to avoid false positives
		// Only match "Bagian Tata Usaha" (without "Sub") or explicit Kanwil indicators
		$isBagianTataUsaha = preg_match('/\bbagian\s+tata\s+usaha\b/u', $lower) && !preg_match('/\bsub\s+bagian\s+tata\s+usaha\b/u', $lower);
		
		// Check for Kanwil indicators separately to avoid complex regex
		$hasKanwilIndicator = false;
		if (preg_match('/\bkanwil\b|\bkantor\s+wilayah\b|\bprovinsi\s+nusa\s+tenggara\s+barat\b/u', $lower)) {
			$hasKanwilIndicator = true;
		} elseif (preg_match('/\bbimas\s+(islam|kristen|katolik|hindu|buddha)\b/u', $lower)) {
			$hasKanwilIndicator = true;
		} elseif (preg_match('/\bpembimbing\s+masyarakat\s+(islam|kristen|katolik|hindu|buddha)\b/u', $lower)) {
			$hasKanwilIndicator = true;
		} elseif (preg_match('/\bbidang\s+penyelenggara\s+haji\b|\bpenyelenggara\s+umroh\b/u', $lower)) {
			$hasKanwilIndicator = true;
		}
		
		if ($isBagianTataUsaha || $hasKanwilIndicator) {
			return 'Kantor Wilayah Kementerian Agama Provinsi Nusa Tenggara Barat';
		}

        // Specific precedence rules
		// Ensure compound names are handled before partial matches
		if (preg_match('/\bsumbawa\s+barat\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Sumbawa Barat';
		}
		if (preg_match('/\bkota\s+bima\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kota Bima';
		}
		if (preg_match('/\bbima\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Bima';
		}
		if (preg_match('/\bmataram\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kota Mataram';
		}
		if (preg_match('/\bdompu\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Dompu';
		}
		if (preg_match('/\blombok\s+barat\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Lombok Barat';
		}
		if (preg_match('/\blombok\s+tengah\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Lombok Tengah';
		}
		if (preg_match('/\blombok\s+timur\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Lombok Timur';
		}
		if (preg_match('/\blombok\s+utara\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Lombok Utara';
		}
		if (preg_match('/\bsumbawa\b/u', $lower)) {
			return 'Kantor Kementerian Agama Kabupaten Sumbawa';
		}

		// Kecamatan-based hints (when unit mentions a kecamatan like KUA Kecamatan X)
		// User-specific rule: "Alas" belongs to Kabupaten Sumbawa Barat
		if (preg_match('/\b(kua\b[^\n]*\b)?kecamatan\b[^\n]*\balas\b/u', $lower) || preg_match('/\balas\b/u', $lower)) {
			return 'Kementerian Agama Kabupaten Sumbawa Barat';
		}

		// Generic Kota/Kab mapping if present (sanitized and canonicalized)
		if (preg_match('/\bkota\s+([a-zA-Z\s]+)\b/u', $lower, $m)) {
			$name = trim($m[1]);
			if ($name === 'mataram') return 'Kantor Kementerian Agama Kota Mataram';
			if ($name === 'bima') return 'Kantor Kementerian Agama Kota Bima';
		}
		if (preg_match('/\bkab(upaten)?\s+([a-zA-Z\s]+)\b/u', $lower, $m)) {
			$name = trim($m[count($m)-1]);
			switch ($name) {
				case 'lombok barat': return 'Kantor Kementerian Agama Kabupaten Lombok Barat';
				case 'lombok tengah': return 'Kantor Kementerian Agama Kabupaten Lombok Tengah';
				case 'lombok timur': return 'Kantor Kementerian Agama Kabupaten Lombok Timur';
				case 'lombok utara': return 'Kantor Kementerian Agama Kabupaten Lombok Utara';
				case 'sumbawa': return 'Kantor Kementerian Agama Kabupaten Sumbawa';
				case 'sumbawa barat': return 'Kantor Kementerian Agama Kabupaten Sumbawa Barat';
				case 'dompu': return 'Kantor Kementerian Agama Kabupaten Dompu';
				case 'bima': return 'Kantor Kementerian Agama Kabupaten Bima';
			}
		}

		// If contains "kua" followed by kecamatan, fallback to kab/kota hint
		if ($kabKota) {
			$kk = trim($kabKota);
			if ($kk !== '') {
				$clean = preg_replace('/^\s*kantor\s+kementerian\s+agama\s+/iu', '', $kk);
				$clean = preg_replace('/^\s*kementerian\s+agama\s+/iu', '', $clean);
				$cleanLower = mb_strtolower($clean);
				// Map kab/kota hints to canonical
				if (preg_match('/^kota\s+mataram$/u', $cleanLower)) return 'Kantor Kementerian Agama Kota Mataram';
				if (preg_match('/^kota\s+bima$/u', $cleanLower)) return 'Kantor Kementerian Agama Kota Bima';
				if (preg_match('/^kab(upaten)?\s+lombok\s+barat$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Lombok Barat';
				if (preg_match('/^kab(upaten)?\s+lombok\s+tengah$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Lombok Tengah';
				if (preg_match('/^kab(upaten)?\s+lombok\s+timur$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Lombok Timur';
				if (preg_match('/^kab(upaten)?\s+lombok\s+utara$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Lombok Utara';
				if (preg_match('/^kab(upaten)?\s+sumbawa\s+barat$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Sumbawa Barat';
				if (preg_match('/^kab(upaten)?\s+sumbawa$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Sumbawa';
				if (preg_match('/^kab(upaten)?\s+dompu$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Dompu';
				if (preg_match('/^kab(upaten)?\s+bima$/u', $cleanLower)) return 'Kantor Kementerian Agama Kabupaten Bima';
			}
		}

		// Default fallback: jika tidak match dengan kabupaten/kota manapun, maka masuk Kanwil
		return 'Kantor Wilayah Kementerian Agama Provinsi Nusa Tenggara Barat';
	}
}
