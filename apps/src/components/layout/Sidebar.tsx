import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const managerMenus = [
  {
    key: 'companyInfo',
    label: '회사정보',
    path: '/company-info',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
        <polyline points='9 22 9 12 15 12 15 22' />
      </svg>
    ),
    children: [],
  },
  {
    key: 'newsRegistration',
    label: '뉴스관리',
    path: '/news-registration',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <path d='M4 4h16v16H4z' /><path d='M8 8h8M8 12h8M8 16h4' />
      </svg>
    ),
    children: [],
  },
  {
    key: 'myPage',
    label: '마이페이지',
    path: '/my-page',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <circle cx='12' cy='8' r='4' />
        <path d='M4 20c0-4 3.6-7 8-7s8 3 8 7' />
      </svg>
    ),
    children: [],
  },
]

const superAdminMenus = [
  {
    key: 'basicData',
    label: '기초자료',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <rect x='3' y='3' width='7' height='7' /><rect x='14' y='3' width='7' height='7' />
        <rect x='3' y='14' width='7' height='7' /><rect x='14' y='14' width='7' height='7' />
      </svg>
    ),
    children: [
      { label: '업체 관리', path: '/company' },
      { label: '담당자 관리', path: '/basic-data/manager' },
      { label: '클라이언트 관리', path: '/basic-data/client' },
      { label: '뉴스매체', path: '/basic-data/media' },
    ],
  },
]

const menus = [
  {
    key: 'basicData',
    label: '기초자료',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <rect x='3' y='3' width='7' height='7' /><rect x='14' y='3' width='7' height='7' />
        <rect x='3' y='14' width='7' height='7' /><rect x='14' y='14' width='7' height='7' />
      </svg>
    ),
      children: [
      { label: '환경설정', path: '/basic-data/settings' },
      { label: '담당자 관리', path: '/basic-data/manager' },
      { label: '클라이언트 관리', path: '/basic-data/client' },
      { label: '뉴스매체', path: '/basic-data/media' },
    ],
  },
  {
    key: 'newsRegistration',
    label: '뉴스관리',
    path: '/news-registration',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <path d='M4 4h16v16H4z' /><path d='M8 8h8M8 12h8M8 16h4' />
      </svg>
    ),
    children: [],
  },
  {
    key: 'report',
    label: '리포트',
    path: '/report',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <path d='M4 20V10M8 20V4M12 20v-8M16 20V6M20 20v-4' />
      </svg>
    ),
    children: [],
  },
  {
    key: 'myPage',
    label: '마이페이지',
    path: '/my-page',
    icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <circle cx='12' cy='8' r='4' />
        <path d='M4 20c0-4 3.6-7 8-7s8 3 8 7' />
      </svg>
    ),
    children: [],
  },
]

function Sidebar() {
  const [openMenus, setOpenMenus] = useState<string[]>(['basicData'])
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const isSuperAdmin = user.user_type === 'super_admin'
  const isManager    = user.user_type === 'manager'

  const allMenus = isManager ? managerMenus : isSuperAdmin ? [...superAdminMenus, ...menus.filter(m => m.key !== 'basicData')] : menus

  const toggleMenu = (key: string, path?: string) => {
    if (path) {
      navigate(path)
      return
    }
    setOpenMenus(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  return (
    <aside className='layout-sidebar'>
      {allMenus.map(menu => (
        <div key={menu.key} className='sidebar-menu-group'>
          <div className='sidebar-menu-title' onClick={() => toggleMenu(menu.key, (menu as any).path)}>
            <span className='sidebar-menu-title-inner'>
              <span className='menu-icon'>{menu.icon}</span>
              {menu.label}
            </span>
            <svg
              width='14' height='14' viewBox='0 0 24 24' fill='none'
              stroke='currentColor' strokeWidth='2'
              style={{ transform: openMenus.includes(menu.key) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d='M6 9l6 6 6-6' />
            </svg>
          </div>
          {openMenus.includes(menu.key) && menu.children.length > 0 && (
            <ul className='sidebar-submenu'>
              {menu.children.map(child => (
                <li key={child.path}>
                  <NavLink
                    to={child.path}
                    className={({ isActive }) =>
                      'sidebar-submenu-item' + (isActive ? ' active' : '')
                    }
                  >
                    {child.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </aside>
  )
}

export default Sidebar
