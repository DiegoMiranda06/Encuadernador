import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { JobSettingsPage } from '@/pages/JobSettingsPage'
import { LanguageReviewPage } from '@/pages/LanguageReviewPage'
import { UploadPage } from '@/pages/UploadPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/job/:jobId" element={<JobSettingsPage />} />
          <Route path="/job/:jobId/idioma" element={<LanguageReviewPage />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
