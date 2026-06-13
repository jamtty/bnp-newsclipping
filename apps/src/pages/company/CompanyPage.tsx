import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface CompanyRow {
  company_id: string
  user_id: string
  company_name: string
  main_contact: string
  main_manager: string
  mobile: string
  manager_email: string
}

const PAGE_SIZE = 50

function CompanyPage() {
  const navigate = useNavigate()

  const [data, setData]               = useState<CompanyRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set())

  const fetchList = () => {
    fetch('/api/companies.php')
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data) })
  }

  useEffect(() => { fetchList() }, [])

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const pagedData  = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const isAllChecked = pagedData.length > 0 && pagedData.every(r => checkedIds.has(r.company_id))
  const toggleCheck = (id: string) => setCheckedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = (checked: boolean) => setCheckedIds(checked ? new Set(pagedData.map(r => r.company_id)) : new Set())
  const handleDeleteSelected = async () => {
    if (checkedIds.size === 0) return
    if (!window.confirm(`선택한 ${checkedIds.size}건을 삭제하시겠습니까?\n모든 관련 데이터가 함기 삭제됩니다.`)) return
    for (const id of Array.from(checkedIds)) {
      await fetch(`/api/companies.php?id=${id}`, { method: 'DELETE' })
    }
    setCheckedIds(new Set())
    fetchList()
  }

  const handleEdit = (row: CompanyRow) => {
    navigate('/company/edit', { state: { company_id: row.company_id } })
  }

  const handleDelete = async (company_id: string, company_name: string) => {
    if (!window.confirm(`"${company_name}" 업체를 삭제하시겠습니까?\n담당자, 매체, 클라이언트 등 모든 데이터가 함께 삭제됩니다.`)) return
    const res  = await fetch(`/api/companies.php?id=${company_id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) fetchList()
    else alert(json.message || '삭제에 실패했습니다')
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>업체 관리</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>업체 관리</span>
        </nav>
      </div>

      <div className='page-toolbar'>
        {checkedIds.size > 0 && (
          <button className='btn-danger' onClick={handleDeleteSelected} style={{ marginRight: '8px' }}>선택삭제 ({checkedIds.size})</button>
        )}
        <button className='btn-primary' onClick={() => navigate('/company/new')}>신규 업체 등록</button>
      </div>

      <div className='content-card'>
        <div className='table-count'>총 <strong>{data.length}</strong>건</div>
        <table className='data-table'>
          <thead>
            <tr>
              <th style={{ width: '3rem', textAlign: 'center' }}><input type='checkbox' checked={isAllChecked} onChange={e => toggleAll(e.target.checked)} /></th>
              <th>No.</th>
              <th>회사 ID</th>
              <th>상호</th>
              <th>관리자 ID</th>
              <th>대표 담당자</th>
              <th>대표연락처</th>
              <th>담당자 이메일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#aaa' }}>
                  등록된 업체가 없습니다
                </td>
              </tr>
            ) : pagedData.map((row, idx) => (
              <tr key={row.company_id}>
                <td style={{ textAlign: 'center' }}><input type='checkbox' checked={checkedIds.has(row.company_id)} onChange={() => toggleCheck(row.company_id)} /></td>
                <td>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                <td>{row.company_id}</td>
                <td>{row.company_name}</td>
                <td>{row.user_id}</td>
                <td>{row.main_manager}</td>
                <td>{row.main_contact}</td>
                <td>{row.manager_email}</td>
                <td>
                  <div className='table-actions'>
                    <button className='btn-icon' title='편집' onClick={() => handleEdit(row)}>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    <button className='btn-icon' title='삭제' onClick={() => handleDelete(row.company_id, row.company_name)}>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <polyline points='3 6 5 6 21 6' />
                        <path d='M19 6l-1 14H6L5 6' />
                        <path d='M10 11v6M14 11v6' />
                        <path d='M9 6V4h6v2' />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className='pagination'>
          <button className='page-btn' onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
          <button className='page-btn' onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              className={`page-btn${currentPage === i + 1 ? ' active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className='page-btn' onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
          <button className='page-btn' onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
        </div>
      </div>
    </div>
  )
}

export default CompanyPage
