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
            return items.map((item, idx) => (
                `<div style="min-width:200px;${idx ? 'margin-top:12px;border-top:1px solid rgba(255,255,255,0.2);padding-top:12px;' : ''}">
                    <h3 style="font-weight:600; margin:0;">${item.location}</h3>
                    <p style="margin:6px 0 0; font-size:14px;">Jumlah Pegawai: <strong>${item.count}</strong></p>
                    <p style="margin:4px 0 0; font-size:12px; opacity:0.7;">${item.induk_unit}</p>
                </div>`
            )).join('')
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
