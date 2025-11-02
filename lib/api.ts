// Helper to get token from either localStorage or sessionStorage
function getToken(): string | null {
	if (typeof window === 'undefined') return null
	return localStorage.getItem('token') || sessionStorage.getItem('token')
}

// Helper to clear auth data from both storages
function clearAuthData() {
	if (typeof window === 'undefined') return
	localStorage.removeItem('token')
	localStorage.removeItem('role')
	localStorage.removeItem('username')
	sessionStorage.removeItem('token')
	sessionStorage.removeItem('role')
	sessionStorage.removeItem('username')
}

export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
	const token = getToken()
	const headers: HeadersInit = {
		...(init?.headers || {}),
		Authorization: token ? `Bearer ${token}` : ''
	};
	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`,
		{ ...init, headers, cache: 'no-store' });
	if (!res.ok) {
		// Redirect to login if unauthorized
		if (res.status === 401 && typeof window !== 'undefined') {
			clearAuthData()
			window.location.href = '/auth/login'
			throw new Error('Unauthorized')
		}
		const text = await res.text();
		throw new Error(text || `Request failed: ${res.status}`);
	}
	return res.json();
}
