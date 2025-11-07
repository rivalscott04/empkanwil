// Helper to get token from either localStorage or sessionStorage
function getToken(): string | null {
	if (typeof window === 'undefined') return null
	return localStorage.getItem('token') || sessionStorage.getItem('token')
}

// Helper to get role from either localStorage or sessionStorage
export function getRole(): string {
	if (typeof window === 'undefined') return ''
	return localStorage.getItem('role') || sessionStorage.getItem('role') || ''
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

export async function apiFetch<T = any>(path: string, init?: RequestInit, retryCount = 0): Promise<T> {
	const token = getToken()
	const headers: HeadersInit = {
		...(init?.headers || {}),
		Authorization: token ? `Bearer ${token}` : ''
	};
	
	const maxRetries = 3;
	const baseDelay = 1000; // 1 second
	
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`,
			{ ...init, headers, cache: 'no-store' });
			
		if (!res.ok) {
			// Redirect to login if unauthorized
			if (res.status === 401 && typeof window !== 'undefined') {
				clearAuthData()
				window.location.href = '/auth/login'
				throw new Error('Unauthorized')
			}
			
			// Handle rate limiting (429) with retry logic
			if (res.status === 429 && retryCount < maxRetries) {
				const retryAfter = res.headers.get('Retry-After');
				const delay = retryAfter 
					? parseInt(retryAfter) * 1000 
					: baseDelay * Math.pow(2, retryCount); // Exponential backoff
				
				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, delay));
				
				// Retry the request
				return apiFetch<T>(path, init, retryCount + 1);
			}
			
			// Try to get JSON error response
			let errorMessage = `Request failed with status ${res.status}`;
			try {
				const json = await res.json();
				errorMessage = json?.message || json?.error || errorMessage;
				
				// Special handling for 429 errors
				if (res.status === 429) {
					errorMessage = 'Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.';
				}
				
				// Include validation errors if available
				if (json?.errors) {
					const errorDetails = Object.values(json.errors).flat().join(', ');
					errorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
				}
			} catch {
				// If not JSON, provide user-friendly message for 429
				if (res.status === 429) {
					errorMessage = 'Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.';
				} else if (process.env.NODE_ENV === 'development') {
					const text = await res.text();
					errorMessage = text || errorMessage;
				}
			}
			
			throw new Error(errorMessage);
		}
		
		return res.json();
	} catch (error) {
		// Log error for debugging (in development only)
		if (process.env.NODE_ENV === 'development') {
			console.error('API Error:', error);
		}
		throw error;
	}
}
