'use client'

import { useEffect, useRef, useState } from 'react'

type InfoDetail = {
  title?: string
  message: string
}

export function info(message: string, title?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('app:info', { detail: { message, title } as InfoDetail }))
}

export default function Info() {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<InfoDetail | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    function onInfo(e: Event) {
      const d = (e as CustomEvent).detail as InfoDetail
      setDetail(d)
      setOpen(true)
      dialogRef.current?.showModal()
    }
    window.addEventListener('app:info', onInfo as EventListener)
    return () => window.removeEventListener('app:info', onInfo as EventListener)
  }, [])

  function close() {
    setOpen(false)
    dialogRef.current?.close()
  }

  return (
    <dialog ref={dialogRef} id="info_modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{detail?.title || 'Berhasil'}</h3>
        <p className="py-3">{detail?.message}</p>
        <div className="modal-action">
          <button className="btn btn-primary" onClick={close}>OK</button>
        </div>
      </div>
    </dialog>
  )
}








