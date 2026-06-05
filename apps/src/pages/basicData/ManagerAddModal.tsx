import { useState } from 'react'
import Modal from '../../components/common/Modal'

interface EditData {
  id: number
  manager_id: string
  name: string
  email: string
  phone: string
}

interface ManagerAddModalProps {
  onClose: () => void
  onSaved: () => void
  editData?: EditData
}

function ManagerAddModal({ onClose, onSaved, editData }: ManagerAddModalProps) {
  const isEdit = !!editData
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [form, setForm] = useState({
    manager_id:      editData?.manager_id ?? '',
    name:            editData?.name       ?? '',
    password:        '',
    passwordConfirm: '',
    email:           editData?.email      ?? '',
    phone:           editData?.phone      ?? '',
  })
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  const passwordMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSave = async () => {
    if (!form.manager_id)  { setError('담당자 ID는 필수입니다'); return }
    if (!form.name)        { setError('이름은 필수입니다'); return }
    if (!isEdit && !form.password) { setError('비밀번호를 입력하세요'); return }
    if (form.password && form.password !== form.passwordConfirm) { setError('비밀번호가 일치하지 않습니다'); return }
    if (!form.phone)       { setError('비상연락망은 필수입니다'); return }

    setSaving(true)
    try {
      const body: Record<string, string | number> = {
        company_id: user.company_id,
        manager_id: form.manager_id,
        name:       form.name,
        email:      form.email,
        phone:      form.phone,
      }
      if (form.password) body.password = form.password

      let url = '/api/managers.php'
      let method = 'POST'
      if (isEdit) {
        body.id = editData!.id
        method = 'PUT'
      }

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { onSaved(); onClose() }
      else setError(data.message || '저장 실패')
    } catch {
      setError('서버에 연결할 수 없습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? '항목 수정' : '신규항목 추가'} onClose={onClose}>
      <div className='modal-form'>
        <div className='modal-field'>
          <label className='modal-label'>담당자 ID *</label>
          <input className='modal-input' name='manager_id' autoComplete='off'
            value={form.manager_id} onChange={handleChange} readOnly={isEdit} />
        </div>
        <div className='modal-field'>
          <label className='modal-label'>이름 *</label>
          <input className='modal-input' name='name' autoComplete='off'
            value={form.name} onChange={handleChange} />
        </div>
        <div className='modal-field'>
          <label className='modal-label'>PASSWORD *</label>
          <input className='modal-input' type='password' name='password'
            autoComplete='new-password' placeholder={isEdit ? '변경 시 입력' : ''}
            value={form.password} onChange={handleChange} />
        </div>
        <div className='modal-field-wrap'>
          <div className='modal-field'>
            <label className='modal-label'>PASSWORD 확인 *</label>
            <input
              className={`modal-input${passwordMismatch ? ' input-error' : ''}`}
              type='password' name='passwordConfirm' autoComplete='new-password'
              value={form.passwordConfirm} onChange={handleChange}
            />
          </div>
          {passwordMismatch && <p className='modal-error'>*PASSWORD가 일치하지 않습니다.</p>}
        </div>
        <div className='modal-field'>
          <label className='modal-label'>메일주소</label>
          <input className='modal-input' name='email' autoComplete='off'
            value={form.email} onChange={handleChange} />
        </div>
        <div className='modal-field'>
          <label className='modal-label'>비상연락망 *</label>
          <input className='modal-input' name='phone' autoComplete='off'
            value={form.phone} onChange={handleChange} />
        </div>
        {error && <p className='modal-error'>{error}</p>}
        <div className='modal-footer'>
          <button className='btn-primary' onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ManagerAddModal
