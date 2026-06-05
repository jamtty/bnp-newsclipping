import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()
  const [companyId, setCompanyId] = useState('')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!companyId.trim() || !userId.trim() || !password.trim()) {
      setError('회사아이디, 사용자아이디, 비밀번호를 모두 입력하세요')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId.trim(),
          user_id:    userId.trim(),
          password:   password.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem('user', JSON.stringify(data.user))
        navigate('/basic-data/settings')
      } else {
        setError(data.message || '로그인에 실패했습니다')
      }
    } catch {
      setError('서버에 연결할 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-Wrap'>
      <div className='login-box'>
        <h1 className='login-title'>Login</h1>
        <form onSubmit={handleLogin} autoComplete='off'>
          <div className='login-field'>
            <label htmlFor='login-company-id'>회사 ID</label>
            <input
              id='login-company-id'
              type='text'
              placeholder='회사아이디를 입력하세요'
              autoComplete='off'
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
            />
          </div>
          <div className='login-field'>
            <label htmlFor='login-user-id'>사용자 ID</label>
            <input
              id='login-user-id'
              type='text'
              placeholder='사용자아이디를 입력하세요'
              autoComplete='off'
              value={userId}
              onChange={e => setUserId(e.target.value)}
            />
          </div>
          <div className='login-field'>
            <label htmlFor='login-pw'>비밀번호</label>
            <input
              id='login-pw'
              type='password'
              placeholder='비밀번호를 입력하세요'
              autoComplete='new-password'
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p style={{ color: '#e53e3e', fontSize: '13px', margin: '0 0 8px' }}>
              {error}
            </p>
          )}
          <button type='submit' className='login-btn' disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
