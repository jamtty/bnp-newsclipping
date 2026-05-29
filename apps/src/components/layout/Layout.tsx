import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

function Layout() {
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
