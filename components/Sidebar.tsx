'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const role = localStorage.getItem('role') || sessionStorage.getItem('role') || ''
    setIsLoggedIn(!!token)
    setUserRole(role)
  }, [pathname])

  const inEmployees = pathname.startsWith('/employees')
  const inAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const inHeatmap = pathname === '/heatmap'

  return (
    <div className="drawer-side">
      <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
      <div className="is-drawer-close:w-14 is-drawer-open:w-72 bg-base-200 border-r border-base-300 flex flex-col items-start min-h-full">
        <div className="px-4 pt-4 pb-2 is-drawer-close:hidden">
          <div className="text-xs uppercase tracking-wide opacity-60">Navigation</div>
        </div>
        <ul className="menu w-full grow px-2 gap-1">
          {isLoggedIn ? (
            <>
              <li className="menu-title"><span className="is-drawer-close:hidden">Master Data</span></li>
              <li>
                <a
                  href="/employees"
                  aria-current={inEmployees ? 'page' : undefined}
                  className={`${inEmployees ? 'menu-active' : ''} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
                  data-tip="Data Pegawai"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    <path d="M2.25 20.1a8.25 8.25 0 0119.5 0 .9.9 0 01-.9.9H3.15a.9.9 0 01-.9-.9z" />
                  </svg>
                  <span className="is-drawer-close:hidden">Data Pegawai</span>
                </a>
              </li>
              <li>
                <a
                  href="/heatmap"
                  aria-current={inHeatmap ? 'page' : undefined}
                  className={`${inHeatmap ? 'menu-active' : ''} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
                  data-tip="Sebaran Pegawai"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span className="is-drawer-close:hidden">Sebaran Pegawai</span>
                </a>
              </li>

              {userRole === 'admin' && (
                <>
                  <li className="menu-title mt-2"><span className="is-drawer-close:hidden">Administration</span></li>
                  <li>
                    <a
                      href="/admin"
                      aria-current={inAdmin && pathname === '/admin' ? 'page' : undefined}
                      className={`${inAdmin && pathname === '/admin' ? 'menu-active' : ''} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
                      data-tip="Management User"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M8.25 4.5A2.25 2.25 0 0012 4.5a2.25 2.25 0 103.75 1.777A2.25 2.25 0 0012 4.5H8.25z" />
                        <path fillRule="evenodd" d="M3 8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25v8.5A2.25 2.25 0 0118.75 19H5.25A2.25 2.25 0 013 16.75v-8.5zm3.75 3a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H6.75z" clipRule="evenodd" />
                      </svg>
                      <span className="is-drawer-close:hidden">Management User</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="/admin/coordinates"
                      aria-current={inAdmin && pathname === '/admin/coordinates' ? 'page' : undefined}
                      className={`${inAdmin && pathname === '/admin/coordinates' ? 'menu-active' : ''} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
                      data-tip="Set Koordinat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      <span className="is-drawer-close:hidden">Set Koordinat</span>
                    </a>
                  </li>
                </>
              )}
            </>
          ) : (
            <>
              <li>
                <a
                  className={`${pathname === '/' ? 'menu-active' : ''} is-drawer-close:tooltip is-drawer-close:tooltip-right`}
                  data-tip="Home"
                  href="/"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M2.25 12l8.954-8.955a.75.75 0 011.06 0L21.218 12H19.5v7.5a1.5 1.5 0 01-1.5 1.5h-3.75v-6h-4.5v6H6A1.5 1.5 0 014.5 19.5V12H2.25z" />
                  </svg>
                  <span className="is-drawer-close:hidden">Home</span>
                </a>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}


