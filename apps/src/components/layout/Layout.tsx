import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

function Layout() {
  const navigate = useNavigate()

  useEffect(() => {
    const raw = sessionStorage.getItem('user')
    if (!raw) { navigate('/', { replace: true }); return }
    try {
      const user = JSON.parse(raw)
      if (!user?.user_id || !user?.company_id) { navigate('/', { replace: true }); return }
      // 서버에서 유저 유효성 검증
      fetch(`/api/login.php?validate=1&company_id=${encodeURIComponent(user.company_id)}&user_id=${encodeURIComponent(user.user_id)}`)
        .then(r => r.json())
        .then(res => {
          if (!res.success) {
            sessionStorage.removeItem('user')
            navigate('/', { replace: true })
          }
        })
        .catch(() => { /* 네트워크 오류 시 무시 */ })
    } catch {
      sessionStorage.removeItem('user')
      navigate('/', { replace: true })
    }
  }, [])

  return (
    <div className='layout'>
      <Header />
      <div className='layout-body'>
        <Sidebar />
        <main className='layout-content'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
