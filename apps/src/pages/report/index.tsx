import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  serial: string
  manager: string | null
  reg_date: string
  reg_time: string | null
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
}

function ReportPage() {
  const user      = JSON.parse(sessionStorage.getItem('user') || '{}')
  const companyId = user.company_id || ''

  const [clients,       setClients]       = useState<ClientOption[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [companies,     setCompanies]     = useState<{ company_id: string; company_name: string }[]>([])
  const [data,          setData]          = useState<NewsRow[]>([])
  const [filtered,      setFiltered]      = useState<NewsRow[]>([])
  const [loading,       setLoading]       = useState(false)

  const [companyFilter,   setCompanyFilter]   = useState('')
  const [clientFilterId,  setClientFilterId]  = useState('')
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  const [categoryFilter,  setCategoryFilter]  = useState<string[]>([])
  const [mediaTypeFilter, setMediaTypeFilter] = useState('전체')

  useEffect(() => {
    const url = user.user_type === 'super_admin'
      ? `${API}/clients.php`
      : `${API}/clients.php?company_id=${encodeURIComponent(companyId)}`
    fetch(url).then(r => r.json()).then(res => { if (res.success) setClients(res.data) })
    if (user.user_type === 'super_admin') {
      fetch(`${API}/companies.php`).then(r => r.json()).then(res => { if (res.success) setCompanies(res.data) })
    }
  }, [])

  const loadAndSearch = () => {
    setLoading(true)
    const url = user.user_type === 'super_admin'
      ? `${API}/news.php`
      : `${API}/news.php?company_id=${encodeURIComponent(companyId)}`
    fetch(url)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const all = res.data as NewsRow[]
          setData(all)
          handleSearch(all)
        }
      })
      .finally(() => setLoading(false))
  }

  const handleCompanyFilter = (cid: string) => {
    setCompanyFilter(cid)
    setClientFilterId('')
    setCategoryFilter([])
    setAllCategories([])
  }

  const filteredClients = companyFilter
    ? clients.filter(c => c.company_id === companyFilter)
    : clients

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

  const BASE_URL = window.location.origin

  const handleSearch = (all = data) => {
    let result = [...all]
    if (companyFilter)   result = result.filter(r => r.company_id === companyFilter)
    if (clientFilterId)  result = result.filter(r => r.client_id === Number(clientFilterId))
    if (dateFrom)        result = result.filter(r => (r.reg_date ?? '') >= dateFrom)
    if (dateTo)          result = result.filter(r => (r.reg_date ?? '') <= dateTo)
    if (categoryFilter.length > 0) {
      result = result.filter(r => {
        const cats = (r.categories || '').split(',').map(c => c.trim())
        return categoryFilter.some(cf => cats.includes(cf))
      })
    }
    if (mediaTypeFilter !== '전체') result = result.filter(r => r.media_type === mediaTypeFilter)
    setFiltered(result)
  }

  const handleReset = () => {
    setCompanyFilter(''); setClientFilterId(''); setDateFrom(''); setDateTo('')
    setCategoryFilter([]); setMediaTypeFilter('전체'); setAllCategories([])
    setFiltered(data)
  }

  const printTemplate = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 1.2rem; padding: 2rem; }
  h1 { font-size: 1.8rem; margin-bottom: 1.6rem; color: #222; border-bottom: 2px solid #5559F1; padding-bottom: 0.8rem; }
  table { width: 100%; border-collapse: collapse; font-size: 1.2rem; }
  th { background: #5559F1; color: #fff; padding: 0.8rem 1rem; text-align: center; }
  td { padding: 0.7rem 1rem; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle; }
  a { color: #5559F1; text-decoration: none; }
  @media print { body { padding: 0; } }
  html { font-size: 10px; }
</style></head>
<body><h1>${title}</h1>${body}</body></html>`

  const openPrint = (html: string) => {
    const w = window.open('', '_blank', 'width=1100,height=800')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  const handlePrintA = () => {
    const headers = ['날짜', '매체명', '헤드라인', 'URL']
    const rows = filtered.map(r => [
      r.reg_date ?? '',
      r.media_name ?? '',
      r.headline ?? '',
      r.link ?? '',
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // 헤더 행 중앙정렬
    headers.forEach((_, c) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c })
      if (ws[cellRef]) {
        ws[cellRef].s = { alignment: { horizontal: 'center', vertical: 'center' } }
      }
    })

    // URL 컬럼에 하이퍼링크 적용
    filtered.forEach((r, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 3 })
      if (r.link && ws[cellRef]) {
        ws[cellRef].l = { Target: r.link, Tooltip: r.link }
      }
    })

    ws['!cols'] = [
      { wch: 12 }, // 날짜
      { wch: 20 }, // 매체명
      { wch: 60 }, // 헤드라인
      { wch: 80 }, // URL
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '기사목록')

    // 파일명: (담당업체명)클라이언트명_뉴스클리핑_년월일
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const selectedClient = clients.find(cl => String(cl.id) === clientFilterId)
    const clientName = selectedClient?.company_name || ''
    let companyName = ''
    if (user.user_type === 'super_admin') {
      const managingCompanyId = selectedClient?.company_id || companyFilter
      companyName = companies.find(c => c.company_id === managingCompanyId)?.company_name || ''
    } else {
      companyName = user.company_name || ''
    }
    const prefix = companyName && clientName
      ? `(${companyName})${clientName}`
      : clientName || companyName || '전체'
    XLSX.writeFile(wb, `${prefix}_출력A_뉴스클리핑_${today}.xlsx`)
  }

  const handlePrintB = () => {
    const selectedClient = clients.find(cl => String(cl.id) === clientFilterId)
    const clientLabel = selectedClient?.company_name || ''
    let companyLabel = ''
    if (user.user_type === 'super_admin') {
      const cid = selectedClient?.company_id || companyFilter
      companyLabel = companies.find(c => c.company_id === cid)?.company_name || ''
    } else {
      companyLabel = user.company_name || ''
    }
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const displayDate = `${new Date().getFullYear()}.${String(new Date().getMonth()+1).padStart(2,'0')}.${String(new Date().getDate()).padStart(2,'0')}`
    const titleLabel = clientLabel || companyLabel || '뉴스'
    const docTitle = `${titleLabel} 뉴스 클리핑 [${displayDate}]`

    // 기사분류별 그룹핑
    const map: Record<string, NewsRow[]> = {}
    filtered.forEach(r => {
      const cats = (r.categories || '미지정').split(',').map(c => c.trim())
      cats.forEach(cat => { if (!map[cat]) map[cat] = []; map[cat].push(r) })
    })

    let no = 1
    const sectionColors = ['#1a3a6b','#2e6b3e','#7b2d00','#4a2080','#005f6b','#6b4a00']
    let colorIdx = 0
    const sections = Object.entries(map).map(([cat, items]) => {
      const color = sectionColors[colorIdx++ % sectionColors.length]
      const rows = items.map(r => `
        <tr>
          <td style="text-align:center;width:4%">${no++}</td>
          <td style="width:14%">${r.media_name ?? ''}</td>
          <td style="text-align:left">${r.link ? `<a href="${r.link}" target="_blank">${r.headline ?? r.link}</a>` : (r.headline ?? '')}</td>
        </tr>`).join('')
      return `
        <div class="section">
          <div class="section-header" style="background:${color}">▶ ${cat}</div>
          <table>
            <thead><tr><th style="width:4%">연번</th><th style="width:14%">매체</th><th>제 목</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${docTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 10px; }
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 1.3rem; padding: 2.4rem; color: #222; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 2rem; }
  .section { margin-bottom: 2rem; }
  .section-header { color: #fff; font-weight: 700; font-size: 1.4rem; padding: 0.6rem 1rem; margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 1.25rem; }
  th { background: #dce3ef; color: #222; padding: 0.6rem 0.8rem; text-align: center; border: 1px solid #bbb; }
  td { padding: 0.55rem 0.8rem; border: 1px solid #ddd; vertical-align: middle; }
  a { color: #222; text-decoration: none; }
  @media print { body { padding: 0.5cm 1cm; } .section { page-break-inside: avoid; } }
</style></head>
<body>
  <h1>${docTitle}</h1>
  ${sections}
</body></html>`

    const prefix = companyLabel && clientLabel ? `(${companyLabel})${clientLabel}` : clientLabel || companyLabel || '전체'
    const fileName = `${prefix}_출력B_뉴스클리핑_${today}.pdf`

    // 숨겨진 iframe에 렌더링 후 html2canvas → jsPDF 저장
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:800px;border:none;'
    document.body.appendChild(iframe)
    const iDoc = iframe.contentDocument!
    iDoc.open()
    iDoc.write(html)
    iDoc.close()
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(iDoc.body, { scale: 1.5, useCORS: true, windowWidth: 1100 })
        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        const imgW = pageW
        const imgH = (canvas.height * pageW) / canvas.width
        let y = 0
        let remaining = imgH
        let first = true
        while (remaining > 0) {
          if (!first) pdf.addPage()
          const sliceH = Math.min(pageH, remaining)
          pdf.addImage(imgData, 'JPEG', 0, -y, imgW, imgH)
          pdf.setFillColor(255, 255, 255)
          if (remaining > pageH) pdf.rect(0, sliceH, pageW, imgH, 'F')
          y += pageH
          remaining -= pageH
          first = false
        }
        pdf.save(fileName)
      } finally {
        document.body.removeChild(iframe)
      }
    }, 600)
  }

  const handlePrintC = () => {
    // 기사분류별로 그룹핑
    const selectedClient = clients.find(cl => String(cl.id) === clientFilterId)
    const clientLabel = selectedClient?.company_name || ''
    let companyLabel = ''
    if (user.user_type === 'super_admin') {
      const cid = selectedClient?.company_id || companyFilter
      companyLabel = companies.find(c => c.company_id === cid)?.company_name || ''
    } else {
      companyLabel = user.company_name || ''
    }
    const title = companyLabel ? `${companyLabel} 뉴스 모니터링` : `${clientLabel} 뉴스 모니터링`
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const displayDate = `Date : ${new Date().getFullYear()}.${String(new Date().getMonth()+1).padStart(2,'0')}.${String(new Date().getDate()).padStart(2,'0')}`

    const map: Record<string, NewsRow[]> = {}
    filtered.forEach(r => {
      const cats = (r.categories || '미지정').split(',').map(c => c.trim())
      cats.forEach(cat => { if (!map[cat]) map[cat] = []; map[cat].push(r) })
    })

    const wb = XLSX.utils.book_new()
    const aoa: any[][] = []

    // 타이틀 행
    aoa.push([title, '', '', '', '', '', displayDate])
    aoa.push([])

    // 기사분류별 섹션
    Object.entries(map).forEach(([cat, items]) => {
      // 섹션 헤더 (기사분류명)
      aoa.push([cat])
      // 컬럼 헤더
      aoa.push(['NO.', 'Date', 'Headline', 'Media', 'Media Type', '기자명', 'URL'])
      // 데이터 행
      items.forEach((r, i) => {
        aoa.push([i + 1, r.reg_date ?? '', r.headline ?? '', r.media_name ?? '', r.media_type ?? '', r.journalist ?? '', r.link ?? ''])
      })
      aoa.push([])
    })

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    // URL 하이퍼링크 적용
    let rowIdx = 2
    Object.entries(map).forEach(([, items]) => {
      rowIdx += 2 // 섹션헤더 + 컬럼헤더
      items.forEach(r => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 6 })
        if (r.link && ws[cellRef]) ws[cellRef].l = { Target: r.link, Tooltip: r.link }
        rowIdx++
      })
      rowIdx++ // 빈 행
    })

    ws['!cols'] = [
      { wch: 6 },  // NO
      { wch: 12 }, // Date
      { wch: 60 }, // Headline
      { wch: 20 }, // Media
      { wch: 12 }, // Media Type
      { wch: 10 }, // 기자명
      { wch: 80 }, // URL
    ]

    const prefix = companyLabel && clientLabel ? `(${companyLabel})${clientLabel}` : clientLabel || companyLabel || '전체'
    XLSX.utils.book_append_sheet(wb, ws, '뉴스모니터링')
    XLSX.writeFile(wb, `${prefix}_출력C_뉴스클리핑_${today}.xlsx`)
  }

  const handleMediaReport = () => {
    // 날짜+기사분류 조합으로 컬럼 헤더 생성
    const dateCatSet = new Set<string>()
    filtered.forEach(r => {
      const d = r.reg_date ? r.reg_date.slice(5).replace('-', '/') : ''
      const cats = (r.categories || '').split(',').map(c => c.trim()).filter(Boolean)
      if (cats.length > 0) {
        cats.forEach(cat => dateCatSet.add(`${d} ${cat}`))
      } else {
        dateCatSet.add(d)
      }
    })
    const dateCols = [...dateCatSet].sort()

    // 매체명+기자명 기준 행 구성
    const rowMap: Record<string, { media: string; manager: string; counts: Record<string, number> }> = {}
    filtered.forEach(r => {
      const media = r.media_name || '미지정'
      const manager = r.journalist || ''
      const key = `${media}__${manager}`
      if (!rowMap[key]) rowMap[key] = { media, manager, counts: {} }
      const d = r.reg_date ? r.reg_date.slice(5).replace('-', '/') : ''
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

    // 헤더
    aoa.push(['매체명', '기자명', ...dateCols])

    // 데이터 행
    Object.values(rowMap)
      .sort((a, b) => a.media.localeCompare(b.media) || a.manager.localeCompare(b.manager))
      .forEach(row => {
        aoa.push([row.media, row.manager, ...dateCols.map(col => row.counts[col] || 0)])
      })

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [
      { wch: 20 }, // 매체명
      { wch: 12 }, // 기자명
      ...dateCols.map(() => ({ wch: 12 })),
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '매체별노출리포트')

    const selectedClient = clients.find(cl => String(cl.id) === clientFilterId)
    const clientLabel = selectedClient?.company_name || ''
    let companyLabel = ''
    if (user.user_type === 'super_admin') {
      const cid = selectedClient?.company_id || companyFilter
      companyLabel = companies.find(c => c.company_id === cid)?.company_name || ''
    } else {
      companyLabel = user.company_name || ''
    }
    const prefix = companyLabel && clientLabel ? `(${companyLabel})${clientLabel}` : clientLabel || companyLabel || '전체'
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    XLSX.writeFile(wb, `${prefix}_매체별노출리포트_뉴스클리핑_${today}.xlsx`)
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>리포트</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>리포트</span>
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
              <span className='filter-label'>기간</span>
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
              <button className='btn-primary' onClick={loadAndSearch} disabled={loading || !clientFilterId}>조회</button>
              <button className='btn-secondary' onClick={handleReset}>초기화</button>
            </div>
          </div>
        </div>
      </div>

      {/* 출력 버튼 */}
      <div className='content-card'>
        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className='btn-primary' onClick={handlePrintA} disabled={filtered.length === 0 || loading || !clientFilterId}>출력 A</button>
          <button className='btn-primary' onClick={handlePrintB} disabled={filtered.length === 0 || loading || !clientFilterId}>출력 B</button>

          <button className='btn-primary' onClick={handlePrintC} disabled={filtered.length === 0 || loading || !clientFilterId}>출력 C</button>
          <button className='btn-primary' onClick={handleMediaReport} disabled={filtered.length === 0 || loading || !clientFilterId}>매체별 뉴스 노출 리포트</button>
          {loading && <span style={{ fontSize: '1.3rem', color: '#999' }}>로딩 중...</span>}
          {!loading && filtered.length > 0 && <span style={{ fontSize: '1.3rem', color: '#555' }}>총 <strong>{filtered.length}</strong>건</span>}
        </div>
      </div>

      {/* 조회 결과 목록 */}
      {(filtered.length > 0 || loading) && (
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
                <th>뉴스매체</th>
                <th>기사분류</th>
                <th>미디어 Type</th>
                <th>기사 Headline / 링크</th>
                <th>이미지</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id}>
                  <td>{row.reg_date}{row.reg_time ? ` ${row.reg_time}` : ''}</td>
                  <td>{row.manager}</td>
                  <td>{row.client_name}</td>
                  <td>{row.media_name}</td>
                  <td>{row.categories}</td>
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
                        src={`${BASE_URL}/${row.file_path.replace(/^\//, '')}`}
                        alt={row.file_name ?? ''}
                        style={{ maxWidth: '8rem', maxHeight: '5.6rem', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid #eee', display: 'block', margin: '0 auto' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : row.file_name ? (
                      <span style={{ fontSize: '1.2rem', color: '#888' }}>파일</span>
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

export default ReportPage
