// OrderView — 주문 확인 모달 + 주문 제출 (US-007, US-008)

import { createOrder, NetworkError } from './api.js'
import { getItems, getTotalAmount, clearCart } from './cart.js'
import { Storage } from './auth.js'

export function initOrderView(onOrderSuccess) {
  const cancelBtn = document.getElementById('order-cancel-btn')
  const confirmBtn = document.getElementById('order-confirm-btn')
  const overlay = document.getElementById('order-modal-overlay')

  cancelBtn.addEventListener('click', closeConfirmModal)
  overlay.addEventListener('click', closeConfirmModal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeConfirmModal()
  })

  confirmBtn.addEventListener('click', async () => {
    await submitOrder(onOrderSuccess)
  })
}

// US-007: 주문 확인 모달 표시 (Q5-B)
export function showConfirmModal() {
  const items = getItems()
  if (items.length === 0) return

  const totalAmount = getTotalAmount()
  const itemsEl = document.getElementById('order-confirm-items')
  const totalEl = document.getElementById('order-confirm-total')

  itemsEl.innerHTML = ''
  const fragment = document.createDocumentFragment()
  items.forEach(item => {
    const row = document.createElement('div')
    row.className = 'flex justify-between items-center py-1'

    const left = document.createElement('span')
    left.className = 'text-sm text-gray-700'
    left.textContent = `${item.menuName} × ${item.quantity}`

    const right = document.createElement('span')
    right.className = 'text-sm font-medium text-gray-800'
    right.textContent = (item.unitPrice * item.quantity).toLocaleString('ko-KR') + '원'

    row.appendChild(left)
    row.appendChild(right)
    fragment.appendChild(row)
  })
  itemsEl.appendChild(fragment)

  totalEl.textContent = totalAmount.toLocaleString('ko-KR') + '원'

  document.getElementById('order-confirm-modal').classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeConfirmModal() {
  document.getElementById('order-confirm-modal').classList.add('hidden')
  document.body.style.overflow = ''
}

// US-007: 주문 API 호출
async function submitOrder(onOrderSuccess) {
  const confirmBtn = document.getElementById('order-confirm-btn')
  const items = getItems()
  const session = Storage.get('authSession')
  if (!session) return

  confirmBtn.disabled = true
  confirmBtn.textContent = '처리 중...'

  try {
    await createOrder(
      session.tableId,
      session.sessionId,
      items.map(i => ({
        menu_id: i.menuId,
        quantity: i.quantity,
        unit_price: i.unitPrice
      }))
    )
    closeConfirmModal()
    clearCart()
    showSuccessToast()
    onOrderSuccess()
  } catch (err) {
    // US-008: 실패 처리 — 장바구니 유지
    closeConfirmModal()
    const msg = err instanceof NetworkError
      ? '네트워크 연결을 확인해 주세요. 장바구니는 유지됩니다.'
      : '주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
    showErrorToast(msg)
  } finally {
    confirmBtn.disabled = false
    confirmBtn.textContent = '확인'
  }
}

// US-007: 성공 토스트 + 5초 후 메뉴 탭 이동 (Q6-A)
function showSuccessToast() {
  showToast('주문이 완료되었습니다!', 3000)
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('navigate:tab', { detail: { tab: 'menu' } }))
  }, 5000)
}

// US-008: 에러 토스트
export function showErrorToast(message) {
  showToast(message, 4000)
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.classList.remove('hidden', 'hide')
  toast.classList.add('show')
  setTimeout(() => {
    toast.classList.remove('show')
    toast.classList.add('hide')
    setTimeout(() => {
      toast.classList.add('hidden')
      toast.classList.remove('hide')
    }, 300)
  }, duration)
}
