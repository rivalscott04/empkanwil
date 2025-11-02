'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Hide sidebar on landing page (/) and login page (/auth/login)
  const hideSidebar = pathname === '/' || pathname === '/auth/login'
  
  if (hideSidebar) {
    // Layout tanpa sidebar untuk landing page dan login
    return (
      <>
        <Navbar />
        <main className="px-4 py-4">{children}</main>
      </>
    )
  }
  
  // Layout dengan sidebar untuk halaman lainnya
  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        <Navbar />
        <main className="px-4 lg:pl-6 py-4">{children}</main>
      </div>
      <Sidebar />
    </div>
  )
}

