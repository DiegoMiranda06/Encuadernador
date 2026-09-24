import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CoverPage } from '@/pages/CoverPage'
import { ExportPage } from '@/pages/ExportPage'
import { JobSettingsPage } from '@/pages/JobSettingsPage'
import { LanguageReviewPage } from '@/pages/LanguageReviewPage'
import { UploadPage } from '@/pages/UploadPage'

const queryClient = new QueryClient()

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/job/:jobId" element={<JobSettingsPage />} />
            <Route path="/job/:jobId/idioma" element={<LanguageReviewPage />} />
            <Route path="/job/:jobId/portada" element={<CoverPage />} />
            <Route path="/job/:jobId/exportar" element={<ExportPage />} />
          </Routes>
        </HashRouter>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: 'bg-surface! border-border! text-text!',
              title: 'text-text!',
              description: 'text-text-muted!',
              error: 'border-destructive!',
              success: 'border-success!',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
