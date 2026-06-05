import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface NewsRow {
  id: number
  regDate: string
  manager: string
  client: string
  category: string
  mediaType: string
  headline: string
  link: string
}

const INITIAL_DATA: NewsRow[] = [
  { id: 1, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '오두기', category: '신제품', mediaType: '온라인', headline: 'https://www.sbsbiz.com/2051....', link: 'https://www.sbsbiz.com/2051' },
  { id: 2, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '신협', category: '상호금융관동향', mediaType: '지면', headline: '이미지/PDF', link: '' },
  { id: 3, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '천재교육', category: '글로벌', mediaType: '통신사', headline: 'https://www.sbsbiz.com/2051....', link: 'https://www.sbsbiz.com/2051' },
  { id: 4, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '오두기', category: '금융,경제,정책', mediaType: '온라인', headline: '이미지/PDF', link: '' },
  { id: 5, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '신협', category: 'ESG', mediaType: '지면', headline: '이미지/PDF', link: '' },
  { id: 6, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '천재교육', category: '신제품', mediaType: '통신사', headline: '이미지/PDF', link: '' },
  { id: 7, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '오두기', category: '상호금융관동향', mediaType: '온라인', headline: '이미지/PDF', link: '' },
  { id: 8, regDate: '2025-12-01 04:20', manager: '관리자 2', client: '신협', category: '글로벌', mediaType: '지면', headline: '이미지/PDF', link: '' },
]

const TOTAL_PAGES = 10
const TOTAL_COUNT = 50

const CATEGORY_OPTIONS = ['신제품', '글로벌', 'ESG', '경쟁사']
const MEDIA_TYPE_OPTIONS = ['전체', '온라인', '지면', '통신사']

function NewsRegistrationPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<NewsRow[]>(INITIAL_DATA)
  const [currentPage, setCurrentPage] = useState(1)

  const [clientFilter, setClientFilter] = useState('전체·오두기·신협·천재교육')
  const [dateFrom, setDateFrom] = useState('25-12-24')
  const [dateTo, setDateTo] = useState('26-03-15')
  const [categoryFilter, setCategoryFilter] = useState<string[]>(['신제품', '글로벌'])
  const [mediaTypeFilter, setMediaTypeFilter] = useState('온라인')

  const handleCategoryToggle = (cat: string) => {
    setCategoryFilter(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    setData(prev => prev.filter(r => r.id !== id))
  }

  const isUrl = (str: string) => str.startsWith('http')

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
              <input
                className='filter-input'
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              />
            </div>
            <div className='filter-field'>
              <span className='filter-label'>뉴스등록일</span>
              <div className='filter-date-range'>
                <input
                  className='filter-input filter-input-date'
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
                <span className='filter-date-sep'>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <rect x='3' y='4' width='18' height='18' rx='2' ry='2' />
                    <line x1='16' y1='2' x2='16' y2='6' />
                    <line x1='8' y1='2' x2='8' y2='6' />
                    <line x1='3' y1='10' x2='21' y2='10' />
                  </svg>
                </span>
                <span className='filter-date-tilde'>~</span>
                <input
                  className='filter-input filter-input-date'
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
                <span className='filter-date-sep'>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <rect x='3' y='4' width='18' height='18' rx='2' ry='2' />
                    <line x1='16' y1='2' x2='16' y2='6' />
                    <line x1='8' y1='2' x2='8' y2='6' />
                    <line x1='3' y1='10' x2='21' y2='10' />
                  </svg>
                </span>
              </div>
            </div>
          </div>
          <div className='filter-row'>
            <div className='filter-field'>
              <span className='filter-label'>기사분류</span>
              <div className='filter-checkbox-group'>
                {CATEGORY_OPTIONS.map(cat => (
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
              <button className='btn-secondary'>조회</button>
            </div>
          </div>
        </div>
      </div>

      <div className='page-toolbar'>
        <button className='btn-primary' onClick={() => navigate('/news-registration/new')}>뉴스등록</button>
      </div>

      {/* 목록 */}
      <div className='content-card'>
        <div className='table-count'>총 <strong>{TOTAL_COUNT}</strong>건</div>
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
            {data.map(row => (
              <tr key={row.id}>
                <td>{row.regDate}</td>
                <td>{row.manager}</td>
                <td>{row.client}</td>
                <td>{row.category}</td>
                <td>{row.mediaType}</td>
                <td>
                  {isUrl(row.headline) ? (
                    <a className='news-link' href={row.link} target='_blank' rel='noreferrer'>{row.headline}</a>
                  ) : (
                    <span>{row.headline}</span>
                  )}
                </td>
                <td>
                  <div className='table-actions'>
                    <button className='btn-icon' title='편집' onClick={() => navigate('/news-registration/edit', { state: row })}>
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
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <button
              key={i + 1}
              className={`page-btn${currentPage === i + 1 ? ' active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className='page-btn' onClick={() => setCurrentPage(p => Math.min(TOTAL_PAGES, p + 1))} disabled={currentPage === TOTAL_PAGES}>›</button>
          <button className='page-btn' onClick={() => setCurrentPage(TOTAL_PAGES)} disabled={currentPage === TOTAL_PAGES}>»</button>
        </div>
      </div>
    </div>
  )
}

export default NewsRegistrationPage
