import { useEffect, useState } from 'react'

/** Crea una `blob:` URL para el Blob dado y la revoca al cambiar o desmontar. */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    // El patrón estándar de React para sincronizar con una API del navegador que no tiene su
    // propio store externo (crear el recurso, guardar el handle, liberarlo en el cleanup).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  // Sin blob no hay URL válida — se calcula en el render, nunca con un setState extra en el efecto.
  return blob ? url : undefined
}
