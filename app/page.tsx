'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  function handleLoginClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    if (isLoggedIn) {
      router.push('/employees')
    } else {
      router.push('/auth/login')
    }
  }

  function handleViewDataClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    if (!isLoggedIn) {
      router.push('/auth/login')
    } else {
      router.push('/employees')
    }
  }

  return (
    <section className="hero min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-base-100 to-base-200">
      <div className="hero-content text-center md:text-left flex-col md:flex-row gap-10">
        <div className="w-full md:w-1/2">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
            Portal Pegawai Internal
          </h1>
          <p className="mt-4 text-base-content/80">
            Platform manajemen data pegawai ASN terpercaya.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="#" onClick={handleLoginClick} className="btn btn-primary btn-lg shadow-xl shadow-primary/30">Login</a>
            <a href="#" onClick={handleViewDataClick} className="btn btn-ghost btn-lg shadow-md">Lihat Data</a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            <div className="stat bg-base-200 rounded-box p-4">
              <div className="stat-title">Akses</div>
              <div className="stat-value text-primary text-2xl">24/7</div>
              <div className="stat-desc">Tersedia kapan saja</div>
            </div>
            <div className="stat bg-base-200 rounded-box p-4">
              <div className="stat-title">Kecepatan</div>
              <div className="stat-value text-2xl">Instan</div>
              <div className="stat-desc">Cari &amp; navigasi mudah</div>
            </div>
            <div className="stat bg-base-200 rounded-box p-4">
              <div className="stat-title">Keamanan</div>
              <div className="stat-value text-2xl">Aman</div>
              <div className="stat-desc">Proteksi data sensitif</div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <div className="mockup-browser border bg-base-300/30">
            <div className="mockup-browser-toolbar">
              <div className="input">/employees?search=andi</div>
            </div>
            <div className="bg-base-100 p-6">
              <div className="skeleton h-6 w-1/2 mb-3"></div>
              <div className="skeleton h-4 w-full mb-2"></div>
              <div className="skeleton h-4 w-5/6 mb-2"></div>
              <div className="skeleton h-4 w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
