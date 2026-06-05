import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Modal from '../../components/common/Modal'

interface CategoryItem {
  id: number
  name: string
}

function ClientAddPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const editId    = (location.state as { id?: number } | null)?.id ?? null
  const user      = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [form, setForm] = useState({
    client_code:   '',
    company_name:  '',
    biz_no:        '',
    tel:           '',
    manager_name:  '',
    manager_tel:   '',
    manager_email: '',
    ceo:           '',
    address:       '',
    memo:          '',
  })
  const [categories, setCategories]           = useState<CategoryItem[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // 수정 모드 – 기존 데이터 로드
  useEffect(() => {
    if (!editId) return
    fetch(`/api/clients.php?company_id=${encodeURIComponent(user.company_id)}&id=${editId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const d = res.data
          setForm({
            client_code:   d.client_code   ?? '',
            company_name:  d.company_name  ?? '',
            biz_no:        d.biz_no        ?? '',
            tel:           d.tel           ?? '',
            manager_name:  d.manager_name  ?? '',
            manager_tel:   d.manager_tel   ?? '',
            manager_email: d.manager_email ?? '',
            ceo:           d.ceo           ?? '',
            address:       d.address       ?? '',
            memo:          d.memo          ?? '',
          })
          setCategories((d.categories ?? []).map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })))
        }
      })
  }, [editId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAddCategory = () => { setEditingCategory(null); setNewCategoryName(''); setShowCategoryModal(true) }
  const handleEditCategory = (item: CategoryItem) => { setEditingCategory(item); setNewCategoryName(item.name); setShowCategoryModal(true) }

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) return
    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: newCategoryName.trim() } : c))
    } else {
      setCategories(prev => [...prev, { id: Date.now(), name: newCategoryName.trim() }])
    }
    setShowCategoryModal(false)
  }

  const handleDeleteCategory = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const handleSave = async () => {
    if (!form.company_name.trim()) { setError('업체명을 입력하세요'); return }
    if (!form.biz_no.trim())       { setError('사업자번호를 입력하세요'); return }
    if (!form.tel.trim())          { setError('대표연락처를 입력하세요'); return }
    if (!form.manager_name.trim()) { setError('담당자 이름을 입력하세요'); return }
    if (!form.ceo.trim())          { setError('대표자명을 입력하세요'); return }
    setSaving(true); setError('')
    try {
      const body = {
        company_id: user.company_id,
        ...form,
        categories: categories.map(c => ({ name: c.name })),
        ...(editId ? { id: editId } : {}),
      }
      const res  = await fetch('/api/clients.php', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) navigate('/basic-data/client')
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
        <h2 className='page-title'>클라이언트 관리</h2>
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
          <span className='breadcrumb-item' onClick={() => navigate('/basic-data/client')} style={{ cursor: 'pointer' }}>클라이언트 관리</span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>{editId ? '수정' : '신규등록'}</span>
        </nav>
      </div>

      <div className='page-toolbar'>
        <button className='btn-secondary' type='button' onClick={() => navigate('/basic-data/client')}>목록</button>
        <button className='btn-primary' type='button' onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
      {error && <p style={{ textAlign: 'right', color: '#e53e3e', fontSize: '1.3rem', margin: '0.4rem 0 0' }}>{error}</p>}

      <div className='content-card'>
        <div className='client-form'>

          {/* Row 1: 업체코드 | 업체명 */}
          <div className='cf-row cf-row-2col'>
            <div className='cf-field'>
              <label className='cf-label'>업체코드 *</label>
              <input className='cf-input' name='client_code' value={form.client_code || '자동생성'} readOnly autoComplete='off' />
            </div>
            <div className='cf-field'>
              <label className='cf-label'>업체명 *</label>
              <input className='cf-input' name='company_name' value={form.company_name} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 1-1: 사업자번호 | 대표연락처 */}
          <div className='cf-row cf-row-2col'>
            <div className='cf-field'>
              <label className='cf-label'>사업자번호 *</label>
              <input className='cf-input' name='biz_no' value={form.biz_no} onChange={handleChange} autoComplete='off' />
            </div>
            <div className='cf-field'>
              <label className='cf-label'>대표연락처 *</label>
              <input className='cf-input' name='tel' value={form.tel} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 2: 대표자명 */}
          <div className='cf-row cf-row-2col'>
            <div className='cf-field'>
              <label className='cf-label'>대표자명 *</label>
              <input className='cf-input' name='ceo' value={form.ceo} onChange={handleChange} autoComplete='off' />
            </div>
            <div className='cf-field' />
          </div>

          {/* Row 3: 담당자 (이름 | 연락처 | 메일주소) */}
          <div className='cf-row'>
            <div className='cf-field cf-field-inline'>
              <label className='cf-label'>담당자 *</label>
              <div className='cf-inline-group'>
                <div className='cf-inline-item'>
                  <span className='cf-inline-label'>이름</span>
                  <input className='cf-input' name='manager_name' value={form.manager_name} onChange={handleChange} autoComplete='off' />
                </div>
                <div className='cf-inline-item'>
                  <span className='cf-inline-label'>연락처</span>
                  <input className='cf-input' name='manager_tel' value={form.manager_tel} onChange={handleChange} autoComplete='off' />
                </div>
                <div className='cf-inline-item'>
                  <span className='cf-inline-label'>메일주소</span>
                  <input className='cf-input' name='manager_email' value={form.manager_email} onChange={handleChange} autoComplete='off' />
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: 주소 (full width) */}
          <div className='cf-row'>
            <div className='cf-field'>
              <label className='cf-label'>주소</label>
              <input className='cf-input' name='address' value={form.address} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 6: 메모 (full width) */}
          <div className='cf-row'>
            <div className='cf-field'>
              <label className='cf-label'>메모</label>
              <input className='cf-input' name='memo' value={form.memo} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 7: 기사분류기준 */}
          <div className='cf-row cf-row-category'>
            <div className='cf-category-left'>
              <span className='cf-label'>기사분류기준</span>
              <button className='btn-dark' type='button' onClick={handleAddCategory}>추가</button>
            </div>
            <div className='cf-category-grid'>
              {categories.map(item => (
                <div key={item.id} className='cf-category-item'>
                  <span className='cf-category-name'>{item.name}</span>
                  <div className='table-actions'>
                    <button className='btn-icon' type='button' title='편집' onClick={() => handleEditCategory(item)}>
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    <button className='btn-icon' type='button' title='삭제' onClick={() => handleDeleteCategory(item.id)}>
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

      {showCategoryModal && (
        <Modal title={editingCategory ? '기사분류기준 수정' : '기사분류기준 추가'} onClose={() => setShowCategoryModal(false)}>
          <div className='modal-form'>
            <div className='modal-field'>
              <span className='modal-label'>기사분류기준</span>
              <input
                className='modal-input'
                type='text'
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
                autoFocus
                autoComplete='off'
              />
            </div>
            <div className='modal-footer'>
              <button className='btn-primary' type='button' onClick={handleSaveCategory}>저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ClientAddPage
