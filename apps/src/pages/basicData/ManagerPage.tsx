import { useEffect, useState } from 'react'
import ManagerAddModal from './ManagerAddModal'

interface RowData {
  id: number
  manager_id: string
  name: string
  email: string
  phone: string
}

function ManagerPage() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [data, setData]               = useState<RowData[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [showModal, setShowModal]     = useState(false)
  const [editingRow, setEditingRow]   = useState<RowData | null>(null)

  const PAGE_SIZE = 10

  const fetchList = () => {
    if (!user.company_id) return
    fetch(`/api/managers.php?company_id=${encodeURIComponent(user.company_id)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data)
          setTotalPages(Math.max(1, Math.ceil(res.data.length / PAGE_SIZE)))
        }
      })
  }

  useEffect(() => { fetchList() }, [])

  const pagedData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openAdd  = () => { setEditingRow(null); setShowModal(true) }
  const openEdit = (row: RowData) => { setEditingRow(row); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingRow(null) }

  const handleDelete = async (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    const res  = await fetch(`/api/managers.php?id=${id}&company_id=${encodeURIComponent(user.company_id)}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) fetchList()
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>담당자 관리</h2>
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
          <span className='breadcrumb-item active'>담당자 관리</span>
        </nav>
      </div>
      <div className='page-toolbar'>
        <button className='btn-primary' onClick={openAdd}>신규</button>
      </div>

      {showModal && (
        <ManagerAddModal
          onClose={closeModal}
          onSaved={fetchList}
          editData={editingRow ?? undefined}
        />
      )}

      <div className='content-card'>
        <table className='data-table'>
          <thead>
            <tr>
              <th>담당자 ID</th>
              <th>한글이름</th>
              <th>Password</th>
              <th>메일주소</th>
              <th>비상연락망</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>등록된 담당자가 없습니다</td></tr>
            ) : pagedData.map(row => (
              <tr key={row.id}>
                <td>{row.manager_id}</td>
                <td>{row.name}</td>
                <td>*****</td>
                <td>{row.email}</td>
                <td>{row.phone}</td>
                <td>
                  <div className='table-actions'>
                    <button className='btn-icon' title='수정' onClick={() => openEdit(row)}>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    <button className='btn-icon' title='삭제' onClick={() => handleDelete(row.id)}>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <polyline points='3 6 5 6 21 6' />
                        <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                        <path d='M10 11v6M14 11v6' />
                        <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className='pagination'>
          <button className='page-btn' onClick={() => setCurrentPage(1)}>«</button>
          <button className='page-btn' onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>‹</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              className={`page-btn${currentPage === i + 1 ? ' active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className='page-btn' onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>›</button>
          <button className='page-btn' onClick={() => setCurrentPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  )
}

export default ManagerPage
