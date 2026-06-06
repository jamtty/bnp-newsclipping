import { useEffect, useState } from 'react'

interface SettingsForm {
  company_id:    string
  user_id:       string
  user_type:     string
  company_name:  string
  main_contact:  string
  main_manager:  string
  mobile:        string
  manager_email: string
}

function CompanyInfoPage() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [form, setForm] = useState<SettingsForm>({
    company_id:    '',
    user_id:       '',
    user_type:     '',
    company_name:  '',
    main_contact:  '',
    main_manager:  '',
    mobile:        '',
    manager_email: '',
  })

  useEffect(() => {
    if (!user.company_id) return
    fetch(`/api/settings.php?company_id=${encodeURIComponent(user.company_id)}`)
      .then(r => r.json())
      .then(res => { if (res.success) setForm(res.data) })
  }, [])

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>업체 정보</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>업체 정보</span>
        </nav>
      </div>

      <div className='content-card'>
        <div className='form-grid'>
          <div className='form-field'>
            <label className='form-label'>회사 ID</label>
            <input className='form-input' type='text' value={form.company_id} readOnly />
          </div>
          <div className='form-field'>
            <label className='form-label'>상호</label>
            <input className='form-input' type='text' value={form.company_name} readOnly />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표연락처</label>
            <input className='form-input' type='text' value={form.main_contact} readOnly />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표 담당자</label>
            <input className='form-input' type='text' value={form.main_manager} readOnly />
          </div>
          <div className='form-field'>
            <label className='form-label'>연락처(핸드폰)</label>
            <input className='form-input' type='text' value={form.mobile} readOnly />
          </div>
          <div className='form-field'>
            <label className='form-label'>담당자 이메일</label>
            <input className='form-input' type='text' value={form.manager_email} readOnly />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyInfoPage
