'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const ALL_THEMES = [
	'light','dark','cupcake','bumblebee','emerald','corporate','synthwave','retro','cyberpunk','valentine','halloween','garden','forest','aqua','lofi','pastel','fantasy','wireframe','black','luxury','dracula','cmyk','autumn','business','acid','lemonade','night','winter','dim','nord','sunset','coffee','caramellatte','abyss','silk','orange'
]

export default function Navbar() {
	const router = useRouter()
	const pathname = usePathname()
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [userRole, setUserRole] = useState('')
	const [username, setUsername] = useState('')
	const [themeQuery, setThemeQuery] = useState('')
	const [currentTheme, setCurrentTheme] = useState('')

	useEffect(() => {
		// Check both localStorage and sessionStorage for token
		const token = localStorage.getItem('token') || sessionStorage.getItem('token')
		const role = localStorage.getItem('role') || sessionStorage.getItem('role') || ''
		const name = localStorage.getItem('username') || sessionStorage.getItem('username') || ''
		const savedTheme = localStorage.getItem('theme') || ''
		setIsLoggedIn(!!token)
		setUserRole(role)
		setUsername(name || role.charAt(0).toUpperCase() + role.slice(1))
		setCurrentTheme(savedTheme)
	}, [pathname])

	function handleLogout() {
		// Clear both localStorage and sessionStorage
		localStorage.removeItem('token')
		localStorage.removeItem('role')
		localStorage.removeItem('username')
		sessionStorage.removeItem('token')
		sessionStorage.removeItem('role')
		sessionStorage.removeItem('username')
		router.push('/auth/login')
	}

	function handleThemeChange(theme: string) {
		localStorage.setItem('theme', theme)
		document.documentElement.setAttribute('data-theme', theme)
		setCurrentTheme(theme)
	}

	// Hide sidebar toggle buttons on landing page and login page
	const hideSidebarButtons = pathname === '/' || pathname === '/auth/login'

	return (
		<div className="navbar bg-base-200/60 backdrop-blur supports-[backdrop-filter]:bg-base-200/50 relative z-40">
			<div className="navbar-start gap-1">
				{!hideSidebarButtons && (
					<>
						<label htmlFor="app-drawer" className="btn btn-ghost btn-square lg:hidden" aria-label="open sidebar">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
						</label>
						{/* Desktop toggle for collapsing/expanding the sidebar */}
						<label
							htmlFor="app-drawer"
							className="btn btn-ghost btn-square hidden lg:inline-flex drawer-button"
							aria-label="toggle sidebar"
							title="Toggle sidebar"
						>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
								<path d="M3.75 5.25a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75zM3.75 12a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H4.5A.75.75 0 013.75 12zm0 6.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75z" />
							</svg>
						</label>
					</>
				)}
				<a className="btn btn-ghost text-xl" href="/">SDM & Hukum Kanwil Kemenag NTB</a>
			</div>
			<div className="navbar-center"></div>
			<div className="navbar-end gap-2">
				{isLoggedIn ? (
					<div className="dropdown dropdown-end relative z-50 hidden lg:flex">
						<div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
							<div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center ring-2 ring-primary/20">
								<span className="text-lg font-semibold">{username.charAt(0).toUpperCase()}</span>
							</div>
						</div>
						<ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[9999] w-64 shadow-xl border border-base-300 mt-2 p-2 relative">
							{/* Theme Section */}
							<li className="py-1">
								<details className="collapse collapse-arrow">
									<summary className="collapse-title min-h-0 py-2 px-3 text-sm font-medium hover:bg-base-200 rounded-lg">
										<div className="flex items-center gap-3">
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
											</svg>
											<span>Tema</span>
											{currentTheme && (
												<span className="badge badge-sm badge-primary ml-auto capitalize border-0">{currentTheme}</span>
											)}
										</div>
									</summary>
									<div className="collapse-content px-3 pb-3" key={currentTheme}>
										<label className="input input-sm mb-2">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-70">
												<path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 015.364 10.83l3.278 3.278a.75.75 0 11-1.06 1.06l-3.279-3.278A6.75 6.75 0 1110.5 3.75zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5z" clipRule="evenodd" />
											</svg>
											<input
												type="text"
												placeholder="Cari tema"
												value={themeQuery}
												onChange={(e) => setThemeQuery(e.target.value)}
												className="text-sm"
											/>
										</label>
										<div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
											{ALL_THEMES.filter(t => t.includes(themeQuery.toLowerCase())).map((t) => (
												<label 
													key={t} 
													className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
														currentTheme === t 
															? 'border-primary bg-primary/10' 
															: 'border-base-300 hover:bg-base-200'
													}`}
												>
													<span className="text-xs capitalize truncate flex-1">{t}</span>
													<input
														type="radio"
														name="theme-dropdown"
														className="theme-controller ml-2"
														value={t}
														defaultChecked={currentTheme === t}
														onClick={() => handleThemeChange(t)}
													/>
												</label>
											))}
										</div>
									</div>
								</details>
							</li>

							{/* Logout */}
							<li className="py-1 relative z-[9999]">
								<button
									onClick={handleLogout}
									className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-error hover:bg-error/10 transition-colors text-sm font-medium relative z-[9999]"
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
									</svg>
									<span>Logout</span>
								</button>
							</li>
						</ul>
					</div>
				) : pathname !== '/' && pathname !== '/auth/login' && (
					<a className="btn btn-primary shadow-lg shadow-primary/30" href="/auth/login">Login</a>
				)}

				{/* Theme Modal for advanced theme selection - kept as fallback */}
				<dialog id="theme_modal" className="modal">
					<div className="modal-box max-w-3xl">
						<h3 className="font-bold text-lg mb-3">Pilih Tema</h3>
						<label className="input mb-3">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 opacity-70">
								<path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 015.364 10.83l3.278 3.278a.75.75 0 11-1.06 1.06l-3.279-3.278A6.75 6.75 0 1110.5 3.75zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5z" clipRule="evenodd" />
							</svg>
							<input
								type="text"
								placeholder="Cari tema"
								value={themeQuery}
								onChange={(e) => setThemeQuery(e.target.value)}
							/>
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
							{ALL_THEMES.filter(t => t.includes(themeQuery.toLowerCase())).map((t) => (
								<label key={t} className="flex items-center justify-between p-2 rounded border border-base-300 hover:bg-base-200 cursor-pointer">
									<span className="capitalize">{t}</span>
									<input
										type="radio"
										name="theme"
										className="theme-controller"
										value={t}
										defaultChecked={currentTheme === t}
										onClick={() => handleThemeChange(t)}
									/>
								</label>
							))}
						</div>
						<div className="modal-action">
							<form method="dialog">
								<button className="btn">Tutup</button>
							</form>
						</div>
					</div>
				</dialog>
			</div>
		</div>
	)
}
