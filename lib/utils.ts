/**
 * Helper functions for date formatting and calculations
 */

/**
 * Format date from DB (YYYY-MM-DD) to display format (dd-mm-yyyy)
 */
export function formatDateDisplay(date: string | null | undefined): string {
	if (!date) return '-'
	// If in YYYY-MM-DD format, convert to dd-mm-yyyy
	if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		const [year, month, day] = date.split('-')
		return `${day}-${month}-${year}`
	}
	// Try to parse other formats
	const parsed = new Date(date)
	if (isNaN(parsed.getTime())) return '-'
	const day = String(parsed.getDate()).padStart(2, '0')
	const month = String(parsed.getMonth() + 1).padStart(2, '0')
	const year = parsed.getFullYear()
	return `${day}-${month}-${year}`
}

/**
 * Format date from DB (YYYY-MM-DD) to input format (YYYY-MM-DD)
 * HTML date input expects YYYY-MM-DD format, same as DB
 */
export function formatDateForInput(date: string | null | undefined): string {
	if (!date) return ""
	// If already in YYYY-MM-DD format, return as is
	if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
	// Try to parse other formats
	const parsed = new Date(date)
	if (isNaN(parsed.getTime())) return ""
	return parsed.toISOString().split("T")[0]
}

/**
 * Check if employee is retired based on TMT_PENSIUN date
 * Pensiun: TMT_PENSIUN tidak null dan TMT_PENSIUN <= hari ini
 * Aktif: TMT_PENSIUN null atau TMT_PENSIUN > hari ini
 */
export function isRetired(tmtPensiun: string | null | undefined): boolean {
	if (!tmtPensiun) return false
	
	// Parse the date from YYYY-MM-DD format
	const retirementDate = new Date(tmtPensiun)
	const today = new Date()
	
	// Set time to 00:00:00 for accurate date-only comparison
	today.setHours(0, 0, 0, 0)
	retirementDate.setHours(0, 0, 0, 0)
	
	// Retired if retirement date is today or in the past
	return retirementDate <= today
}

/**
 * Get employee status text: 'Aktif' or 'Pensiun'
 */
export function getEmployeeStatus(tmtPensiun: string | null | undefined): 'Aktif' | 'Pensiun' {
	return isRetired(tmtPensiun) ? 'Pensiun' : 'Aktif'
}

/**
 * Count statistics from employee array
 * Returns: { total: number, aktif: number, pensiun: number }
 */
export function countEmployeeStatistics(employees: Array<{ TMT_PENSIUN: string | null }>) {
	const total = employees.length
	let aktif = 0
	let pensiun = 0
	
	employees.forEach(emp => {
		if (isRetired(emp.TMT_PENSIUN)) {
			pensiun++
		} else {
			aktif++
		}
	})
	
	return { total, aktif, pensiun }
}

