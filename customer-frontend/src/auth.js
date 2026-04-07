// CustomerAuth — 초기 설정 & 자동 로그인 (US-001, US-002)

import { login, NetworkError } from './api.js'

const Storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch (e) {
      console.warn('localStorage 저장 실패:', e)
    }
  },
  remove(key) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }
}

export { Storage }

// US-002: localStorage에 인증 정보가 있으면 자동 로그인 시도
export async function autoLogin(onSuccess, onFail) {
  const creds = Storage.get('tableCredentials')
  if (!creds || !creds.storeId || !creds.tableNumber || !creds.password) {
    onFail()
    return
  }
  try {
    const session = await login(creds.storeId, creds.tableNumber, creds.password)
    Storage.set('authSession', session)
    onSuccess(session)
  } catch {
    onFail('저장된 인증 정보로 로그인에 실패했습니다. 다시 설정해 주세요.')
  }
}

// US-001: 초기 설정 폼 이벤트 바인딩
export function initSetupForm(onSuccess) {
  const form = document.getElementById('setup-form')
  const storeIdInput = document.getElementById('store-id')
  const tableNumberInput = document.getElementById('table-number')
  const passwordInput = document.getElementById('table-password')
  const submitBtn = document.getElementById('setup-btn')
  const errorEl = document.getElementById('setup-error')

  function validateInputs() {
    const valid =
      storeIdInput.value.trim() !== '' &&
      tableNumberInput.value.trim() !== '' &&
      Number(tableNumberInput.value) > 0 &&
      passwordInput.value.trim() !== ''
    submitBtn.disabled = !valid
  }

  storeIdInput.addEventListener('input', validateInputs)
  tableNumberInput.addEventListener('input', validateInputs)
  passwordInput.addEventListener('input', validateInputs)

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.classList.add('hidden')
    errorEl.textContent = ''

    submitBtn.disabled = true
    submitBtn.textContent = '연결 중...'

    const storeId = storeIdInput.value.trim()
    const tableNumber = Number(tableNumberInput.value.trim())
    const password = passwordInput.value

    try {
      const session = await login(storeId, tableNumber, password)
      Storage.set('tableCredentials', { storeId, tableNumber, password })
      Storage.set('authSession', session)
      onSuccess(session)
    } catch (err) {
      const msg = err instanceof NetworkError
        ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
        : '인증 정보가 올바르지 않습니다. 다시 확인해 주세요.'
      errorEl.textContent = msg
      errorEl.classList.remove('hidden')
      passwordInput.value = ''
      submitBtn.textContent = '설정 완료'
      validateInputs()
    }
  })
}

// 설정 재진입: 인증 정보 삭제
export function clearAuth() {
  Storage.remove('tableCredentials')
  Storage.remove('authSession')
}
