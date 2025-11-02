"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
import { toast } from '@/components/Toaster'
import type { HeatmapData } from '@/lib/types'
import Map from './Map'

export default function HeatmapPage() {
    const [type, setType] = useState<'kabupaten' | 'kanwil'>('kabupaten')
    const [includeInactive, setIncludeInactive] = useState(false)
    const [data, setData] = useState<HeatmapData[]>([])
    const [loading, setLoading] = useState(false)
    const [lastFetch, setLastFetch] = useState<number | null>(null)
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [shouldRenderMap, setShouldRenderMap] = useState(false) // Track jika map sudah ready untuk di-render

    const CACHE_DURATION = 10 * 60 * 1000 // 10 menit dalam milliseconds

    useEffect(() => {
        void fetchData()

        refreshTimerRef.current = setInterval(() => {
            void fetchData()
        }, CACHE_DURATION)

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [includeInactive, type])

    async function fetchData(forceRefresh = false) {
        // Check cache first
        const cacheKey = `heatmap_${type}_${includeInactive}`
        const cached = sessionStorage.getItem(cacheKey)
        const cachedTime = sessionStorage.getItem(`${cacheKey}_time`)
        
        let snapshotShown = false

        if (!forceRefresh && cached && cachedTime) {
            const cachedData = JSON.parse(cached)
            setData(cachedData)
            setLastFetch(parseInt(cachedTime))
            snapshotShown = cachedData.length > 0
            setShouldRenderMap(snapshotShown)

            const timeDiff = Date.now() - parseInt(cachedTime)
            if (timeDiff < CACHE_DURATION) {
                return
            }
        }

        // Fetch fresh data sesuai tipe dan reset state
        if (!snapshotShown) {
            setShouldRenderMap(false)
        }
        setLoading(true)
        try {
            const response = await apiFetch<{success: boolean; data: HeatmapData[]}>(
                `/employees/heatmap?type=${type}&include_inactive=${includeInactive}`
            )

            const resultData = response.data ?? []

            setData(resultData)
            setLastFetch(Date.now())

            setShouldRenderMap(resultData.length > 0)

            sessionStorage.setItem(cacheKey, JSON.stringify(resultData))
            sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString())
        } catch (e: any) {
            console.error('Heatmap fetch error:', e)
            toast('Gagal memuat data heatmap', 'error')
            setShouldRenderMap(false)
        } finally {
            setLoading(false)
        }
    }

    function handleRefresh() {
        const cacheKey = `heatmap_${type}_${includeInactive}`
        sessionStorage.removeItem(cacheKey)
        sessionStorage.removeItem(`${cacheKey}_time`)
        void fetchData(true)
    }

    // Get max count for scaling
    const maxCount = Math.max(...data.map(d => d.count), 1)

    // Memoize marker calculation functions
    const getMarkerColor = useMemo(() => {
        return (count: number): string => {
            if (count === 0) return '#gray'
            const ratio = count / maxCount
            if (ratio < 0.25) return '#22c55e' // green
            if (ratio < 0.5) return '#eab308' // yellow
            if (ratio < 0.75) return '#f97316' // orange
            return '#ef4444' // red
        }
    }, [maxCount])

    const getMarkerRadius = useMemo(() => {
        return (count: number): number => {
            if (count === 0) return 5
            return Math.max(8, Math.min(30, 8 + (count / maxCount) * 22))
        }
    }, [maxCount])

    // Memoize map markers to prevent unnecessary re-renders
    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-semibold">Sebaran Pegawai</h1>
                <div className="flex flex-wrap gap-2">
                    <div className="join">
                        <button
                            className={`btn join-item btn-sm ${type === 'kabupaten' ? 'btn-primary' : ''}`}
                            onClick={() => setType('kabupaten')}
                        >
                            Kabupaten/Kota
                        </button>
                        <button
                            className={`btn join-item btn-sm ${type === 'kanwil' ? 'btn-primary' : ''}`}
                            onClick={() => setType('kanwil')}
                        >
                            Kanwil
                        </button>
                    </div>
                    <button
                        className="btn btn-sm"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        Refresh Data
                    </button>
                    <label className="label cursor-pointer gap-2">
                        <input
                            type="checkbox"
                            checked={includeInactive}
                            onChange={(e) => setIncludeInactive(e.target.checked)}
                            className="checkbox checkbox-sm"
                        />
                        <span className="label-text text-sm">Include Pensiun</span>
                    </label>
                    {lastFetch && (
                        <span className="text-xs opacity-60 self-center">
                            Terakhir update: {new Date(lastFetch).toLocaleTimeString('id-ID')}
                        </span>
                    )}
                </div>
            </div>

            <div className="card bg-base-200/40">
                <div className="card-body p-4">
                    {loading && data.length === 0 ? (
                        <div className="skeleton h-96 w-full" />
                    ) : data.length === 0 ? (
                        <div className="alert alert-warning">
                            <span>Tidak ada data koordinat. Silakan set koordinat di halaman admin.</span>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap gap-4 items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                    <span>Sedikit (&lt;25%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                                    <span>Sedang (25-50%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                                    <span>Banyak (50-75%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                    <span>Sangat Banyak (&gt;75%)</span>
                                </div>
                            </div>
                            <div className="relative" style={{ height: '600px', width: '100%', minHeight: '400px' }}>
                                {/* Render Map once when we have data, then never unmount it */}
                                {shouldRenderMap && data.length > 0 && (
                                    <Map
                                        data={data}
                                        getMarkerColor={getMarkerColor}
                                        getMarkerRadius={getMarkerRadius}
                                        selectedType={type}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Summary table */}
            {data.length > 0 && (
                <div className="card bg-base-200/40 mt-4">
                    <div className="card-body">
                        <h2 className="card-title text-lg mb-4">Ringkasan</h2>
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Wilayah</th>
                                        <th>Jumlah Pegawai</th>
                                        <th>Latitude</th>
                                        <th>Longitude</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.location}</td>
                                            <td><strong>{item.count}</strong></td>
                                            <td className="text-xs">{item.latitude}</td>
                                            <td className="text-xs">{item.longitude}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
