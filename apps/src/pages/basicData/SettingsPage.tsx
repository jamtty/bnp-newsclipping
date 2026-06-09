import { useEffect, useState } from 'react'

interface SettingsForm {
  company_id:         string
  user_id:            string
  user_type:          string
  company_name:       string
  main_contact:       string
  main_manager:       string
  mobile:             string
  manager_email:      string
  positive_keywords:  string
  negative_keywords:  string
}

function SettingsPage() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [form, setForm] = useState<SettingsForm>({
    company_id:         '',
    user_id:            '',
    user_type:          '',
    company_name:       '',
    main_contact:       '',
    main_manager:       '',
    mobile:             '',
    manager_email:      '',
    positive_keywords:  '',
    negative_keywords:  '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user.company_id || !user.user_id) return
    fetch(`/api/settings.php?company_id=${encodeURIComponent(user.company_id)}&user_id=${encodeURIComponent(user.user_id)}`)
      .then(r => r.json())
      .then(res => { if (res.success) setForm(res.data) })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setMessage({ type: data.success ? 'success' : 'error', text: data.message })
    } catch {
      setMessage({ type: 'error', text: '서버에 연결할 수 없습니다' })
    } finally {
      setSaving(false)
    }
  }

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
        <button className='btn-primary' onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
      {message && (
        <p style={{
          textAlign: 'right',
          fontSize: '1.3rem',
          margin: '0.8rem 0 0',
          color: message.type === 'success' ? '#38a169' : '#e53e3e',
        }}>
          {message.text}
        </p>
      )}

      <div className='content-card'>
        <div className='form-grid'>
          <div className='form-field'>
            <label className='form-label'>회사 ID</label>
            <input className='form-input' type='text' value={form.company_id} readOnly />
          </div>
          <div className='form-field'>
            <label className='form-label'>ID</label>
            <input className='form-input' type='text' value={form.user_id} readOnly />
          </div>
          <div className='form-field'>
            <label className='form-label'>상호</label>
            <input className='form-input' type='text' name='company_name' autoComplete='off'
              value={form.company_name} onChange={handleChange} />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표연락처</label>
            <input className='form-input' type='text' name='main_contact' autoComplete='off'
              value={form.main_contact} onChange={handleChange} />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표 담당자</label>
            <input className='form-input' type='text' name='main_manager' autoComplete='off'
              value={form.main_manager} onChange={handleChange} />
          </div>
          <div className='form-field'>
            <label className='form-label'>연락처(핸드폰)</label>
            <input className='form-input' type='text' name='mobile' autoComplete='off'
              value={form.mobile} onChange={handleChange} />
          </div>
          <div className='form-field'>
            <label className='form-label'>담당자 이메일</label>
            <input className='form-input' type='text' name='manager_email' autoComplete='off'
              value={form.manager_email} onChange={handleChange} />
          </div>
          <div className='form-field' style={{ gridColumn: '1 / -1' }}>
            <label className='form-label'>긍정 키워드<br />(쉼표로 구분)</label>
            <input className='form-input' type='text' name='positive_keywords' autoComplete='off'
              placeholder='예) 호실, 성장, 수상'
              value={form.positive_keywords} onChange={handleChange} />
          </div>
          <div className='form-field' style={{ gridColumn: '1 / -1' }}>
            <label className='form-label'>부정 키워드<br />(쉼표로 구분)</label>
            <input className='form-input' type='text' name='negative_keywords' autoComplete='off'
              placeholder='예) 실패, 부실, 사고'
              value={form.negative_keywords} onChange={handleChange} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
