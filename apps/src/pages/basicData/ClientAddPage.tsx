import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Modal from '../../components/common/Modal'

interface CategoryItem {
  id: number
  name: string
}

function ClientAddPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const editData = location.state as { no: string; company: string; bizNo: string; ceo: string; manager: string; phone: string; email: string } | null

  const [form, setForm] = useState({
    companyCode: editData?.no ?? '0001',
    companyName: editData?.company ?? '',
    tel: editData?.phone ?? '',
    repManager: editData?.manager ?? '',
    managerName: '',
    managerTel: '',
    managerEmail: editData?.email ?? '',
    ceo: editData?.ceo ?? '',
    address: '',
    memo: '',
  })

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  const [categories, setCategories] = useState<CategoryItem[]>([
    { id: 1, name: '오뚜기 행사' },
    { id: 2, name: '오뚜기 행사' },
    { id: 3, name: '오뚜기 행사' },
    { id: 4, name: '오뚜기 행사' },
    { id: 5, name: '오뚜기 행사' },
    { id: 6, name: '오뚜기 행사' },
  ])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setNewCategoryName('')
    setShowCategoryModal(true)
  }

  const handleEditCategory = (item: CategoryItem) => {
    setEditingCategory(item)
    setNewCategoryName(item.name)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) return
    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: newCategoryName.trim() } : c))
    } else {
      setCategories(prev => [...prev, { id: Date.now(), name: newCategoryName.trim() }])
    }
    setShowCategoryModal(false)
    setNewCategoryName('')
    setEditingCategory(null)
  }

  const handleDeleteCategory = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    setCategories(prev => prev.filter(c => c.id !== id))
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
          <span className='breadcrumb-item active'>{editData ? '수정' : '신규등록'}</span>
        </nav>
      </div>

      <div className='page-toolbar'>
        <button className='btn-secondary' type='button' onClick={() => navigate('/basic-data/client')}>목록</button>
        <button className='btn-primary' type='button'>저장</button>
      </div>

      <div className='content-card'>
        <div className='client-form'>

          {/* Row 1: 업체코드 | 업체명 */}
          <div className='cf-row cf-row-2col'>
            <div className='cf-field'>
              <label className='cf-label'>업체코드 *</label>
              <input className='cf-input' name='companyCode' value={form.companyCode} readOnly autoComplete='off' />
            </div>
            <div className='cf-field'>
              <label className='cf-label'>업체명 *</label>
              <input className='cf-input' name='companyName' value={form.companyName} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 2: 대표연락처 | 대표 담당자 */}
          <div className='cf-row cf-row-2col'>
            <div className='cf-field'>
              <label className='cf-label'>대표연락처 *</label>
              <input className='cf-input' name='tel' value={form.tel} onChange={handleChange} autoComplete='off' />
            </div>
            <div className='cf-field'>
              <label className='cf-label'>대표 담당자 *</label>
              <input className='cf-input' name='repManager' value={form.repManager} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 3: 대표담당자 (이름 | 연락처 | 메일주소) */}
          <div className='cf-row'>
            <div className='cf-field cf-field-inline'>
              <label className='cf-label'>대표담당자 *</label>
              <div className='cf-inline-group'>
                <div className='cf-inline-item'>
                  <span className='cf-inline-label'>이름</span>
                  <input className='cf-input' name='managerName' value={form.managerName} onChange={handleChange} autoComplete='off' />
                </div>
                <div className='cf-inline-item'>
                  <span className='cf-inline-label'>연락처</span>
                  <input className='cf-input' name='managerTel' value={form.managerTel} onChange={handleChange} autoComplete='off' />
                </div>
                <div className='cf-inline-item'>
                  <span className='cf-inline-label'>메일주소</span>
                  <input className='cf-input' name='managerEmail' value={form.managerEmail} onChange={handleChange} autoComplete='off' />
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: 대표자명 (full width) */}
          <div className='cf-row'>
            <div className='cf-field'>
              <label className='cf-label'>대표자명 *</label>
              <input className='cf-input' name='ceo' value={form.ceo} onChange={handleChange} autoComplete='off' />
            </div>
          </div>

          {/* Row 5: 주소 (full width) */}
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
