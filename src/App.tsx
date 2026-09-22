import { Dropzone } from '@/components/upload/Dropzone'

function App() {
  return (
    <main style={{ maxWidth: 480, margin: '96px auto', padding: '0 16px' }}>
      <h1>Encuadernador</h1>
      <p>PDF → EPUB, 100% en el navegador.</p>
      <Dropzone />
    </main>
  )
}

export default App
