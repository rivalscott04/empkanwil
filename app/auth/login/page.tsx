'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

	// Redirect if already logged in
	useEffect(() => {
		const token = localStorage.getItem('token') || sessionStorage.getItem('token')
		if (token) {
			router.replace('/employees')
		}
	}, [router])

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		const form = new FormData(e.currentTarget)
		const identifier = String(form.get('identifier')||'')
		const password = String(form.get('password')||'')
		const rememberMe = form.get('rememberMe') === 'on'
		setLoading(true)
		setError(null)
		try {
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier, password })
			})
		const json = await res.json()
		if (!res.ok || !json?.data?.access_token) throw new Error(json?.message||'Login gagal')
		
		// Use localStorage if remember me is checked, sessionStorage otherwise
		const storage = rememberMe ? localStorage : sessionStorage
		storage.setItem('token', json.data.access_token)
		storage.setItem('role', json.data.user?.role||'')
		storage.setItem('username', json.data.user?.name||'')
		
		// Clear the opposite storage to avoid conflicts
		if (rememberMe) {
			sessionStorage.removeItem('token')
			sessionStorage.removeItem('role')
			sessionStorage.removeItem('username')
		} else {
			localStorage.removeItem('token')
			localStorage.removeItem('role')
			localStorage.removeItem('username')
		}
		
		router.replace('/employees')
		} catch (err: any) {
			setError(err.message || 'Login gagal')
		} finally {
			setLoading(false)
		}
	}

    return (
        <section className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-base-100 to-base-200 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Illustration / Left Panel */}
                <div className="hidden md:flex items-center justify-center">
                    <div className="w-full max-w-2xl">
                        <div className="mockup-browser border bg-base-300/30">
                            <div className="mockup-browser-toolbar">
                                <div className="input">Welcome — Portal Pegawai</div>
                            </div>
                            <div className="bg-base-100 p-6 md:p-10">
                                <div className="grid gap-4">
                                    <div className="skeleton h-6 w-1/2"></div>
                                    <div className="skeleton h-4 w-2/3"></div>
                                    <div className="skeleton h-4 w-full"></div>
                                    <div className="skeleton h-4 w-5/6"></div>
                                </div>
                                <div className="mt-8 flex gap-3">
                                    <div className="badge badge-primary">Akurat</div>
                                    <div className="badge">Cepat</div>
                                    <div className="badge">Aman</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form / Right Panel */}
                <div className="w-full max-w-md mx-auto">
                    <div className="mb-6 text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome</h1>
                        <p className="text-sm text-base-content/70">Masuk untuk melanjutkan pekerjaan Anda.</p>
                    </div>

                    <div className="card bg-base-200/40 shadow-xl">
                        <div className="card-body p-4 sm:p-6">
                            <form className="space-y-4" onSubmit={onSubmit}>
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Email atau Username</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        name="identifier" 
                                        placeholder="email@example.com atau username" 
                                        className="input input-bordered w-full" 
                                        required 
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Password</span>
                                    </label>
                                    <input 
                                        type="password" 
                                        name="password" 
                                        placeholder="••••••••" 
                                        className="input input-bordered w-full" 
                                        required 
                                    />
                                </div>

                                <div className="flex items-center">
                                    <label className="label cursor-pointer gap-2">
                                        <input type="checkbox" name="rememberMe" className="checkbox checkbox-sm" />
                                        <span className="label-text">Remember me</span>
                                    </label>
                                </div>

                                {error && (
                                    <div className="alert alert-error">
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                <button 
                                    className="btn btn-primary w-full shadow-lg shadow-primary/30" 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="loading loading-spinner"></span>
                                    ) : (
                                        'Login'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
