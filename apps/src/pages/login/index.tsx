import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()
  const [company, setCompany] = useState('TEXEVER')
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/basic-data/settings')
  }

  return (
    <div className='login-Wrap'>
      <div className='login-box'>
        <h1 className='login-title'>Login</h1>
        <form onSubmit={handleLogin} autoComplete='off'>
          <div className='login-field'>
            <label htmlFor='login-company'>회사 ID</label>
            <select
              id='login-company'
              value={company}
              onChange={e => setCompany(e.target.value)}
              disabled
            >
              <option value='TEXEVER'>TEXEVER +</option>
            </select>
          </div>
          <div className='login-field'>
            <label htmlFor='login-id'>사용자 ID</label>
            <input
              id='login-id'
              type='text'
              placeholder='아이디를 입력하세요'
              autoComplete='off'
              value={id}
              onChange={e => setId(e.target.value)}
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
          <button type='submit' className='login-btn'>로그인</button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
