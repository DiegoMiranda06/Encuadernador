import { Dropzone } from '@/components/upload/Dropzone'

export function UploadPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[22px] font-semibold text-text">Encuadernador</h1>
        <p className="mt-1 text-[13px] text-text-muted">PDF → EPUB, 100% en el navegador.</p>
      </div>
      <Dropzone />
    </main>
  )
}
