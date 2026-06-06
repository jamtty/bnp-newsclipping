import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'
const PAGE_SIZE = 10

interface NewsRow {
  id: number
  serial: string
  manager: string
  reg_date: string
  reg_time: string | null
  client_name: string | null
  categories: string | null
  media_type: string | null
  headline: string | null
  link: string | null
  file_name: string | null
  file_path: string | null
}

interface ClientOption {
  id: number
  client_code: string
  company_name: string
}

const MEDIA_TYPE_OPTIONS = ['전체', '온라인', '지면', '통신사']

function NewsRegistrationPage() {
  const navigate = useNavigate()
  const user      = JSON.parse(sessionStorage.getItem('user') || '{}')
  const companyId = user.company_id || ''

  const [data,     setData]     = useState<NewsRow[]>([])
  const [filtered, setFiltered] = useState<NewsRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [clients,       setClients]       = useState<ClientOption[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])

  // 필터 상태
  const [clientFilter,    setClientFilter]    = useState('')
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  const [categoryFilter,  setCategoryFilter]  = useState<string[]>([])
  const [mediaTypeFilter, setMediaTypeFilter] = useState('전체')

  // 클라이언트 목록 로드
  useEffect(() => {
    fetch(`${API}/clients.php?company_id=${encodeURIComponent(companyId)}`)
      .then(r => r.json())
      .then(res => { if (res.success) setClients(res.data) })
  }, [])

  // 뉴스 목록 로드
  const loadNews = () => {
    setLoading(true)
    fetch(`${API}/news.php?company_id=${encodeURIComponent(companyId)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data)
          const cats = new Set<string>()
          res.data.forEach((row: NewsRow) => {
            if (row.categories) row.categories.split(',').forEach(c => { if (c.trim()) cats.add(c.trim()) })
          })
          setAllCategories(Array.from(cats).sort())
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadNews() }, [])

  // 필터 적용
  const applyFilters = (rows: NewsRow[]) => {
    let result = [...rows]
    if (clientFilter)              result = result.filter(r => r.client_name === clientFilter)
    if (dateFrom)                  result = result.filter(r => (r.reg_date ?? '') >= dateFrom)
    if (dateTo)                    result = result.filter(r => (r.reg_date ?? '') <= dateTo)
    if (categoryFilter.length > 0) {
      result = result.filter(r => {
        const cats = (r.categories || '').split(',').map(c => c.trim())
        return categoryFilter.some(cf => cats.includes(cf))
      })
    }
    if (mediaTypeFilter !== '전체') result = result.filter(r => r.media_type === mediaTypeFilter)
    setFiltered(result)
    setCurrentPage(1)
  }

  useEffect(() => { applyFilters(data) }, [data])

  const handleSearch = () => applyFilters(data)

  const handleCategoryToggle = (cat: string) => {
    setCategoryFilter(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    fetch(`${API}/news.php?id=${id}&company_id=${encodeURIComponent(companyId)}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(res => {
        if (res.success) loadNews()
        else alert('삭제에 실패했습니다.')
      })
  }

  const isUrl = (str: string | null) => !!str && str.startsWith('http')

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const renderPageButtons = () => {
    const group = Math.floor((currentPage - 1) / 10)
    const start = group * 10 + 1
    const end   = Math.min(start + 9, totalPages)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
      <button
        key={p}
        className={`page-btn${currentPage === p ? ' active' : ''}`}
        onClick={() => setCurrentPage(p)}
      >
        {p}
      </button>
    ))
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>뉴스관리</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>뉴스관리</span>
        </nav>
      </div>

      {/* 검색 필터 */}
      <div className='content-card'>
        <div className='filter-grid'>
          <div className='filter-row'>
            <div className='filter-field'>
              <span className='filter-label'>클라이언트</span>
              <select
                className='filter-select'
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              >
                <option value=''>전체</option>
                {clients.map(c => (
                  <option key={c.id} value={c.company_name}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div className='filter-field'>
              <span className='filter-label'>뉴스등록일</span>
              <div className='filter-date-range'>
                <input
                  type='date'
                  className='filter-input filter-input-date'
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
                <span className='filter-date-tilde'>~</span>
                <input
                  type='date'
                  className='filter-input filter-input-date'
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className='filter-row'>
            <div className='filter-field'>
              <span className='filter-label'>기사분류</span>
              <div className='filter-checkbox-group'>
                {allCategories.map(cat => (
                  <label key={cat} className='filter-checkbox-label'>
                    <input
                      type='checkbox'
                      checked={categoryFilter.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                      className='filter-checkbox'
                    />
                    {cat}
                  </label>
                ))}
                {allCategories.length === 0 && (
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>뉴스 로딩 후 표시됩니다</span>
                )}
              </div>
            </div>
            <div className='filter-field'>
              <span className='filter-label'>미디어 type</span>
              <select
                className='filter-select'
                value={mediaTypeFilter}
                onChange={e => setMediaTypeFilter(e.target.value)}
              >
                {MEDIA_TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className='filter-actions'>
              <button className='btn-secondary' onClick={handleSearch}>조회</button>
            </div>
          </div>
        </div>
      </div>

      <div className='page-toolbar'>
        <button className='btn-primary' onClick={() => navigate('/news-registration/new')}>뉴스등록</button>
      </div>

      {/* 목록 */}
      <div className='content-card'>
        <div className='table-count'>
          총 <strong>{filtered.length}</strong>건
          {loading && <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.85rem' }}>로딩 중...</span>}
        </div>
        <table className='data-table'>
          <thead>
            <tr>
              <th>등록일</th>
              <th>등록 담당자</th>
              <th>클라이언트</th>
              <th>기사분류</th>
              <th>미디어 type</th>
              <th>기사 Headline<br />기사 링크</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
            {pageData.map(row => (
              <tr key={row.id}>
                <td>{row.reg_date}{row.reg_time ? ` ${row.reg_time}` : ''}</td>
                <td>{row.manager}</td>
                <td>{row.client_name}</td>
                <td>{row.categories}</td>
                <td>{row.media_type}</td>
                <td>
                  {isUrl(row.headline) ? (
                    <a className='news-link' href={row.link ?? '#'} target='_blank' rel='noreferrer'>
                      {row.headline}
                    </a>
                  ) : row.file_name ? (
                    <span>이미지/PDF</span>
                  ) : (
                    <span>{row.headline}</span>
                  )}
                </td>
                <td>
                  <div className='table-actions'>
                    <button
                      className='btn-icon'
                      title='편집'
                      onClick={() => navigate('/news-registration/edit', { state: { id: row.id, company_id: companyId } })}
                    >
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    <button
                      className='btn-icon'
                      title='삭제'
                      onClick={() => handleDelete(row.id)}
                    >
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

        {totalPages > 1 && (
          <div className='pagination'>
            <button className='page-btn' onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
            <button className='page-btn' onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
            {renderPageButtons()}
            <button className='page-btn' onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
            <button className='page-btn' onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsRegistrationPage
