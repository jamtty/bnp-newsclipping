import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface ClientOption { id: number; client_code: string; company_name: string }
interface MediaOption  { media_code: string; media_name: string }
interface JournalistOption { id: number; name: string }
interface CategoryOption { id: number; name: string }
interface CompanyOption { company_id: string; company_name: string }

const MEDIA_TYPE_OPTIONS = ['온라인', '지면', '통신사']

function NewsAddPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const editData   = location.state as { id: number; company_id?: string } | null
  const isEdit     = !!editData
  const fileInputRef = useRef<HTMLInputElement>(null)
  const user       = JSON.parse(sessionStorage.getItem('user') || '{}')
  const companyId  = user.company_id || ''

  const [clients,     setClients]     = useState<ClientOption[]>([])
  const [mediaList,   setMediaList]   = useState<MediaOption[]>([])
  const [journalists, setJournalists] = useState<JournalistOption[]>([])
  const [categories,  setCategories]  = useState<CategoryOption[]>([])
  const [companies,   setCompanies]   = useState<CompanyOption[]>([])

  // super_admin: 선택된 담당업체 (수정 시 editData.company_id 사용)
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    editData?.company_id || (user.user_type === 'super_admin' ? '' : companyId)
  )
  const activeCompanyId = user.user_type === 'super_admin' ? selectedCompanyId : companyId

  const [form, setForm] = useState({
    serial:       '',
    manager:      user.user_type === 'manager' ? (user.name || user.user_id || '') : (user.company_name || user.user_id || ''),
    reg_date:     '',
    reg_time:     '',
    client_id:    '',
    client_name:  '',
    media_code:   '',
    media_name:   '',
    journalist:   '',
    categories:   [] as string[],
    media_type:   '온라인',
    headline:     '',
    link:         '',
  })
  const [file,    setFile]    = useState<File | null>(null)
  const [existingFile, setExistingFile] = useState<{ name: string; path: string } | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (user.user_type === 'super_admin') {
      fetch('/api/companies.php')
        .then(r => r.json())
        .then(res => { if (res.success) setCompanies(res.data) })
    }
  }, [])

  useEffect(() => {
    if (!activeCompanyId) { setClients([]); setMediaList([]); return }
    fetch(`/api/clients.php?company_id=${encodeURIComponent(activeCompanyId)}`)
      .then(r => r.json()).then(res => { if (res.success) setClients(res.data) })
    fetch(`/api/media.php?company_id=${encodeURIComponent(activeCompanyId)}`)
      .then(r => r.json()).then(res => { if (res.success) setMediaList(res.data) })
    // 업체가 바뀌면 클라이언트/매체 초기화 (신규 등록일 때만)
    if (!isEdit) {
      setForm(prev => ({ ...prev, client_id: '', client_name: '', media_code: '', media_name: '', journalist: '', categories: [] }))
      setCategories([])
      setJournalists([])
    }
  }, [activeCompanyId])

  useEffect(() => {
    if (!form.media_code) { setJournalists([]); return }
    fetch(`/api/media.php?company_id=${encodeURIComponent(activeCompanyId)}&id=${encodeURIComponent(form.media_code)}&by_code=1`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.journalists) setJournalists(res.data.journalists)
        else setJournalists([])
      })
  }, [form.media_code])

  useEffect(() => {
    if (!form.client_id) { setCategories([]); return }
    fetch(`/api/clients.php?company_id=${encodeURIComponent(activeCompanyId)}&id=${form.client_id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.categories) setCategories(res.data.categories)
        else setCategories([])
      })
  }, [form.client_id])

  useEffect(() => {
    if (!isEdit || !editData.id) return
    const cid = editData.company_id || companyId
    fetch(`/api/news.php?company_id=${encodeURIComponent(cid)}&id=${editData.id}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success) return
        const d = res.data
        setForm({
          serial:      d.serial      || '',
          manager:     d.manager     || '',
          reg_date:    d.reg_date    || '',
          reg_time:    d.reg_time    || '',
          client_id:   d.client_id   ? String(d.client_id) : '',
          client_name: d.client_name || '',
          media_code:  d.media_code  || '',
          media_name:  d.media_name  || '',
          journalist:  d.journalist  || '',
          categories:  d.categories  ? d.categories.split(',') : [],
          media_type:  d.media_type  || '온라인',
          headline:    d.headline    || '',
          link:        d.link        || '',
        })
        if (d.file_name && d.file_path) {
          setExistingFile({ name: d.file_name, path: d.file_path })
        }
      })
  }, [])

  const handleCategoryToggle = (name: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(name)
        ? prev.categories.filter(c => c !== name)
        : [...prev.categories, name],
    }))
  }

  const handleMediaChange = (code: string) => {
    const m = mediaList.find(m => m.media_code === code)
    setForm(prev => ({ ...prev, media_code: code, media_name: m?.media_name || '', journalist: '' }))
    setJournalists([])
  }

  const handleClientChange = (id: string) => {
    const c = clients.find(c => String(c.id) === id)
    setForm(prev => ({ ...prev, client_id: id, client_name: c?.company_name || '' }))
    setCategories([])
  }

  const handleSave = async () => {
    if (user.user_type === 'super_admin' && !selectedCompanyId) { setError('담당업체를 선택하세요'); return }
    if (!form.client_id)       { setError('클라이언트를 선택하세요'); return }
    if (!form.media_code)      { setError('뉴스매체를 선택하세요'); return }
    if (!form.headline.trim()) { setError('기사 Head line을 입력하세요'); return }

    setSaving(true); setError('')
    try {
      const fd = new FormData()
      fd.append('company_id',  activeCompanyId)
      fd.append('manager',        form.manager)
      fd.append('manager_user_id', user.user_id || '')
      fd.append('reg_date',    form.reg_date)
      fd.append('reg_time',    form.reg_time)
      fd.append('client_id',   form.client_id)
      fd.append('client_name', form.client_name)
      fd.append('media_code',  form.media_code)
      fd.append('media_name',  form.media_name)
      fd.append('journalist',  form.journalist)
      fd.append('categories',  form.categories.join(','))
      fd.append('media_type',  form.media_type)
      fd.append('headline',    form.headline)
      fd.append('link',        form.link)
      if (file) fd.append('file', file)
      else if (existingFile) { fd.append('file_name_saved', existingFile.name); fd.append('file_path_saved', existingFile.path) }
      if (isEdit) fd.append('id', String(editData.id))

      const res  = await fetch('/api/news.php', { method: isEdit ? 'PUT' : 'POST', body: fd })
      const data = await res.json()
      if (data.success) navigate('/news-registration')
      else setError(data.message || '저장 실패')
    } catch {
      setError('서버에 연결할 수 없습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>뉴스등록</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item'>뉴스관리</span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>{isEdit ? '뉴스수정' : '뉴스등록'}</span>
        </nav>
      </div>

      <div className='page-toolbar'>
        <button className='btn-secondary' type='button' onClick={() => navigate('/news-registration')}>목록</button>
        <button className='btn-primary' type='button' onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
      {error && <p style={{ textAlign: 'right', color: '#e53e3e', fontSize: '1.3rem', margin: '0.4rem 0 0' }}>{error}</p>}

      <div className='content-card'>
        <div className='news-form'>

          {/* 담당업체 (super_admin만 표시) */}
          {user.user_type === 'super_admin' && (
            <div className='nf-row'>
              <div className='nf-field'>
                <span className='nf-label'>담당업체 <span style={{ color: '#e53e3e' }}>*</span></span>
                <select
                  className={`nf-select${!selectedCompanyId ? ' input-error' : ''}`}
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                >
                  <option value=''>선택하세요</option>
                  {companies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SERIAL */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>SERIAL</span>
              <input className='nf-input nf-input-readonly' value={form.serial || '자동생성'} readOnly />
            </div>
          </div>

          {/* 등록담당자 */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>등록 담당자</span>
              <input
                className='nf-input'
                value={form.manager}
                onChange={e => setForm(prev => ({ ...prev, manager: e.target.value }))}
              />
            </div>
          </div>

          {/* 등록일 */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>등록일</span>
              <div className='nf-date-group'>
                <input
                  type='date'
                  className='nf-input nf-input-date'
                  value={form.reg_date}
                  onChange={e => setForm(prev => ({ ...prev, reg_date: e.target.value }))}
                />
                <input
                  type='text'
                  className='nf-input nf-input-time'
                  value={form.reg_time}
                  onChange={e => setForm(prev => ({ ...prev, reg_time: e.target.value }))}
                  placeholder='HH:MM'
                />
              </div>
            </div>
          </div>

          {/* 클라이언트 */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>클라이언트</span>
              <select className='nf-select' value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
                <option value=''>선택하세요</option>
                {clients.map(c => <option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
              </select>
            </div>
          </div>

          {/* 뉴스매체 + 기자 */}
          <div className='nf-row'>
            <div className='nf-field nf-field-media'>
              <span className='nf-label'>뉴스매체</span>
              <select className='nf-select' value={form.media_code} onChange={e => handleMediaChange(e.target.value)}>
                <option value=''>선택하세요</option>
                {mediaList.map(m => <option key={m.media_code} value={m.media_code}>{m.media_name}</option>)}
              </select>
              <select
                className='nf-select nf-select-journalist'
                value={form.journalist}
                onChange={e => setForm(prev => ({ ...prev, journalist: e.target.value }))}
              >
                <option value=''>기자 선택</option>
                {journalists.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
              </select>
            </div>
          </div>

          {/* 기사분류 */}
          <div className='nf-row'>
            <div className='nf-field nf-field-align-start'>
              <span className='nf-label'>기사분류</span>
              <div className='filter-checkbox-group'>
                {categories.length === 0
                  ? <span style={{ color: '#aaa', fontSize: '1.3rem' }}>클라이언트를 선택하면 분류가 표시됩니다</span>
                  : categories.map(cat => (
                    <label key={cat.id} className='filter-checkbox-label'>
                      <input
                        type='checkbox'
                        className='filter-checkbox'
                        checked={form.categories.includes(cat.name)}
                        onChange={() => handleCategoryToggle(cat.name)}
                      />
                      {cat.name}
                    </label>
                  ))
                }
              </div>
            </div>
          </div>

          {/* 미디어 Type */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>미디어 Type</span>
              <select className='nf-select' value={form.media_type} onChange={e => setForm(prev => ({ ...prev, media_type: e.target.value }))}>
                {MEDIA_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* 기사 Headline */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>기사 Head line</span>
              <input
                className='nf-input'
                value={form.headline}
                onChange={e => setForm(prev => ({ ...prev, headline: e.target.value }))}
                placeholder='기사 제목을 입력하세요'
              />
            </div>
          </div>

          {/* 기사 Link */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>기사 Link</span>
              <input
                className='nf-input'
                value={form.link}
                onChange={e => setForm(prev => ({ ...prev, link: e.target.value }))}
                placeholder='https://'
              />
            </div>
          </div>

          {/* 관련 문서/이미지 */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>관련 문서/이미지</span>
              <div className='nf-file-group'>
                <input
                  ref={fileInputRef}
                  type='file'
                  style={{ display: 'none' }}
                  onChange={e => { setFile(e.target.files?.[0] || null); setExistingFile(null) }}
                  accept='image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip'
                />
                <button className='btn-dark' type='button' onClick={() => fileInputRef.current?.click()}>파일 업로드</button>
                {file
                  ? <span className='nf-file-name'>{file.name}</span>
                  : existingFile && (
                    <div style={{ marginTop: '0.8rem' }}>
                      {/\.(jpg|jpeg|png|gif|webp)$/i.test(existingFile.name) && (
                        <img
                          src={existingFile.path}
                          alt={existingFile.name}
                          style={{ display: 'block', width: '450px', maxWidth: '100%', borderRadius: '4px' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
                        <span className='nf-file-name'>{existingFile.name}</span>
                        <button type='button' style={{ fontSize: '1.1rem', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setExistingFile(null)}>✕</button>
                      </div>
                    </div>
                  )
                }
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default NewsAddPage
