import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

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

const CLIENT_OPTIONS = ['온라인', '오두기', '신협', '천재교육']
const MEDIA_OPTIONS = ['브릿지경제', '매일경제', '한국경제', '조선일보']
const JOURNALIST_OPTIONS = ['이병권', '김기자', '박기자']
const MEDIA_TYPE_OPTIONS = ['온라인', '지면', '통신사']
const CATEGORY_OPTIONS = ['신제품', '글로벌', 'ESG', '경쟁사']

function NewsAddPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const editData = location.state as NewsRow | null
  const isEdit = !!editData
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    serial: editData ? `2025${String(editData.id).padStart(8, '0')}` : '',
    manager: editData?.manager ?? '',
    regDate: editData?.regDate.split(' ')[0] ?? '',
    regTime: editData?.regDate.split(' ')[1] ?? '',
    client: editData?.client ?? '',
    media: editData ? MEDIA_OPTIONS[0] : '',
    journalist: editData ? JOURNALIST_OPTIONS[0] : '',
    categories: editData?.category ? [editData.category] : [] as string[],
    mediaType: editData?.mediaType ?? '',
    headline: editData?.headline.startsWith('http') ? editData.headline : '',
    link: editData?.link ?? '',
    fileName: '',
  })

  const handleCategoryToggle = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setForm(prev => ({ ...prev, fileName: file.name }))
  }

  return (
    <div className='page'>
      <div className='page-header'>
        <h2 className='page-title'>뉴스등록</h2>
        <nav className='breadcrumb'>
          <span className='breadcrumb-item'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10' />
            </svg>
            홈
          </span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item'>뉴스관리</span>
          <span className='breadcrumb-sep'>›</span>
          <span className='breadcrumb-item active'>{isEdit ? '뉴스수정' : '뉴스등록'}</span>
        </nav>
      </div>

      <div className='page-toolbar'>
        <button className='btn-primary' onClick={() => navigate('/news-registration')}>저장</button>
      </div>

      <div className='content-card'>
        <div className='news-form'>

          {/* SERIAL */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>SERIAL</span>
              <input className='nf-input nf-input-readonly' value={form.serial} readOnly />
            </div>
          </div>

          {/* 등록담당자 */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>등록 담당자</span>
              <input
                className='nf-input'
                value={form.manager}
                onChange={e => setForm(prev => ({ ...prev, manager: e.target.value }))}
              />
            </div>
          </div>

          {/* 등록일 */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>등록일</span>
              <div className='nf-date-group'>
                <div className='nf-date-wrap'>
                  <input
                    className='nf-input nf-input-date'
                    value={form.regDate}
                    onChange={e => setForm(prev => ({ ...prev, regDate: e.target.value }))}
                  />
                  <span className='nf-date-icon'>
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                      <rect x='3' y='4' width='18' height='18' rx='2' ry='2' />
                      <line x1='16' y1='2' x2='16' y2='6' />
                      <line x1='8' y1='2' x2='8' y2='6' />
                      <line x1='3' y1='10' x2='21' y2='10' />
                    </svg>
                  </span>
                </div>
                <input
                  className='nf-input nf-input-time'
                  value={form.regTime}
                  onChange={e => setForm(prev => ({ ...prev, regTime: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* 클라이언트 */}
          <div className='nf-row'>
            <div className='nf-field'>
              <span className='nf-label'>클라이언트</span>
              <select
                className='nf-select'
                value={form.client}
                onChange={e => setForm(prev => ({ ...prev, client: e.target.value }))}
              >
                {CLIENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* 뉴스매체 */}
          <div className='nf-row'>
            <div className='nf-field nf-field-media'>
              <span className='nf-label'>뉴스매체</span>
              <select
                className='nf-select'
                value={form.media}
                onChange={e => setForm(prev => ({ ...prev, media: e.target.value }))}
              >
                {MEDIA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button className='btn-dark'>저장</button>
              <select
                className='nf-select nf-select-journalist'
                value={form.journalist}
                onChange={e => setForm(prev => ({ ...prev, journalist: e.target.value }))}
              >
                {JOURNALIST_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button className='btn-dark'>저장</button>
            </div>
          </div>

          {/* 기사분류 */}
          <div className='nf-row'>
            <div className='nf-field nf-field-align-start'>
              <span className='nf-label'>기사분류</span>
              <div className='filter-checkbox-group'>
                {CATEGORY_OPTIONS.map(cat => (
                  <label key={cat} className='filter-checkbox-label'>
                    <input
                      type='checkbox'
                      className='filter-checkbox'
                      checked={form.categories.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 미디어 Type + 기사 Headline */}
          <div className='nf-row nf-row-2col'>
            <div className='nf-field'>
              <span className='nf-label'>미디어 Type</span>
              <select
                className='nf-select'
                value={form.mediaType}
                onChange={e => setForm(prev => ({ ...prev, mediaType: e.target.value }))}
              >
                {MEDIA_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className='nf-field'>
              <span className='nf-label'>기사 Head line</span>
              <input
                className='nf-input'
                value={form.headline}
                onChange={e => setForm(prev => ({ ...prev, headline: e.target.value }))}
                placeholder='기사 제목을 입력하세요'
              />
            </div>
          </div>

          {/* 기사 Link + 관련 문서/이미지 */}
          <div className='nf-row nf-row-2col'>
            <div className='nf-field'>
              <span className='nf-label'>기사 Link</span>
              <input
                className='nf-input'
                value={form.link}
                onChange={e => setForm(prev => ({ ...prev, link: e.target.value }))}
                placeholder='https://'
              />
            </div>
            <div className='nf-field'>
              <span className='nf-label'>관련 문서/이미지</span>
              <div className='nf-file-group'>
                <input
                  ref={fileInputRef}
                  type='file'
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept='image/*,.pdf,.doc,.docx'
                />
                <button className='btn-dark' onClick={() => fileInputRef.current?.click()}>파일 업로드</button>
                {form.fileName && <span className='nf-file-name'>{form.fileName}</span>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default NewsAddPage
