import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { JobSettingsPage } from '@/pages/JobSettingsPage'
import { UploadPage } from '@/pages/UploadPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/job/:jobId" element={<JobSettingsPage />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App
