import { useCallback, useState, type ChangeEvent, type DragEvent } from 'react'
import { rpc } from '@/lib/rpc'

export function Dropzone() {
  const [status, setStatus] = useState('Arrastra un PDF aquí, o haz clic para elegir uno')

  const handleFile = useCallback(async (file: File) => {
    setStatus(`Extrayendo "${file.name}"…`)
    const buffer = await file.arrayBuffer()
    const result = await rpc.extract(buffer)
    console.log(result)
    setStatus(`"${file.name}": ${result.pageCount} páginas`)
  }, [])

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
      style={{
        display: 'block',
        border: '2px dashed var(--border-strong, #3A404A)',
        borderRadius: 8,
        padding: 48,
        textAlign: 'center',
        cursor: 'pointer',
      }}
    >
      <p>{status}</p>
      <input type="file" accept="application/pdf" onChange={onChange} style={{ display: 'none' }} />
    </label>
  )
}
