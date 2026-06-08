import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/common/Modal'

const API = '/api'
const PAGE_SIZE = 100
// const DAILY_FETCH_LIMIT = 100
// const DAILY_FETCH_KEY = 'naverFetchDaily'

// function getDailyFetchCount(): number {
//   try {
//     const raw = localStorage.getItem(DAILY_FETCH_KEY)
//     if (!raw) return 0
//     const parsed = JSON.parse(raw)
//     const today = new Date().toISOString().slice(0, 10)
//     if (parsed.date !== today) return 0
//     return parsed.count ?? 0
//   } catch { return 0 }
// }

// function addDailyFetchCount(n: number): number {
//   const today = new Date().toISOString().slice(0, 10)
//   const current = getDailyFetchCount()
//   const next = Math.min(DAILY_FETCH_LIMIT, current + n)
//   localStorage.setItem(DAILY_FETCH_KEY, JSON.stringify({ date: today, count: next }))
//   return next
// }

// ── 네이버 뉴스 가져오기 모달 ─────────────────────────────
interface FetchedItem {
  title: string
  link: string
  description: string
  pub_date: string
  source: string
  _checked?: boolean
}

function NaverFetchModal({ onClose, onImport, companies, isSuperAdmin, allClients }: {
  onClose: () => void
  onImport: (items: FetchedItem[], targetCompanyId: string, opts: { clientId: string; clientName: string; categories: string; mediaCode: string; mediaName: string }) => void
  companies: { company_id: string; company_name: string }[]
  isSuperAdmin: boolean
  allClients: ClientOption[]
}) {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [query,   setQuery]   = useState('')
  const [sort,    setSort]    = useState<'date'|'sim'>('date')
  const [items,   setItems]   = useState<FetchedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [start,   setStart]   = useState(1)
  const [total,   setTotal]   = useState(0)
  // const [dailyCount, setDailyCount] = useState(getDailyFetchCount)
  const [targetCompanyId, setTargetCompanyId] = useState(isSuperAdmin ? '' : (user.company_id || ''))
  const inputRef = useRef<HTMLInputElement>(null)

  // 클라이언트/매체/기사분류 선택
  const [selClientId,   setSelClientId]   = useState('')
  const [selCategories, setSelCategories] = useState<string[]>([])
  const [selMediaCode,  setSelMediaCode]  = useState('')
  const [selMediaName,  setSelMediaName]  = useState('')
  const [modalClients,  setModalClients]  = useState<ClientOption[]>([])
  const [modalCategories, setModalCategories] = useState<string[]>([])
  const [modalMediaList,  setModalMediaList]  = useState<{ media_code: string; media_name: string }[]>([])

  useEffect(() => { inputRef.current?.focus() }, [])

  // 담당업체 변경 시 클라이언트/매체 재로드
  useEffect(() => {
    if (!targetCompanyId) { setModalClients([]); setModalMediaList([]); setSelClientId(''); setSelCategories([]); setSelMediaCode(''); setSelMediaName(''); return }
    const filtered = allClients.filter(c => c.company_id === targetCompanyId)
    setModalClients(filtered)
    setSelClientId(''); setSelCategories([])
    fetch(`${API}/media.php?company_id=${encodeURIComponent(targetCompanyId)}`)
      .then(r => r.json())
      .then(res => { if (res.success) setModalMediaList(res.data) })
      .catch(() => {})
  }, [targetCompanyId, allClients])

  // 클라이언트 변경 시 기사분류 로드
  useEffect(() => {
    setSelCategories([])
    if (!selClientId) { setModalCategories([]); return }
    const cl = modalClients.find(c => String(c.id) === selClientId)
    const cid = cl?.company_id || targetCompanyId
    fetch(`${API}/clients.php?company_id=${encodeURIComponent(cid)}&id=${selClientId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.categories) {
          setModalCategories(res.data.categories.map((c: { name: string }) => c.name))
        } else setModalCategories([])
      })
      .catch(() => setModalCategories([]))
  }, [selClientId])

  // 클라이언트명 + 선택된 기사분류 + 입력 검색어를 조합
  const buildSearchQuery = () => {
    const parts: string[] = []
    if (selClientId) {
      const cl = modalClients.find(c => String(c.id) === selClientId)
      if (cl?.company_name) parts.push(cl.company_name)
    }
    if (selCategories.length > 0) parts.push(...selCategories)
    if (query.trim()) parts.push(query.trim())
    return parts.join(' ')
  }

  const search = (s = 1) => {
    const combinedQuery = buildSearchQuery()
    if (!combinedQuery) return
    // const current = getDailyFetchCount()
    // const remaining = DAILY_FETCH_LIMIT - current
    // if (remaining <= 0) {
    //   setError(`오늘 검색 가능한 뉴스 수(${DAILY_FETCH_LIMIT}개)를 모두 사용했습니다. 내일 다시 시도해주세요.`)
    //   return
    // }
    const display = 20 // Math.min(20, remaining)
    setLoading(true)
    setError('')
    fetch(`${API}/news-fetch.php?query=${encodeURIComponent(combinedQuery)}&display=${display}&start=${s}&sort=${sort}`)
      .then(r => r.json())
      .then(res => {
        if (!res.success) { setError(res.message ?? '오류'); return }
        const fetched: FetchedItem[] = res.items.map((it: FetchedItem) => ({ ...it, _checked: false }))
        // const newCount = addDailyFetchCount(fetched.length)
        // setDailyCount(newCount)
        setItems(s === 1 ? fetched : prev => [...prev, ...fetched])
        setTotal(res.total)
        setStart(s + display)
      })
      .catch(() => setError('API 호출 실패'))
      .finally(() => setLoading(false))
  }

  const toggle = (i: number) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, _checked: !it._checked } : it))

  const toggleAll = (checked: boolean) =>
    setItems(prev => prev.map(it => ({ ...it, _checked: checked })))

  const checkedItems = items.filter(it => it._checked)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search(1)
  }

  const canSearch = !!buildSearchQuery() // && dailyCount < DAILY_FETCH_LIMIT

  return (
    <Modal title='네이버 뉴스 가져오기' onClose={onClose}>
      <div className='modal-form'>

        {/* 담당업체 (super_admin만) */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.4rem', color: '#555', whiteSpace: 'nowrap', width: '8rem', flexShrink: 0 }}>담당업체 <span style={{ color: '#e53e3e' }}>*</span></span>
            <select
              className={`modal-input${isSuperAdmin && !targetCompanyId ? ' input-error' : ''}`}
              value={targetCompanyId}
              onChange={e => setTargetCompanyId(e.target.value)}
            >
              <option value=''>선택하세요</option>
              {companies.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 클라이언트 / 뉴스매체 선택 */}
        {targetCompanyId && (
          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '20rem' }}>
              <span style={{ fontSize: '1.3rem', color: '#555', whiteSpace: 'nowrap', width: '7rem', flexShrink: 0 }}>클라이언트</span>
              <select className='modal-input' value={selClientId} onChange={e => setSelClientId(e.target.value)} style={{ flex: 1 }}>
                <option value=''>선택 안함</option>
                {modalClients.map(c => <option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '20rem' }}>
              <span style={{ fontSize: '1.3rem', color: '#555', whiteSpace: 'nowrap', width: '7rem', flexShrink: 0 }}>뉴스매체</span>
              <select className='modal-input' value={selMediaCode} disabled={!selClientId} onChange={e => {
                const m = modalMediaList.find(m => m.media_code === e.target.value)
                setSelMediaCode(e.target.value); setSelMediaName(m?.media_name || '')
              }} style={{ flex: 1, opacity: selClientId ? 1 : 0.5, cursor: selClientId ? 'pointer' : 'not-allowed' }}>
                <option value=''>선택 안함</option>
                {modalMediaList.map(m => <option key={m.media_code} value={m.media_code}>{m.media_name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* 기사분류 선택 */}
        {selClientId && modalCategories.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.3rem', color: '#555', whiteSpace: 'nowrap', width: '7rem', flexShrink: 0, paddingTop: '0.4rem' }}>기사분류</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {modalCategories.map(cat => (
                <label key={cat} className='filter-checkbox-label'>
                  <input
                    type='checkbox'
                    className='filter-checkbox'
                    checked={selCategories.includes(cat)}
                    onChange={() => setSelCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 검색 바 */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <input
            ref={inputRef}
            className='modal-input'
            style={{ flex: 1 }}
            placeholder={selClientId ? '추가 검색어 (선택)' : '검색어 입력 후 Enter'}
            value={query}
            onChange={e => { setQuery(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
          />
          <select
            className='modal-input'
            style={{ flex: 'none', width: '11rem' }}
            value={sort}
            onChange={e => setSort(e.target.value as 'date'|'sim')}
          >
            <option value='date'>최신순</option>
            <option value='sim'>정확도순</option>
          </select>
          <button className='btn-primary' onClick={() => search(1)} disabled={loading || !canSearch} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            검색
          </button>
        </div>

        {/* 일별 사용량 표시 (주석 처리)
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '1.2rem', color: dailyCount >= DAILY_FETCH_LIMIT ? '#e53e3e' : '#888' }}>
          오늘 사용: <strong style={{ marginLeft: '0.3rem' }}>{dailyCount}</strong>&nbsp;/&nbsp;{DAILY_FETCH_LIMIT}개
          {dailyCount >= DAILY_FETCH_LIMIT && <span style={{ marginLeft: '0.5rem', color: '#e53e3e' }}>(오늘 한도 초과)</span>}
        </div>
        */}

        {error && <p className='modal-error' style={{ paddingLeft: 0 }}>{error}</p>}

        {/* 결과 헤더 */}
        {items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '1.3rem', color: '#555' }}>
            <span>총 <strong>{total.toLocaleString()}</strong>건 중 <strong>{items.length}</strong>건 표시</span>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type='checkbox'
                checked={items.length > 0 && items.every(it => it._checked)}
                onChange={e => toggleAll(e.target.checked)}
              />
              전체 선택
            </label>
          </div>
        )}

        {/* 결과 목록 */}
        {items.length > 0 && (
          <div style={{ border: '0.1rem solid #E4E4E4', borderRadius: '0.8rem', maxHeight: '36rem', overflowY: 'auto' }}>
            {items.map((it, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: '1.2rem', padding: '1rem 1.6rem',
                  borderBottom: i < items.length - 1 ? '0.1rem solid #F0F0F0' : 'none',
                  background: it._checked ? '#F0F7FF' : 'white',
                  cursor: 'pointer',
                }}
                onClick={() => toggle(i)}
              >
                <input
                  type='checkbox'
                  checked={!!it._checked}
                  onChange={() => toggle(i)}
                  onClick={e => e.stopPropagation()}
                  style={{ marginTop: '0.3rem', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '1.4rem', color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.title}
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#888', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.source}&nbsp;·&nbsp;{it.pub_date ? new Date(it.pub_date).toLocaleDateString('ko-KR') : ''}
                  </div>
                  {it.description && (
                    <div style={{ fontSize: '1.2rem', color: '#555', marginTop: '0.3rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {it.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 더 불러오기 */}
        {items.length > 0 && items.length < total && (
          <button className='btn-secondary' style={{ width: '100%' }} onClick={() => search(start)} disabled={loading}>
            {loading ? '로딩 중...' : '더 불러오기'}
          </button>
        )}
        {/* 한도 초과 메시지 (주석 처리)
        {items.length > 0 && items.length < total && dailyCount >= DAILY_FETCH_LIMIT && (
          <p style={{ textAlign: 'center', padding: '1rem 0', color: '#e53e3e', fontSize: '1.3rem' }}>
            오늘 검색 가능한 뉴스 수({DAILY_FETCH_LIMIT}개)를 모두 사용했습니다. 내일 다시 시도해주세요.
          </p>
        )}
        */}

        {loading && items.length === 0 && (
          <p style={{ textAlign: 'center', padding: '3rem 0', color: '#888', fontSize: '1.4rem' }}>검색 중...</p>
        )}
        {!loading && items.length === 0 && query && (
          <p style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '1.4rem' }}>검색 결과가 없습니다.</p>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className='modal-footer' style={{ gap: '1rem' }}>
        <button className='btn-secondary' onClick={onClose}>닫기</button>
        <button
          className='btn-primary'
          disabled={checkedItems.length === 0 || (isSuperAdmin && !targetCompanyId)}
          onClick={() => {
            const cl = modalClients.find(c => String(c.id) === selClientId)
            onImport(checkedItems, targetCompanyId, {
              clientId:   selClientId,
              clientName: cl?.company_name || '',
              categories: selCategories.join(','),
              mediaCode:  selMediaCode,
              mediaName:  selMediaName,
            })
            onClose()
          }}
        >
          선택 가져오기 ({checkedItems.length})
        </button>
      </div>
    </Modal>
  )
}

interface NewsRow {
  id: number
  serial: string
  manager: string
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
  manager_user_id: string | null
}

interface ClientOption {
  id: number
  client_code: string
  company_name: string
  company_id: string
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
  const [companies,     setCompanies]     = useState<{ company_id: string; company_name: string }[]>([])

  // 체크박스 다중선택
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const toggleCheck = (id: number) =>
    setCheckedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? new Set(pageData.map(r => r.id)) : new Set())

  // 네이버 뉴스 가져오기 모달
  const [showFetchModal, setShowFetchModal] = useState(false)

  // 필터 상태
  const [companyFilter,   setCompanyFilter]   = useState('')
  const [clientFilterId,  setClientFilterId]  = useState('')
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  const [categoryFilter,  setCategoryFilter]  = useState<string[]>([])
  const [mediaTypeFilter, setMediaTypeFilter] = useState('전체')

  // 클라이언트 목록 로드 (super_admin은 전체, 그 외 company_id 기준)
  useEffect(() => {
    const url = user.user_type === 'super_admin'
      ? `${API}/clients.php`
      : `${API}/clients.php?company_id=${encodeURIComponent(companyId)}`
    fetch(url)
      .then(r => r.json())
      .then(res => { if (res.success) setClients(res.data) })
    if (user.user_type === 'super_admin') {
      fetch(`${API}/companies.php`)
        .then(r => r.json())
        .then(res => { if (res.success) setCompanies(res.data) })
    }
  }, [])

  // 담당업체 변경 시 클라이언트 필터 초기화
  const handleCompanyFilter = (cid: string) => {
    setCompanyFilter(cid)
    setClientFilterId('')
    setCategoryFilter([])
    setAllCategories([])
  }

  // 담당업체 필터 기준으로 클라이언트 목록 필터링
  const filteredClients = companyFilter
    ? clients.filter(c => c.company_id === companyFilter)
    : clients

  // 클라이언트 선택 시 해당 기사분류 로드
  useEffect(() => {
    setCategoryFilter([])
    if (!clientFilterId) { setAllCategories([]); return }
    // 선택된 클라이언트의 실제 company_id 사용 (super_admin은 다른 업체 클라이언트일 수 있음)
    const selectedClient = clients.find(cl => String(cl.id) === clientFilterId)
    const cid = (selectedClient as any)?.company_id || companyId
    fetch(`${API}/clients.php?company_id=${encodeURIComponent(cid)}&id=${clientFilterId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.categories) {
          setAllCategories(res.data.categories.map((c: { id: number; name: string }) => c.name))
        } else {
          setAllCategories([])
        }
      })
  }, [clientFilterId, clients])

  // 뉴스 목록 로드 (super_admin은 전체, 그 외 company_id 기준)
  const loadNews = () => {
    setLoading(true)
    const url = user.user_type === 'super_admin'
      ? `${API}/news.php`
      : `${API}/news.php?company_id=${encodeURIComponent(companyId)}`
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(res => { if (res.success) setData(res.data) })
      .catch(err => console.error('뉴스 목록 로드 실패:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadNews() }, [])

  // 필터 적용
  const applyFilters = (rows: NewsRow[]) => {
    let result = [...rows]
    if (companyFilter)   result = result.filter(r => r.company_id === companyFilter)
    if (clientFilterId)  result = result.filter(r => r.client_id === Number(clientFilterId))
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

  const deleteUrl = (id: number) =>
    user.user_type === 'super_admin'
      ? `${API}/news.php?id=${id}`
      : `${API}/news.php?id=${id}&company_id=${encodeURIComponent(companyId)}`

  const handleDelete = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    fetch(deleteUrl(id), { method: 'DELETE' })
      .then(r => r.json())
      .then(res => {
        if (res.success) { setCheckedIds(new Set()); loadNews() }
        else alert('삭제에 실패했습니다.')
      })
  }

  const handleDeleteSelected = async () => {
    if (checkedIds.size === 0) return
    if (!window.confirm(`선택한 ${checkedIds.size}건을 삭제하시겠습니까?`)) return
    for (const id of Array.from(checkedIds)) {
      await fetch(deleteUrl(id), { method: 'DELETE' })
    }
    setCheckedIds(new Set())
    loadNews()
  }

  // 네이버에서 선택한 뉴스 일괄 등록
  const handleImport = async (items: FetchedItem[], targetCompanyId: string, opts: { clientId: string; clientName: string; categories: string; mediaCode: string; mediaName: string }) => {
    const cid = user.user_type === 'super_admin' ? targetCompanyId : companyId
    const managerLabel = user.user_type === 'super_admin'
      ? (companies.find(c => c.company_id === targetCompanyId)?.company_name || targetCompanyId)
      : user.user_type === 'manager'
        ? (user.name || user.user_id || '')
        : (user.company_name || user.user_id || '')
    let successCount = 0
    for (const item of items) {
      const fd = new FormData()
      const pubDate = item.pub_date ? new Date(item.pub_date) : new Date()
      fd.append('company_id',       cid)
      fd.append('manager',           managerLabel)
      fd.append('manager_user_id',   user.user_id || '')
      fd.append('reg_date',   pubDate.toISOString().slice(0, 10))
      fd.append('reg_time',   pubDate.toTimeString().slice(0, 5))
      fd.append('media_code', opts.mediaCode)
      fd.append('headline',   item.title)
      fd.append('link',       item.link)
      fd.append('media_type', '온라인')
      if (opts.clientId)   { fd.append('client_id', opts.clientId); fd.append('client_name', opts.clientName) }
      if (opts.categories) fd.append('categories', opts.categories)

      // 대표이미지 + 한글 매체명 + 기자명 자동 가져오기
      let resolvedMediaName = opts.mediaName || ''
      if (item.link) {
        try {
          const imgRes = await fetch(`${API}/news-image.php?url=${encodeURIComponent(item.link)}`).then(r => r.json())
          // 이미지 성공 여부와 관계없이 media_name, journalist는 항상 적용
          if (imgRes.success && imgRes.file_name) {
            fd.append('file_name_saved', imgRes.file_name)
            fd.append('file_path_saved', imgRes.file_path)
          }
          if (imgRes.media_name) resolvedMediaName = imgRes.media_name
          if (imgRes.journalist) fd.append('journalist', imgRes.journalist)
        } catch {
          // 실패 시 무시
        }
      }
      // 최종 매체명: og:site_name > 선택한 매체명 순서, 영문 호스트명은 사용 안 함
      if (resolvedMediaName) fd.append('media_name', resolvedMediaName)

      const res = await fetch(`${API}/news.php`, { method: 'POST', body: fd }).then(r => r.json())
      if (res.success) successCount++
    }
    alert(`${successCount}건 등록되었습니다.`)
    loadNews()
  }

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const isAllChecked = pageData.length > 0 && pageData.every(r => checkedIds.has(r.id))

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
            {user.user_type === 'super_admin' && (
              <div className='filter-field'>
                <span className='filter-label'>담당업체</span>
                <select
                  className='filter-select'
                  value={companyFilter}
                  onChange={e => handleCompanyFilter(e.target.value)}
                >
                  <option value=''>전체</option>
                  {companies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
            )}
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
                {filteredClients.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.company_name}</option>
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
                  <span style={{ color: '#999', fontSize: '1.3rem' }}>
                    {clientFilterId ? '등록된 기사분류가 없습니다' : '클라이언트를 선택하면 표시됩니다'}
                  </span>
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
              <button className='btn-secondary' onClick={() => {
                setCompanyFilter('')
                setClientFilterId('')
                setDateFrom('')
                setDateTo('')
                setCategoryFilter([])
                setMediaTypeFilter('전체')
                setAllCategories([])
                setFiltered(data)
                setCurrentPage(1)
              }}>초기화</button>
            </div>
          </div>
        </div>
      </div>

      <div className='page-toolbar'>
        <button className='btn-secondary' onClick={() => setShowFetchModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
          </svg>
          뉴스 가져오기
        </button>
        <button className='btn-primary' onClick={() => navigate('/news-registration/new')}>뉴스등록</button>
        {checkedIds.size > 0 && user.user_type !== 'manager' && (
          <button className='btn-danger' onClick={handleDeleteSelected}>
            선택 삭제 ({checkedIds.size})
          </button>
        )}
      </div>

      {showFetchModal && (
        <NaverFetchModal
          onClose={() => setShowFetchModal(false)}
          onImport={handleImport}
          companies={companies}
          isSuperAdmin={user.user_type === 'super_admin'}
          allClients={clients}
        />
      )}

      {/* 목록 */}
      <div className='content-card'>
        <div className='table-count'>
          총 <strong>{filtered.length}</strong>건
          {loading && <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.85rem' }}>로딩 중...</span>}
        </div>
        <table className='data-table'>
          <thead>
            <tr>
              <th style={{ width: '3rem', textAlign: 'center' }}>
                {user.user_type !== 'manager' && (
                  <input type='checkbox' checked={isAllChecked} onChange={e => toggleAll(e.target.checked)} />
                )}
              </th>
              <th>등록일</th>
              <th>등록 담당자</th>
              <th>클라이언트</th>
              <th>뉴스매체</th>
              <th>기사분류</th>
              <th>미디어 type</th>
              <th>기사 Headline / 링크</th>
              <th>이미지</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && !loading && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
            {pageData.map(row => (
              <tr key={row.id} style={{ background: checkedIds.has(row.id) ? '#F0F7FF' : undefined }}>
                <td style={{ textAlign: 'center' }}>
                  {user.user_type !== 'manager' && (
                    <input type='checkbox' checked={checkedIds.has(row.id)} onChange={() => toggleCheck(row.id)} />
                  )}
                </td>
                <td>{row.reg_date}{row.reg_time ? ` ${row.reg_time}` : ''}</td>
                <td>{row.manager}</td>
                <td>{row.client_name}</td>
                <td>{row.media_name}</td>
                <td>{row.categories}</td>
                <td>{row.media_type}</td>
                <td style={{ textAlign: 'left' }}>
                  {row.link ? (
                    <a className='news-link' href={row.link} target='_blank' rel='noreferrer'>
                      {row.headline || (row.file_name ? '이미지/PDF' : row.link)}
                    </a>
                  ) : row.file_name ? (
                    <span>이미지/PDF</span>
                  ) : (
                    <span>{row.headline}</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {row.file_path ? (
                    <img
                      src={`${window.location.origin}/${row.file_path.replace(/^\//, '')}`}
                      alt={row.file_name ?? ''}
                      style={{ maxWidth: '8rem', maxHeight: '5.6rem', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid #eee', display: 'block', margin: '0 auto' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : null}
                </td>
                <td>
                  <div className='table-actions'>
                    <button
                      className='btn-icon'
                      title='편집'
                      onClick={() => navigate('/news-registration/edit', { state: { id: row.id, company_id: row.company_id ?? companyId } })}
                    >
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    {user.user_type !== 'manager' && (
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
                    )}
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
