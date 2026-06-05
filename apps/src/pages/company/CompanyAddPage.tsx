import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface FormState {
  company_id: string
  user_id: string
  password: string
  confirm_pw: string
  company_name: string
  main_contact: string
  main_manager: string
  mobile: string
  manager_email: string
}

function CompanyAddPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const editId    = (location.state as any)?.company_id ?? null
  const isEdit    = editId !== null

  const [form, setForm] = useState<FormState>({
    company_id:    '',
    user_id:       '',
    password:      '',
    confirm_pw:    '',
    company_name:  '',
    main_contact:  '',
    main_manager:  '',
    mobile:        '',
    manager_email: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (!isEdit) return
    fetch('/api/companies.php')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const row = res.data.find((d: any) => d.company_id === editId)
          if (row) {
            setForm({
              company_id:    row.company_id,
              user_id:       row.user_id,
              password:      '',
              confirm_pw:    '',
              company_name:  row.company_name  || '',
              main_contact:  row.main_contact  || '',
              main_manager:  row.main_manager  || '',
              mobile:        row.mobile        || '',
              manager_email: row.manager_email || '',
            })
          }
        }
      })
  }, [editId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSave = async () => {
    setError('')

    if (!form.company_name.trim()) {
      setError('상호는 필수입니다'); return
    }

    if (!isEdit) {
      if (!form.company_id.trim() || !form.user_id.trim()) {
        setError('회사 ID와 관리자 ID는 필수입니다'); return
      }
      if (!form.password) {
        setError('비밀번호는 필수입니다'); return
      }
    }

    if (form.password) {
      if (form.password.length < 4) {
        setError('비밀번호는 4자 이상이어야 합니다'); return
      }
      if (form.password !== form.confirm_pw) {
        setError('비밀번호가 일치하지 않습니다'); return
      }
    }

    setLoading(true)
    try {
      let res: Response
      if (isEdit) {
        res = await fetch('/api/companies.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id:    editId,
            company_name:  form.company_name,
            main_contact:  form.main_contact,
            main_manager:  form.main_manager,
            mobile:        form.mobile,
            manager_email: form.manager_email,
            new_password:  form.password,
          }),
        })
      } else {
        res = await fetch('/api/companies.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id:    form.company_id,
            user_id:       form.user_id,
            password:      form.password,
            company_name:  form.company_name,
            main_contact:  form.main_contact,
            main_manager:  form.main_manager,
            mobile:        form.mobile,
            manager_email: form.manager_email,
          }),
        })
      }

      const json = await res.json()
      if (json.success) {
        navigate('/company')
      } else {
        setError(json.message || '저장에 실패했습니다')
      }
    } catch {
      setError('서버에 연결할 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>{isEdit ? '업체 수정' : '업체 등록'}</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item' style={{ cursor: 'pointer' }} onClick={() => navigate('/company')}>
            업체 관리
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>{isEdit ? '수정' : '등록'}</span>
        </nav>
      </div>

      <div className='content-card'>
        <div className='content-card-title'>업체 기본 정보</div>
        <div className='form-grid'>
          <div className='form-field'>
            <label className='form-label'>회사 ID <span style={{ color: '#e53e3e' }}>*</span></label>
            <input
              className='form-input'
              name='company_id'
              placeholder='회사 ID 입력'
              value={form.company_id}
              onChange={handleChange}
              disabled={isEdit}
              style={isEdit ? { background: '#f5f5f5' } : {}}
            />
          </div>
          <div className='form-field'>
            <label className='form-label'>상호 <span style={{ color: '#e53e3e' }}>*</span></label>
            <input
              className='form-input'
              name='company_name'
              placeholder='상호 입력'
              value={form.company_name}
              onChange={handleChange}
            />
          </div>
          <div className='form-field'>
            <label className='form-label'>관리자 ID <span style={{ color: '#e53e3e' }}>*</span></label>
            <input
              className='form-input'
              name='user_id'
              placeholder='관리자 ID 입력'
              value={form.user_id}
              onChange={handleChange}
              disabled={isEdit}
              style={isEdit ? { background: '#f5f5f5' } : {}}
            />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표 담당자</label>
            <input
              className='form-input'
              name='main_manager'
              placeholder='대표 담당자 입력'
              value={form.main_manager}
              onChange={handleChange}
            />
          </div>
          <div className='form-field'>
            <label className='form-label'>대표연락처</label>
            <input
              className='form-input'
              name='main_contact'
              placeholder='대표연락처 입력'
              value={form.main_contact}
              onChange={handleChange}
            />
          </div>
          <div className='form-field'>
            <label className='form-label'>연락처(핸드폰)</label>
            <input
              className='form-input'
              name='mobile'
              placeholder='핸드폰 번호 입력'
              value={form.mobile}
              onChange={handleChange}
            />
          </div>
          <div className='form-field'>
            <label className='form-label'>담당자 이메일</label>
            <input
              className='form-input'
              name='manager_email'
              placeholder='이메일 입력'
              type='email'
              value={form.manager_email}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className='content-card' style={{ marginTop: '16px' }}>
        <div className='content-card-title'>{isEdit ? '비밀번호 변경 (선택)' : '관리자 비밀번호'}</div>
        <div className='form-grid'>
          <div className='form-field'>
            <label className='form-label'>
              비밀번호 {!isEdit && <span style={{ color: '#e53e3e' }}>*</span>}
            </label>
            <input
              className='form-input'
              type='password'
              name='password'
              placeholder={isEdit ? '변경 시에만 입력' : '비밀번호 입력 (4자 이상)'}
              autoComplete='new-password'
              value={form.password}
              onChange={handleChange}
            />
          </div>
          <div className='form-field'>
            <label className='form-label'>비밀번호 확인</label>
            <input
              className='form-input'
              type='password'
              name='confirm_pw'
              placeholder='비밀번호 재입력'
              autoComplete='new-password'
              value={form.confirm_pw}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: '#e53e3e', fontSize: '13px', margin: '8px 0' }}>{error}</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button className='btn-secondary' onClick={() => navigate('/company')}>취소</button>
        <button className='btn-primary' onClick={handleSave} disabled={loading}>
          {loading ? '저장 중...' : (isEdit ? '수정' : '등록')}
        </button>
      </div>
    </div>
  )
}

export default CompanyAddPage
