'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

type ToastItem = { id: number; message: string; type: ToastType }

let nextId = 1

export function toast(message: string, type: ToastType = 'info') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { id: nextId++, message, type } }))
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const { id, message, type } = (e as CustomEvent).detail as ToastItem
      setItems((prev) => [...prev, { id, message, type }])
      // auto dismiss after 3s
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000)
    }
    window.addEventListener('app:toast', onToast as EventListener)
    return () => window.removeEventListener('app:toast', onToast as EventListener)
  }, [])

  return (
    <div className="toast toast-end toast-top z-[60]">
      {items.map((t) => (
        <div key={t.id} className={`alert alert-${t.type} shadow`}> 
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}


