import { useState } from 'react'
import Modal from '../../components/common/Modal'

interface EditData {
  id: string
  name: string
  email: string
  phone: string
}

interface ManagerAddModalProps {
  onClose: () => void
  editData?: EditData
}

function ManagerAddModal({ onClose, editData }: ManagerAddModalProps) {
  const isEdit = !!editData

  const [form, setForm] = useState({
    id: editData?.id ?? '',
    name: editData?.name ?? '',
    password: '',
    passwordConfirm: '',
    email: editData?.email ?? '',
    phone: editData?.phone ?? '',
  })

  const passwordMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <Modal title={isEdit ? '항목 수정' : '신규항목 추가'} onClose={onClose}>
      <div className='modal-form'>
        <div className='modal-field'>
          <label className='modal-label'>담당자 ID</label>
          <input className='modal-input' name='id' autoComplete='off' value={form.id} onChange={handleChange} readOnly={isEdit} />
        </div>
        <div className='modal-field'>
          <label className='modal-label'>이름</label>
          <input className='modal-input' name='name' autoComplete='off' value={form.name} onChange={handleChange} />
        </div>
        <div className='modal-field'>
          <label className='modal-label'>PASSWORD</label>
          <input className='modal-input' type='password' name='password' autoComplete='new-password' placeholder={isEdit ? '변경 시 입력' : ''} value={form.password} onChange={handleChange} />
        </div>
        <div className='modal-field-wrap'>
          <div className='modal-field'>
            <label className='modal-label'>PASSWORD 확인</label>
            <input
              className={`modal-input${passwordMismatch ? ' input-error' : ''}`}
              type='password'
              name='passwordConfirm'
              autoComplete='new-password'
              value={form.passwordConfirm}
              onChange={handleChange}
            />
          </div>
          {passwordMismatch && (
            <p className='modal-error'>*PASSWORD가 일치하지 않습니다.</p>
          )}
        </div>
        <div className='modal-field'>
          <label className='modal-label'>메일주소</label>
          <input className='modal-input' name='email' autoComplete='off' value={form.email} onChange={handleChange} />
        </div>
        <div className='modal-field'>
          <label className='modal-label'>비상연락망</label>
          <input className='modal-input' name='phone' autoComplete='off' value={form.phone} onChange={handleChange} />
        </div>
        <div className='modal-footer'>
          <button className='btn-primary'>저장</button>
        </div>
      </div>
    </Modal>
  )
}

export default ManagerAddModal
