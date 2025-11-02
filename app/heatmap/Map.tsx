"use client"

import { useEffect, useRef, useState } from 'react'
import type { HeatmapData } from '@/lib/types'
import type { Map as LeafletMap, LayerGroup, LatLngBoundsLiteral } from 'leaflet'

interface MapProps {
    data: HeatmapData[]
    getMarkerColor: (count: number) => string
    getMarkerRadius: (count: number) => number
    selectedType: 'kabupaten' | 'kanwil'
}

const MAP_CENTER: [number, number] = [-8.5, 116.5]
const MAP_ZOOM = 8
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const MAP_BOUNDS: LatLngBoundsLiteral = [
    [-9.8, 115.3], // Southwest of Lombok
    [-7.4, 120.4], // Northeast of Sumbawa / Bima
]

function ensureLeafletStyles() {
    if (typeof window === 'undefined') return
    const href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
    }
}

function createPinSvg(color: string, size: number): string {
    const width = size
    const height = Math.round(size * 1.5)
    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${width}" height="${height}">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)" />
                </filter>
            </defs>
            <path fill="${color}" filter="url(#shadow)" d="M12 0C5.4 0 0 5.46 0 12.06c0 7.22 5.72 12.41 10.28 20.51a2 2 0 003.44 0C18.28 24.47 24 19.28 24 12.06 24 5.46 18.6 0 12 0z" />
            <circle cx="12" cy="12" r="5" fill="#fff" />
        </svg>
    `
}

// Helper function to create inline SVG icons (lucide-react style)
function createIconSvg(iconType: 'check-circle' | 'user-minus', size: number = 16, color: string = 'currentColor'): string {
    const iconPaths: Record<string, string> = {
        'check-circle': '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        'user-minus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="23" y1="11" x2="17" y2="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    }
    
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;">
            ${iconPaths[iconType]}
        </svg>
    `
}

export default function Map({ data, getMarkerColor, getMarkerRadius, selectedType }: MapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<LeafletMap | null>(null)
    const markersRef = useRef<LayerGroup | null>(null)
    const leafletRef = useRef<typeof import('leaflet') | null>(null)
    const [leafletReady, setLeafletReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        ensureLeafletStyles()

        import('leaflet').then((leaflet) => {
            if (cancelled) return
            leafletRef.current = leaflet
            setLeafletReady(true)
        })

        return () => {
            cancelled = true
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
                markersRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        if (!leafletReady || !leafletRef.current || !containerRef.current || mapRef.current) {
            return
        }

        const L = leafletRef.current
        const map = L.map(containerRef.current, {
            center: MAP_CENTER,
            zoom: MAP_ZOOM,
            scrollWheelZoom: true,
            maxBounds: MAP_BOUNDS,
            maxBoundsViscosity: 0.7,
        })

        L.tileLayer(TILE_URL, {
            attribution: TILE_ATTRIBUTION,
            maxZoom: 19,
        }).addTo(map)

        const group = L.layerGroup().addTo(map)

        mapRef.current = map
        markersRef.current = group

        map.fitBounds(MAP_BOUNDS, { padding: [20, 20] })
    }, [leafletReady])

    useEffect(() => {
        if (!leafletReady || !leafletRef.current || !markersRef.current) {
            return
        }

        const L = leafletRef.current
        const layerGroup = markersRef.current
        layerGroup.clearLayers()

        const aggregated: Record<string, { items: HeatmapData[]; marker: L.Marker }> = {}

        function buildIcon(items: HeatmapData[]) {
            const totalCount = items.reduce((sum, entry) => sum + (entry.count ?? 0), 0)
            const color = getMarkerColor(totalCount)
            const baseSize = getMarkerRadius(totalCount)
            const size = Math.max(14, Math.min(26, Math.round(16 + baseSize * 0.5)))
            return L.divIcon({
                className: 'heatmap-pin-icon',
                html: createPinSvg(color, size),
                iconSize: [size, Math.round(size * 1.5)],
                iconAnchor: [size / 2, Math.round(size * 1.5)],
                popupAnchor: [0, -Math.round(size * 0.9)],
            })
        }

        function buildPopup(items: HeatmapData[]) {
            return items.map((item, idx) => {
                const aktif = item.aktif ?? 0
                const pensiun = item.pensiun ?? 0
                const locationSlug = encodeURIComponent(item.induk_unit)
                const detailUrl = `/employees/location/${locationSlug}`
                
                // Use CSS classes that will apply theme colors via CSS variables
                return `<div class="heatmap-popup"${idx ? ' style="margin-top:0.75rem; padding-top:0.75rem;"' : ''}>
                    ${idx ? '<div class="heatmap-popup-divider"></div>' : ''}
                    <h3 class="heatmap-popup-title">${item.location}</h3>
                    <div class="heatmap-popup-stats">
                        <p class="heatmap-popup-total">
                            Total: <strong>${item.count.toLocaleString('id-ID')}</strong>
                        </p>
                        <div class="heatmap-popup-stats-row">
                            <div class="heatmap-popup-stat-item">
                                <span class="heatmap-popup-icon-aktif">${createIconSvg('check-circle', 16, 'currentColor')}</span>
                                <span class="heatmap-popup-stat-text">
                                    Aktif: <strong class="heatmap-popup-aktif">${aktif.toLocaleString('id-ID')}</strong>
                                </span>
                            </div>
                            <div class="heatmap-popup-stat-item">
                                <span class="heatmap-popup-icon-pensiun">${createIconSvg('user-minus', 16, 'currentColor')}</span>
                                <span class="heatmap-popup-stat-text">
                                    Pensiun: <strong class="heatmap-popup-pensiun">${pensiun.toLocaleString('id-ID')}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                    <p class="heatmap-popup-induk">${item.induk_unit}</p>
                    <a href="${detailUrl}" class="heatmap-popup-button">
                        Lihat Daftar Pegawai →
                    </a>
                </div>`
            }).join('')
        }

        data.forEach((item) => {
            const markerKey = `${item.latitude.toFixed(6)}_${item.longitude.toFixed(6)}`

            if (!aggregated[markerKey]) {
                const marker = L.marker([item.latitude, item.longitude], {
                    icon: buildIcon([item]),
                }).addTo(layerGroup)

                aggregated[markerKey] = {
                    items: [item],
                    marker,
                }
            } else {
                aggregated[markerKey].items.push(item)
            }
        })

        Object.values(aggregated).forEach(({ items, marker }) => {
            const icon = buildIcon(items)
            marker.setIcon(icon)
            marker.bindPopup(buildPopup(items))
        })

        if (mapRef.current && data.length > 0) {
            const bounds = L.latLngBounds(data.map(item => [item.latitude, item.longitude]))
            if (data.length > 1) {
                mapRef.current.fitBounds(bounds, { padding: [30, 30] })
            } else {
                const singleZoom = selectedType === 'kanwil' ? 9 : 10
                mapRef.current.setView([data[0].latitude, data[0].longitude], singleZoom)
            }
        }
    }, [leafletReady, data, getMarkerColor, getMarkerRadius, selectedType])

    return <div ref={containerRef} className="w-full h-full" />
}
