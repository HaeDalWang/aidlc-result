// CartManager — 장바구니 상태 관리 (US-005, US-006)

import { Storage } from './auth.js'

const CART_KEY = 'cartItems'

let cartItems = []

// US-006: localStorage에서 장바구니 복원
export function loadFromStorage() {
  cartItems = Storage.get(CART_KEY) ?? []
}

function saveToStorage() {
  Storage.set(CART_KEY, cartItems)
}

function notifyChange() {
  document.dispatchEvent(new CustomEvent('cart:changed', { detail: { items: cartItems } }))
  updateTabBadge()
}

// US-005: 항목 추가 (이미 있으면 수량 증가)
export function addItem(menuId, menuName, unitPrice) {
  const existing = cartItems.find(i => i.menuId === menuId)
  if (existing) {
    existing.quantity++
  } else {
    cartItems.push({ menuId, menuName, unitPrice, quantity: 1 })
  }
  saveToStorage()
  notifyChange()
}

export function increaseItem(menuId) {
  const item = cartItems.find(i => i.menuId === menuId)
  if (item) {
    item.quantity++
    saveToStorage()
    notifyChange()
  }
}

// US-005: 수량 감소 (1 → 제거)
export function decreaseItem(menuId) {
  const idx = cartItems.findIndex(i => i.menuId === menuId)
  if (idx === -1) return
  if (cartItems[idx].quantity <= 1) {
    cartItems.splice(idx, 1)
  } else {
    cartItems[idx].quantity--
  }
  saveToStorage()
  notifyChange()
}

export function removeItem(menuId) {
  cartItems = cartItems.filter(i => i.menuId !== menuId)
  saveToStorage()
  notifyChange()
}

// US-006: 장바구니 전체 초기화
export function clearCart() {
  cartItems = []
  saveToStorage()
  notifyChange()
}

export function getItems() {
  return [...cartItems]
}

export function getItemCount() {
  return cartItems.reduce((sum, i) => sum + i.quantity, 0)
}

export function getTotalAmount() {
  return cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
}

export function getQuantity(menuId) {
  return cartItems.find(i => i.menuId === menuId)?.quantity ?? 0
}

// 하단 탭 dot 배지 (Q10-C)
export function updateTabBadge() {
  const dot = document.getElementById('cart-dot')
  if (!dot) return
  if (cartItems.length > 0) {
    dot.classList.remove('hidden')
  } else {
    dot.classList.add('hidden')
  }
}

// 장바구니 화면 렌더링
export function renderCartView() {
  const listEl = document.getElementById('cart-item-list')
  const emptyEl = document.getElementById('cart-empty')
  const footerEl = document.getElementById('cart-footer')
  const totalEl = document.getElementById('cart-total')
  const orderBtn = document.getElementById('order-btn')

  if (!listEl) return

  listEl.innerHTML = ''

  if (cartItems.length === 0) {
    emptyEl.classList.remove('hidden')
    footerEl.classList.add('hidden')
    return
  }

  emptyEl.classList.add('hidden')
  footerEl.classList.remove('hidden')

  const fragment = document.createDocumentFragment()
  cartItems.forEach(item => {
    const row = document.createElement('div')
    row.className = 'cart-item-row'
    row.dataset.menuId = item.menuId

    const nameEl = document.createElement('span')
    nameEl.className = 'cart-item-name'
    nameEl.textContent = item.menuName

    const qtyWrap = document.createElement('div')
    qtyWrap.className = 'menu-card-qty-control'

    const minusBtn = document.createElement('button')
    minusBtn.className = 'qty-btn qty-btn-minus'
    minusBtn.dataset.testid = `cart-decrease-${item.menuId}`
    minusBtn.setAttribute('aria-label', '수량 감소')
    minusBtn.innerHTML = '<i class="fa-solid fa-minus text-sm"></i>'
    minusBtn.addEventListener('click', () => {
      decreaseItem(item.menuId)
      renderCartView()
    })

    const qtyEl = document.createElement('span')
    qtyEl.className = 'qty-display'
    qtyEl.textContent = item.quantity

    const plusBtn = document.createElement('button')
    plusBtn.className = 'qty-btn qty-btn-plus'
    plusBtn.dataset.testid = `cart-increase-${item.menuId}`
    plusBtn.setAttribute('aria-label', '수량 증가')
    plusBtn.innerHTML = '<i class="fa-solid fa-plus text-sm"></i>'
    plusBtn.addEventListener('click', () => {
      increaseItem(item.menuId)
      renderCartView()
    })

    qtyWrap.appendChild(minusBtn)
    qtyWrap.appendChild(qtyEl)
    qtyWrap.appendChild(plusBtn)

    const subtotalEl = document.createElement('span')
    subtotalEl.className = 'cart-item-subtotal text-sm'
    subtotalEl.textContent = (item.unitPrice * item.quantity).toLocaleString('ko-KR') + '원'

    row.appendChild(nameEl)
    row.appendChild(qtyWrap)
    row.appendChild(subtotalEl)
    fragment.appendChild(row)
  })

  listEl.appendChild(fragment)

  totalEl.textContent = getTotalAmount().toLocaleString('ko-KR') + '원'
  orderBtn.disabled = false
}
