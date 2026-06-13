import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LoginPage from './pages/login'
import SettingsPage from './pages/basicData/SettingsPage'
import ManagerPage from './pages/basicData/ManagerPage'
import ClientPage from './pages/basicData/ClientPage'
import ClientAddPage from './pages/basicData/ClientAddPage'
import MediaPage from './pages/basicData/MediaPage'
import MediaAddPage from './pages/basicData/MediaAddPage'
import NewsRegistrationPage from './pages/newsRegistration'
import NewsAddPage from './pages/newsRegistration/NewsAddPage'
import ReportPage from './pages/report'
import MediaStatisticsPage from './pages/statistics/MediaStatisticsPage'
import MyPage from './pages/myPage'
import CompanyPage from './pages/company/CompanyPage'
import CompanyAddPage from './pages/company/CompanyAddPage'
import CompanyInfoPage from './pages/basicData/CompanyInfoPage'
import './assets/css/style.css'

function RequireAuth({ children }: { children: React.ReactNode }) {
  try {
    const raw = sessionStorage.getItem('user')
    if (!raw) return <Navigate to='/' replace />
    const user = JSON.parse(raw)
    if (!user?.user_id) return <Navigate to='/' replace />
  } catch {
    return <Navigate to='/' replace />
  }
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  if (user.user_type === 'manager') return <Navigate to='/news-registration' replace />
  return <>{children}</>
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  if (user.user_type !== 'super_admin') return <Navigate to='/news-registration' replace />
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path='company' element={<RequireSuperAdmin><CompanyPage /></RequireSuperAdmin>} />
          <Route path='company/new' element={<RequireSuperAdmin><CompanyAddPage /></RequireSuperAdmin>} />
          <Route path='company/edit' element={<RequireSuperAdmin><CompanyAddPage /></RequireSuperAdmin>} />
          <Route path='basic-data/settings' element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path='company-info' element={<RequireAuth><CompanyInfoPage /></RequireAuth>} />
          <Route path='basic-data/manager' element={<RequireAdmin><ManagerPage /></RequireAdmin>} />
          <Route path='basic-data/client' element={<RequireAdmin><ClientPage /></RequireAdmin>} />
          <Route path='basic-data/client/new' element={<RequireAdmin><ClientAddPage /></RequireAdmin>} />
          <Route path='basic-data/client/edit' element={<RequireAdmin><ClientAddPage /></RequireAdmin>} />
          <Route path='basic-data/media' element={<RequireAdmin><MediaPage /></RequireAdmin>} />
          <Route path='basic-data/media/new' element={<RequireAdmin><MediaAddPage /></RequireAdmin>} />
          <Route path='news-registration' element={<RequireAuth><NewsRegistrationPage /></RequireAuth>} />
          <Route path='news-registration/new' element={<RequireAuth><NewsAddPage /></RequireAuth>} />
          <Route path='news-registration/edit' element={<RequireAuth><NewsAddPage /></RequireAuth>} />
          <Route path='report' element={<RequireAuth><ReportPage /></RequireAuth>} />
          <Route path='statistics' element={<RequireAdmin><MediaStatisticsPage /></RequireAdmin>} />
          <Route path='my-page' element={<RequireAuth><MyPage /></RequireAuth>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
