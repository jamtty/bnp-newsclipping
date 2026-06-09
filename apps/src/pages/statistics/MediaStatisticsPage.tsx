import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'

const API = '/api'
const MEDIA_TYPE_OPTIONS = ['전체', '온라인', '지면', '통신사']

interface ClientOption {
  id: number
  client_code: string
  company_name: string
  company_id: string
}

interface NewsRow {
  id: number
  reg_date: string
  reg_time: string | null
  created_date: string | null
  created_time: string | null
  company_id: string | null
  client_id: number | null
  client_name: string | null
  media_code: string | null
  media_name: string | null
  categories: string | null
  media_type: string | null
  headline: string | null
  link: string | null
  file_name: string | null
  file_path: string | null
  journalist: string | null
  sentiment: string | null
}

interface MediaStat {
  media_name: string
  media_type: string
  total: number
  positive: number
  negative: number
  neutral: number
}

function MediaStatisticsPage() {
  const user      = JSON.parse(sessionStorage.getItem('user') || '{}')
  const companyId = user.company_id || ''

  const [clients,       setClients]       = useState<ClientOption[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [companies,     setCompanies]     = useState<{ company_id: string; company_name: string }[]>([])
  const [data,          setData]          = useState<NewsRow[]>([])
  const [loading,       setLoading]       = useState(false)
  const [searched,      setSearched]      = useState(false)

  const [companyFilter,   setCompanyFilter]   = useState('')
  const [clientFilterId,  setClientFilterId]  = useState('')
  const [dateFrom,        setDateFrom]        = useState(() => new Date().toISOString().slice(0, 10))
  const [dateTo,          setDateTo]          = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryFilter,  setCategoryFilter]  = useState<string[]>([])
  const [mediaTypeFilter, setMediaTypeFilter] = useState('전체')

  const [stats, setStats] = useState<MediaStat[]>([])

  useEffect(() => {
    const url = user.user_type === 'super_admin'
      ? `${API}/clients.php`
      : `${API}/clients.php?company_id=${encodeURIComponent(companyId)}`
    fetch(url).then(r => r.json()).then(res => { if (res.success) setClients(res.data) })
    if (user.user_type === 'super_admin') {
      fetch(`${API}/companies.php`).then(r => r.json()).then(res => { if (res.success) setCompanies(res.data) })
    }
  }, [])

  const filteredClients = companyFilter
    ? clients.filter(c => c.company_id === companyFilter)
    : clients

  const handleCompanyFilter = (cid: string) => {
    setCompanyFilter(cid)
    setClientFilterId('')
    setCategoryFilter([])
    setAllCategories([])
  }

  useEffect(() => {
    setCategoryFilter([])
    if (!clientFilterId) { setAllCategories([]); return }
    const sel = clients.find(cl => String(cl.id) === clientFilterId)
    const cid = (sel as any)?.company_id || companyId
    fetch(`${API}/clients.php?company_id=${encodeURIComponent(cid)}&id=${clientFilterId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.categories) {
          setAllCategories(res.data.categories.map((c: { name: string }) => c.name))
        } else setAllCategories([])
      })
  }, [clientFilterId, clients])

  const handleCategoryToggle = (cat: string) =>
    setCategoryFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])

  const loadAndSearch = () => {
    setSearched(true)
    setLoading(true)
    const url = user.user_type === 'super_admin'
      ? `${API}/news.php`
      : `${API}/news.php?company_id=${encodeURIComponent(companyId)}`
    fetch(url)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          let rows: NewsRow[] = res.data
          if (companyFilter)  rows = rows.filter(r => r.company_id === companyFilter)
          if (clientFilterId) rows = rows.filter(r => r.client_id === Number(clientFilterId))
          if (dateFrom)       rows = rows.filter(r => (r.created_date ?? r.reg_date ?? '') >= dateFrom)
          if (dateTo)         rows = rows.filter(r => (r.created_date ?? r.reg_date ?? '') <= dateTo)
          if (categoryFilter.length > 0) {
            rows = rows.filter(r => {
              const cats = (r.categories || '').split(',').map(c => c.trim())
              return categoryFilter.some(cf => cats.includes(cf))
            })
          }
          if (mediaTypeFilter !== '전체') rows = rows.filter(r => r.media_type === mediaTypeFilter)
          setData(rows)
          buildStats(rows)
        }
      })
      .finally(() => setLoading(false))
  }

  const buildStats = (rows: NewsRow[]) => {
    const map: Record<string, MediaStat> = {}
    rows.forEach(r => {
      const key = r.media_name || '(매체없음)'
      if (!map[key]) {
        map[key] = { media_name: key, media_type: r.media_type || '-', total: 0, positive: 0, negative: 0, neutral: 0 }
      }
      map[key].total++
      if (r.sentiment === '긍정')      map[key].positive++
      else if (r.sentiment === '부정') map[key].negative++
      else                              map[key].neutral++
    })
    setStats(Object.values(map).sort((a, b) => b.total - a.total))
  }

  const handleReset = () => {
    setCompanyFilter('')
    setClientFilterId('')
    setDateFrom(new Date().toISOString().slice(0, 10))
    setDateTo(new Date().toISOString().slice(0, 10))
    setCategoryFilter([])
    setAllCategories([])
    setMediaTypeFilter('전체')
    setStats([])
    setData([])
    setSearched(false)
  }

  const handlePrint = () => {
    const selectedClient = clients.find(cl => String(cl.id) === clientFilterId)
    const clientLabel = selectedClient?.company_name || ''
    let companyLabel = ''
    if (user.user_type === 'super_admin') {
      const cid = selectedClient?.company_id || companyFilter
      companyLabel = companies.find(c => c.company_id === cid)?.company_name || ''
    } else {
      companyLabel = user.company_name || ''
    }

    // 날짜+기사분류 조합으로 커럼 헤더 생성
    const dateCatSet = new Set<string>()
    data.forEach(r => {
      const d = (r.created_date || r.reg_date || '').slice(5).replace('-', '/')
      const cats = (r.categories || '').split(',').map(c => c.trim()).filter(Boolean)
      if (cats.length > 0) {
        cats.forEach(cat => dateCatSet.add(`${d} ${cat}`))
      } else {
        dateCatSet.add(d)
      }
    })
    const dateCols = [...dateCatSet].sort()

    // 매체명+기자명 기준 행 구성
    const rowMap: Record<string, { media: string; journalist: string; counts: Record<string, number> }> = {}
    data.forEach(r => {
      const media = r.media_name || '미지정'
      const journalist = r.journalist || ''
      const key = `${media}__${journalist}`
      if (!rowMap[key]) rowMap[key] = { media, journalist, counts: {} }
      const d = (r.created_date || r.reg_date || '').slice(5).replace('-', '/')
      const cats = (r.categories || '').split(',').map(c => c.trim()).filter(Boolean)
      if (cats.length > 0) {
        cats.forEach(cat => {
          const col = `${d} ${cat}`
          rowMap[key].counts[col] = (rowMap[key].counts[col] || 0) + 1
        })
      } else {
        rowMap[key].counts[d] = (rowMap[key].counts[d] || 0) + 1
      }
    })

    const aoa: any[][] = []
    aoa.push(['매체명', '기자명', ...dateCols])
    Object.values(rowMap)
      .sort((a, b) => a.media.localeCompare(b.media) || a.journalist.localeCompare(b.journalist))
      .forEach(row => {
        aoa.push([row.media, row.journalist, ...dateCols.map(col => row.counts[col] || 0)])
      })

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      ...dateCols.map(() => ({ wch: 12 })),
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '매체별노출리포트')
    const prefix = companyLabel && clientLabel ? `(${companyLabel})${clientLabel}` : clientLabel || companyLabel || '전체'
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    XLSX.writeFile(wb, `${prefix}_매체별노출리포트_뉴스클리핑_${today}.xlsx`)
  }

  const totalCount = data.length
  const byType: Record<string, number> = {}
  stats.forEach(s => { byType[s.media_type] = (byType[s.media_type] || 0) + s.total })

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>매체별 뉴스 노출 리포트</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item'>통계</span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>매체별 뉴스 노출 리포트</span>
        </nav>
      </div>

      {/* 필터 */}
      <div className='content-card'>
        <div className='filter-grid'>
          <div className='filter-row'>
            {user.user_type === 'super_admin' && (
              <div className='filter-field'>
                <span className='filter-label'>담당업체</span>
                <select className='filter-select' value={companyFilter} onChange={e => handleCompanyFilter(e.target.value)}>
                  <option value=''>전체</option>
                  {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                </select>
              </div>
            )}
            <div className='filter-field'>
              <span className='filter-label'>기사생성일</span>
              <div className='filter-date-range'>
                <input type='date' className='filter-input filter-input-date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <span className='filter-date-tilde'>~</span>
                <input type='date' className='filter-input filter-input-date' value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className='filter-field'>
              <span className='filter-label'>클라이언트</span>
              <select
                className='filter-select'
                value={clientFilterId}
                onChange={e => setClientFilterId(e.target.value)}
                disabled={user.user_type === 'super_admin' && !companyFilter}
              >
                <option value=''>
                  {user.user_type === 'super_admin' && !companyFilter ? '담당업체를 먼저 선택하세요' : '전체'}
                </option>
                {filteredClients.map(c => <option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
              </select>
            </div>
          </div>
          <div className='filter-row'>
            <div className='filter-field'>
              <span className='filter-label'>기사분류</span>
              <div className='filter-checkbox-group'>
                {allCategories.map(cat => (
                  <label key={cat} className='filter-checkbox-label'>
                    <input type='checkbox' className='filter-checkbox' checked={categoryFilter.includes(cat)} onChange={() => handleCategoryToggle(cat)} />
                    {cat}
                  </label>
                ))}
                {allCategories.length === 0 && (
                  <span style={{ color: '#999', fontSize: '1.3rem' }}>
                    {clientFilterId ? '등록된 기사분류가 없습니다' : '클라이언트를 선택하면 표시됩니다'}
                  </span>
                )}
              </div>
            </div>
            <div className='filter-field'>
              <span className='filter-label'>미디어 Type</span>
              <select className='filter-select' value={mediaTypeFilter} onChange={e => setMediaTypeFilter(e.target.value)}>
                {MEDIA_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className='filter-actions'>
              <button className='btn-primary' onClick={loadAndSearch} disabled={loading || !clientFilterId}>
                {loading ? '조회 중...' : '조회'}
              </button>
              <button className='btn-secondary' onClick={handleReset}>초기화</button>
            </div>
          </div>
        </div>
      </div>

      {/* 출력 버튼 */}
      <div className='content-card'>
        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className='btn-primary' onClick={() => { if (!searched) { alert('클라이언트를 선택한 후 [조회] 버튼을 눌러주세요'); return }; handlePrint() }} disabled={loading}>출력</button>
          {loading && <span style={{ fontSize: '1.3rem', color: '#999' }}>로딩 중...</span>}
          {!loading && stats.length > 0 && <span style={{ fontSize: '1.3rem', color: '#555' }}>총 <strong>{stats.length}</strong>개 매체 · <strong>{totalCount}</strong>건</span>}
        </div>
      </div>

      {/* 결과 영역 */}
      {(stats.length > 0 || loading) && (
        <>
          {/* 요약 카드 */}
          <div className='content-card'>
            <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
              {[
                { label: '총 노출 건수', value: totalCount.toLocaleString(),                                  color: '#6366f1', bg: '#eef2ff' },
                { label: '긍정',         value: stats.reduce((a, s) => a + s.positive, 0).toLocaleString(),  color: '#2e7d32', bg: '#e6f4ea' },
                { label: '부정',         value: stats.reduce((a, s) => a + s.negative, 0).toLocaleString(),  color: '#c62828', bg: '#fde8e8' },
                { label: '중립',         value: stats.reduce((a, s) => a + s.neutral, 0).toLocaleString(),   color: '#555',    bg: '#f3f3f3' },
                { label: '노출 매체 수', value: `${stats.length}개`,                                         color: '#0277bd', bg: '#e1f5fe' },
              ].map(card => (
                <div key={card.label} style={{
                  background: card.bg, border: `1px solid ${card.color}22`,
                  borderRadius: '1rem', padding: '1.4rem 2.2rem', minWidth: '13rem',
                }}>
                  <div style={{ fontSize: '1.2rem', color: card.color, fontWeight: 600, marginBottom: '0.4rem' }}>{card.label}</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
            {Object.keys(byType).length > 0 && (
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.4rem', flexWrap: 'wrap' }}>
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, cnt]) => (
                  <span key={type} style={{
                    background: '#fff', border: '1px solid #e0e0f0', borderRadius: '2rem',
                    padding: '0.4rem 1.2rem', fontSize: '1.3rem', color: '#444',
                  }}>
                    <span style={{ fontWeight: 600, color: '#6366f1' }}>{type}</span>&nbsp;{cnt.toLocaleString()}건
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 테이블 */}
          <div className='content-card'>
            <div className='table-count'>
              총 <strong>{stats.length}</strong>개 매체
              {loading && <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.85rem' }}>로딩 중...</span>}
            </div>
            <table className='data-table'>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>순위</th>
                  <th style={{ width: '22%' }}>매체명</th>
                  <th style={{ width: '10%' }}>매체구분</th>
                  <th style={{ width: '8%' }}>총 노출</th>
                  <th style={{ width: '8%' }}>긍정</th>
                  <th style={{ width: '8%' }}>부정</th>
                  <th style={{ width: '8%' }}>중립</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.media_name}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: i < 3 ? '#6366f1' : '#999' }}>
                      {i + 1}
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.media_name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: typeColor(s.media_type).bg,
                        color: typeColor(s.media_type).text,
                        borderRadius: '1rem', padding: '0.2rem 0.9rem',
                        fontSize: '1.2rem', fontWeight: 600,
                      }}>
                        {s.media_type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.total}</td>
                    <td style={{ textAlign: 'center', color: '#2e7d32', fontWeight: 500 }}>
                      {s.positive > 0 ? s.positive : <span style={{ color: '#ccc' }}>-</span>}
                    </td>
                    <td style={{ textAlign: 'center', color: '#c62828', fontWeight: 500 }}>
                      {s.negative > 0 ? s.negative : <span style={{ color: '#ccc' }}>-</span>}
                    </td>
                    <td style={{ textAlign: 'center', color: '#888' }}>
                      {s.neutral > 0 ? s.neutral : <span style={{ color: '#ccc' }}>-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {searched && !loading && data.length === 0 && (
        <div className='content-card' style={{ textAlign: 'center', padding: '6rem 0', color: '#bbb', fontSize: '1.5rem' }}>
          조회된 기사가 없습니다
        </div>
      )}

      {!searched && !loading && (
        <div className='content-card' style={{ textAlign: 'center', padding: '6rem 0', color: '#bbb', fontSize: '1.5rem' }}>
          클라이언트를 선택하고 [조회] 버튼을 눌러주세요
        </div>
      )}

      {/* 조회 결과 목록 */}
      {(data.length > 0 || loading) && (
        <div className='content-card'>
          <div className='table-count'>
            총 <strong>{data.length}</strong>건
            {loading && <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.85rem' }}>로딩 중...</span>}
          </div>
          <table className='data-table'>
            <thead>
              <tr>
                <th>생성일/등록일</th>
                <th>클라이언트</th>
                <th>뉴스매체</th>
                <th>기사분류</th>
                <th>미디어 Type</th>
                <th>기사 Headline / 링크</th>
                <th>이미지</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontSize: '0.85em', color: '#888' }}>생성일: {row.created_date ?? ''}{row.created_time ? ` ${row.created_time}` : ''}</div>
                    <div style={{ fontSize: '0.85em', color: '#888' }}>등록일: {row.reg_date}{row.reg_time ? ` ${row.reg_time}` : ''}</div>
                  </td>
                  <td>{row.client_name}</td>
                  <td>{row.media_name}</td>
                  <td>
                    <div>{row.categories}</div>
                    {row.sentiment && (
                      <div style={{
                        fontSize: '0.82em', marginTop: '0.3rem', display: 'inline-block',
                        padding: '0.1rem 0.5rem', borderRadius: '0.8rem',
                        background: row.sentiment === '긍정' ? '#e6f4ea' : row.sentiment === '부정' ? '#fde8e8' : '#f3f3f3',
                        color: row.sentiment === '긍정' ? '#2e7d32' : row.sentiment === '부정' ? '#c62828' : '#888',
                      }}>{row.sentiment}</div>
                    )}
                  </td>
                  <td>{row.media_type}</td>
                  <td style={{ textAlign: 'left' }}>
                    {row.link ? (
                      <a className='news-link' href={row.link} target='_blank' rel='noreferrer'>
                        {row.headline || row.link}
                      </a>
                    ) : (
                      <span>{row.headline}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.file_path ? (
                      <img
                        src={row.file_path.startsWith('/backend/') ? row.file_path : `/backend/uploads/news/${row.file_path.replace(/.*\//, '')}`}
                        alt={row.file_name ?? ''}
                        style={{ maxWidth: '8rem', maxHeight: '5.6rem', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid #eee', display: 'block', margin: '0 auto' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function typeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case '온라인':  return { bg: '#e8f4fd', text: '#0277bd' }
    case '지면':    return { bg: '#fff8e1', text: '#f57f17' }
    case '통신사':  return { bg: '#f3e5f5', text: '#6a1b9a' }
    default:        return { bg: '#f5f5f5', text: '#555' }
  }
}

export default MediaStatisticsPage
