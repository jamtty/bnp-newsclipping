import { useState } from 'react'

function MyPage() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [pwForm, setPwForm] = useState({
    currentPw: '',
    newPw: '',
    confirmPw: '',
  })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setPwError('')
    setPwSuccess('')
  }

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (!pwForm.currentPw || !pwForm.newPw || !pwForm.confirmPw) {
      setPwError('모든 항목을 입력하세요')
      return
    }
    if (pwForm.newPw.length < 4) {
      setPwError('새 비밀번호는 4자 이상이어야 합니다')
      return
    }
    if (pwForm.newPw !== pwForm.confirmPw) {
      setPwError('새 비밀번호가 일치하지 않습니다')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/change-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:  user.company_id,
          user_id:     user.user_id,
          user_type:   user.user_type,
          current_pw:  pwForm.currentPw,
          new_pw:      pwForm.newPw,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPwSuccess('비밀번호가 변경되었습니다')
        setPwForm({ currentPw: '', newPw: '', confirmPw: '' })
      } else {
        setPwError(data.message || '비밀번호 변경에 실패했습니다')
      }
    } catch {
      setPwError('서버에 연결할 수 없습니다')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>마이페이지</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>마이페이지</span>
        </nav>
      </div>

      {/* 비밀번호 변경 */}
      <div className='content-card'>
        <div className='content-card-title'>비밀번호 변경</div>
        <form onSubmit={handlePwSubmit}>
          <div className='form-grid'>
            <div className='form-field'>
              <label className='form-label'>현재 비밀번호</label>
              <input
                className='form-input'
                type='password'
                name='currentPw'
                placeholder='현재 비밀번호 입력'
                autoComplete='current-password'
                value={pwForm.currentPw}
                onChange={handlePwChange}
              />
            </div>
            <div className='form-field' />
            <div className='form-field'>
              <label className='form-label'>새 비밀번호</label>
              <input
                className='form-input'
                type='password'
                name='newPw'
                placeholder='새 비밀번호 입력 (4자 이상)'
                autoComplete='new-password'
                value={pwForm.newPw}
                onChange={handlePwChange}
              />
            </div>
            <div className='form-field'>
              <label className='form-label'>새 비밀번호 확인</label>
              <input
                className='form-input'
                type='password'
                name='confirmPw'
                placeholder='새 비밀번호 재입력'
                autoComplete='new-password'
                value={pwForm.confirmPw}
                onChange={handlePwChange}
              />
            </div>
          </div>
          {pwError && (
            <p style={{ color: '#e53e3e', fontSize: '13px', margin: '8px 0 0' }}>{pwError}</p>
          )}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type='submit' className='btn-primary' disabled={pwLoading}>
              {pwLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
          {pwSuccess && (
            <p style={{ color: '#38a169', fontSize: '13px', margin: '8px 0 0', textAlign: 'right' }}>{pwSuccess}</p>
          )}
        </form>
      </div>
    </div>
  )
}

export default MyPage
