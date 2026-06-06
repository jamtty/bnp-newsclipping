import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface MediaRow {
  id: number
  media_code:          string
  media_name:          string
  region:              string
  tel:                 string
  company_id?:         string
  admin_company_name?: string
}

const PAGE_SIZE = 10

function MediaPage() {
  const navigate  = useNavigate()
  const user      = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [data, setData]               = useState<MediaRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [companies, setCompanies]     = useState<{ company_id: string; company_name: string }[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('all')

  const fetchList = () => {
    let url = '/api/media.php'
    if (user.user_type === 'super_admin') {
      if (selectedCompany && selectedCompany !== 'all') url += `?company_id=${encodeURIComponent(selectedCompany)}`
    } else {
      if (!user.company_id) return
      url += `?company_id=${encodeURIComponent(user.company_id)}`
    }
    fetch(url).then(r => r.json()).then(res => { if (res.success) setData(res.data) })
  }

  useEffect(() => { fetchList() }, [selectedCompany])

  useEffect(() => {
    if (user.user_type === 'super_admin') {
      fetch('/api/companies.php').then(r => r.json()).then(res => { if (res.success) setCompanies(res.data) })
    }
  }, [])

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const pagedData  = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleEdit = (row: MediaRow) => {
    navigate('/basic-data/media/new', { state: { id: row.id, company_id: row.company_id } })
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    let url = `/api/media.php?id=${id}`
    if (user.user_type === 'super_admin') {
      if (selectedCompany && selectedCompany !== 'all') url += `&company_id=${encodeURIComponent(selectedCompany)}`
      else {
        const row = data.find(d => d.id === id)
        if (row && row.company_id) url += `&company_id=${encodeURIComponent(row.company_id)}`
      }
    } else {
      url += `&company_id=${encodeURIComponent(user.company_id)}`
    }
    const res  = await fetch(url, { method: 'DELETE' })
    const resJson = await res.json()
    if (resJson.success) fetchList()
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
          <span className='breadcrumb-item active'>뉴스매체</span>
        </nav>
      </div>

      <div className='page-toolbar'>
        {user.user_type === 'super_admin' && (
          <select
            className='cf-input company-select'
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            style={{ marginRight: '8px', minWidth: 220 }}
          >
            <option value='all'>전체 담당업체</option>
            {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_id})</option>)}
          </select>
        )}
        <button className='btn-primary' onClick={() => navigate('/basic-data/media/new')}>신규</button>
      </div>

      <div className='content-card'>
        <table className='data-table'>
          <thead>
            <tr>
              {user.user_type === 'super_admin' && <th className='col-admin-company'>담당업체</th>}
              <th>뉴스매체 ID</th>
              <th>매체명</th>
              <th>지역</th>
              <th>대표전화</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr><td colSpan={user.user_type === 'super_admin' ? 6 : 5} style={{ textAlign: 'center', color: '#aaa' }}>등록된 매체가 없습니다</td></tr>
            ) : pagedData.map(row => (
              <tr key={row.id}>
                {user.user_type === 'super_admin' && <td className='col-admin-company'>{row.admin_company_name ? `${row.admin_company_name} (${row.company_id})` : row.company_id}</td>}
                <td>{row.media_code}</td>
                <td>{row.media_name}</td>
                <td>{row.region}</td>
                <td>{row.tel}</td>
                <td>
                  <div className='table-actions'>
                    <button className='btn-icon' title='편집' onClick={() => handleEdit(row)}>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    <button className='btn-icon' title='삭제' onClick={() => handleDelete(row.id)}>
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
            <button key={i + 1} className={`page-btn${currentPage === i + 1 ? ' active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
          ))}
          <button className='page-btn' onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
          <button className='page-btn' onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
        </div>
      </div>
    </div>
  )
}

export default MediaPage
