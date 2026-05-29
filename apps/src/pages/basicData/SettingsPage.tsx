function SettingsPage() {
  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>환경설정</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item'>기초자료</span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>환경설정</span>
        </nav>
      </div>
      <div className='page-toolbar'>
        <button className='btn-primary'>저장</button>
      </div>

      <div className='content-card'>
        <div className='form-grid'>
          <div className='form-field'>
            <label className='form-label'>ID</label>
            <input className='form-input' type='text' autoComplete='off' defaultValue='Goodwill' />
          </div>
          <div className='form-field'>
            <label className='form-label'>상호</label>
            <input className='form-input' type='text' autoComplete='off' defaultValue='Goodwill' />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표연락처</label>
            <input className='form-input' type='text' autoComplete='off' defaultValue='02-777-6341' />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표 담당자</label>
            <input className='form-input' type='text' autoComplete='off' defaultValue='02-777-6341' />
          </div>
          <div className='form-field'>
            <label className='form-label'>연락처(핸드폰)</label>
            <input className='form-input' type='text' autoComplete='off' defaultValue='010-4260-4857' />
          </div>
          <div className='form-field'>
            <label className='form-label'>담당자 이메일</label>
            <input className='form-input' type='text' autoComplete='off' defaultValue='010-4260-4857' />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
