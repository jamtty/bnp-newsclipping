import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const roleLabel =
    user.user_type === 'super_admin' ? '관리자' :
    user.user_type === 'manager'     ? '담당자' : '업체'

  const displayName =
    user.user_type === 'manager'
      ? `${user.name ?? user.user_id} (${roleLabel})`
      : user.company_name
        ? `${user.company_name} (${roleLabel})`
        : roleLabel

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    navigate('/')
  }

  return (
    <header className='layout-header'>
      <div className='header-logo'>
        <span className='header-logo-text'>NEWSCLIPPING</span>
        <span className='header-logo-badge'>뉴스클리핑</span>
      </div>
      <div className='header-user' onClick={() => setDropdownOpen(!dropdownOpen)}>
        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <circle cx='12' cy='8' r='4' />
          <path d='M4 20c0-4 3.6-7 8-7s8 3 8 7' />
        </svg>
        <span>{displayName}님</span>
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <path d='M6 9l6 6 6-6' />
        </svg>
        {dropdownOpen && (
          <div className='header-dropdown'>
            <a onClick={() => { setDropdownOpen(false); navigate('/my-page') }} style={{ cursor: 'pointer' }}>마이페이지</a>
            <a onClick={handleLogout} style={{ cursor: 'pointer' }}>로그아웃</a>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
