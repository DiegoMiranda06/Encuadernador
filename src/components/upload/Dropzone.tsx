import { useCallback, useEffect, useState, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExtractionProgress } from '@/components/upload/ExtractionProgress'
import { rpc } from '@/lib/rpc'

export function Dropzone() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [status, setStatus] = useState('Arrastra un PDF aquí, o hacé clic para elegir uno')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => rpc.onExtractionProgress((current, total) => setProgress({ current, total })), [])

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setStatus(`Extrayendo "${file.name}"…`)
      try {
        const buffer = await file.arrayBuffer()
        const result = await rpc.extract(buffer, file.name)
        navigate(`/job/${result.jobId}`)
      } catch (cause) {
        setProgress(null)
        setStatus('Arrastra un PDF aquí, o hacé clic para elegir uno')
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    },
    [navigate],
  )

  const onDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file) void handleFile(file)
    },
    [handleFile],
  )

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) void handleFile(file)
    },
    [handleFile],
  )

  return (
    <label
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      className="block cursor-pointer rounded-lg border-2 border-dashed border-border-strong p-12 text-center transition-surface hover:border-primary"
    >
      {progress ? <ExtractionProgress current={progress.current} total={progress.total} /> : <p>{status}</p>}
      {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
      <input type="file" accept="application/pdf" onChange={onChange} className="hidden" />
    </label>
  )
}
