import { useState } from 'react'

function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false)

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
        <span>조병철 (관리자)님</span>
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
          <path d='M6 9l6 6 6-6' />
        </svg>
        {dropdownOpen && (
          <div className='header-dropdown'>
            <a href='#'>마이페이지</a>
            <a href='#'>로그아웃</a>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
