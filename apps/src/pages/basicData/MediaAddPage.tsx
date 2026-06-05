import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Modal from '../../components/common/Modal'

interface JournalistItem {
  id: number
  name: string
  tel: string
  email: string
  memo: string
}

function MediaAddPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const editId    = (location.state as { id?: number } | null)?.id ?? null
  const user      = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [form, setForm] = useState({
    media_code: '',
    media_name: '',
    region:     '',
    tel:        '',
    address:    '',
  })
  const [journalists, setJournalists]             = useState<JournalistItem[]>([])
  const [showModal, setShowModal]                 = useState(false)
  const [editingJournalist, setEditingJournalist] = useState<JournalistItem | null>(null)
  const [modalForm, setModalForm]                 = useState({ name: '', tel: '', email: '', memo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!editId) return
    fetch(`/api/media.php?company_id=${encodeURIComponent(user.company_id)}&id=${editId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const d = res.data
          setForm({
            media_code: d.media_code ?? '',
            media_name: d.media_name ?? '',
            region:     d.region     ?? '',
            tel:        d.tel        ?? '',
            address:    d.address    ?? '',
          })
          setJournalists((d.journalists ?? []).map((j: JournalistItem) => ({
            id: j.id, name: j.name, tel: j.tel, email: j.email, memo: j.memo,
          })))
        }
      })
  }, [editId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setModalForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAddJournalist = () => {
    setEditingJournalist(null)
    setModalForm({ name: '', tel: '', email: '', memo: '' })
    setShowModal(true)
  }

  const handleEditJournalist = (item: JournalistItem) => {
    setEditingJournalist(item)
    setModalForm({ name: item.name, tel: item.tel, email: item.email, memo: item.memo })
    setShowModal(true)
  }

  const handleSaveJournalist = () => {
    if (!modalForm.name.trim()) return
    if (editingJournalist) {
      setJournalists(prev => prev.map(j => j.id === editingJournalist.id ? { ...j, ...modalForm } : j))
    } else {
      setJournalists(prev => [...prev, { id: Date.now(), ...modalForm }])
    }
    setShowModal(false)
    setEditingJournalist(null)
  }

  const handleDeleteJournalist = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    setJournalists(prev => prev.filter(j => j.id !== id))
  }

  const handleSave = async () => {
    if (!form.media_name.trim()) { setError('매체명을 입력하세요'); return }
    setSaving(true); setError('')
    try {
      const body = {
        company_id: user.company_id,
        ...form,
        journalists: journalists.map(j => ({ name: j.name, tel: j.tel, email: j.email, memo: j.memo })),
        ...(editId ? { id: editId } : {}),
      }
      const res  = await fetch('/api/media.php', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) navigate('/basic-data/media')
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
        <h2 className='page-title'>뉴스매체</h2>
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
          <span className='breadcrumb-item' onClick={() => navigate('/basic-data/media')} style={{ cursor: 'pointer' }}>뉴스매체</span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>{editId ? '수정' : '신규등록'}</span>
        </nav>
      </div>

      <div className='page-toolbar'>
        <button className='btn-secondary' type='button' onClick={() => navigate('/basic-data/media')}>목록</button>
        <button className='btn-primary' type='button' onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
      {error && <p style={{ textAlign: 'right', color: '#e53e3e', fontSize: '1.3rem', margin: '0.4rem 0 0' }}>{error}</p>}

      <div className='content-card'>
        <div className='client-form'>

          {/* Row 1: 뉴스매체 ID | 매체명 */}
          <div className='cf-row cf-row-2col'>
            <div className='cf-field'>
              <label className='cf-label'>뉴스매체 ID *</label>
              <input className='cf-input' name='media_code' value={form.media_code || '자동생성'} readOnly autoComplete='off' />
            </div>
            <div className='cf-field'>
              <label className='cf-label'>매체명 *</label>
              <input className='cf-input' name='media_name' value={form.media_name} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 2: 지역 | 대표전화 */}
          <div className='cf-row cf-row-2col'>
            <div className='cf-field'>
              <label className='cf-label'>지역</label>
              <input className='cf-input' name='region' value={form.region} onChange={handleChange} autoComplete='off' />
            </div>
            <div className='cf-field'>
              <label className='cf-label'>대표전화</label>
              <input className='cf-input' name='tel' value={form.tel} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 3: 주소 */}
          <div className='cf-row'>
            <div className='cf-field'>
              <label className='cf-label'>주소</label>
              <input className='cf-input' name='address' value={form.address} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 4: 소속기자 */}
          <div className='cf-row cf-row-category'>
            <div className='cf-category-left'>
              <span className='cf-label'>소속기자</span>
              <button className='btn-dark' type='button' onClick={handleAddJournalist}>추가</button>
            </div>
            <div className='cf-journalist-list'>
              {journalists.map(item => (
                <div key={item.id} className='cf-journalist-row'>
                  <span className='cf-journalist-name'>{item.name}</span>
                  <span className='cf-journalist-tel'>{item.tel}</span>
                  <span className='cf-journalist-email'>{item.email}</span>
                  <div className='table-actions'>
                    <button className='btn-icon' type='button' title='편집' onClick={() => handleEditJournalist(item)}>
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    <button className='btn-icon' type='button' title='삭제' onClick={() => handleDeleteJournalist(item.id)}>
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <polyline points='3 6 5 6 21 6' />
                        <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                        <path d='M10 11v6M14 11v6' />
                        <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {showModal && (
        <Modal
          title={editingJournalist ? '소속기자 수정' : '소속기자 추가'}
          onClose={() => setShowModal(false)}
        >
          <div className='modal-form'>
            <div className='modal-field'>
              <span className='modal-label'>기자명 *</span>
              <input
                className='modal-input'
                type='text'
                name='name'
                value={modalForm.name}
                onChange={handleModalChange}
                autoFocus
                autoComplete='off'
              />
            </div>
            <div className='modal-field'>
              <span className='modal-label'>연락처</span>
              <input
                className='modal-input'
                type='text'
                name='tel'
                value={modalForm.tel}
                onChange={handleModalChange}
                autoComplete='off'
              />
            </div>
            <div className='modal-field'>
              <span className='modal-label'>메일주소</span>
              <input
                className='modal-input'
                type='text'
                name='email'
                value={modalForm.email}
                onChange={handleModalChange}
                autoComplete='off'
              />
            </div>
            <div className='modal-field'>
              <span className='modal-label'>비고</span>
              <textarea
                className='modal-input'
                name='memo'
                value={modalForm.memo}
                onChange={handleModalChange}
                rows={4}
                style={{ height: 'auto', padding: '1rem 1.6rem', resize: 'none' }}
              />
            </div>
            <div className='modal-footer'>
              <button className='btn-primary' type='button' onClick={handleSaveJournalist}>저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default MediaAddPage
