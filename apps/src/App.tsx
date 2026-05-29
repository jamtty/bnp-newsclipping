import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import SettingsPage from './pages/basicData/SettingsPage'
import ManagerPage from './pages/basicData/ManagerPage'
import ClientPage from './pages/basicData/ClientPage'
import ClientAddPage from './pages/basicData/ClientAddPage'
import MediaPage from './pages/basicData/MediaPage'
import MediaAddPage from './pages/basicData/MediaAddPage'
import NewsRegistrationPage from './pages/newsRegistration'
import ReportPage from './pages/report'
import './assets/css/style.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element={<Navigate to='/basic-data/settings' replace />} />
          <Route path='basic-data/settings' element={<SettingsPage />} />
          <Route path='basic-data/manager' element={<ManagerPage />} />
          <Route path='basic-data/client' element={<ClientPage />} />
          <Route path='basic-data/client/new' element={<ClientAddPage />} />
          <Route path='basic-data/media' element={<MediaPage />} />
          <Route path='basic-data/media/new' element={<MediaAddPage />} />
          <Route path='news-registration' element={<NewsRegistrationPage />} />
          <Route path='report' element={<ReportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
