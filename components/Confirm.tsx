'use client'

import { useEffect, useRef, useState } from 'react'

type ConfirmDetail = {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  resolve: (v: boolean) => void
}

export function confirm(options: Omit<ConfirmDetail, 'resolve'> = {}) {
  if (typeof window === 'undefined') return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent('app:confirm', { detail: { ...options, resolve } }))
  })
}

export default function Confirm() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmDetail | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    function onConfirm(e: Event) {
      const detail = (e as CustomEvent).detail as ConfirmDetail
      setOpts(detail)
      setOpen(true)
      dialogRef.current?.showModal()
    }
    window.addEventListener('app:confirm', onConfirm as EventListener)
    return () => window.removeEventListener('app:confirm', onConfirm as EventListener)
  }, [])

  function close(result: boolean) {
    opts?.resolve(result)
    setOpen(false)
    dialogRef.current?.close()
  }

  return (
    <dialog ref={dialogRef} id="confirm_modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{opts?.title || 'Konfirmasi'}</h3>
        <p className="py-3">{opts?.message || 'Apakah Anda yakin?'}</p>
        <div className="modal-action">
          <button className="btn" onClick={() => close(false)}>{opts?.cancelText || 'Batal'}</button>
          <button className="btn btn-error" onClick={() => close(true)}>{opts?.confirmText || 'Hapus'}</button>
        </div>
      </div>
    </dialog>
  )
}


