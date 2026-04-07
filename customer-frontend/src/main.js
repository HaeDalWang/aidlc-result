// AppController — 앱 진입점, 전역 라우팅, 상태 조율

import { autoLogin, initSetupForm, clearAuth, Storage } from './auth.js'
import { initMenuView, syncCartQuantities, show as showMenu, hide as hideMenu } from './menu.js'
import { loadFromStorage, renderCartView, updateTabBadge } from './cart.js'
import { initOrderView, showConfirmModal } from './order.js'
import { initOrderHistory, show as showOrders, hide as hideOrders, disconnectSSE } from './order-history.js'

let currentTab = 'menu'
let menuInitialized = false
let ordersInitialized = false

// ─── 앱 초기화 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage()
  updateTabBadge()

  // US-002: 자동 로그인 시도
  autoLogin(
    (session) => onLoginSuccess(session),
    (errorMsg) => showSetupScreen(errorMsg)
  )
})

// ─── 로그인 성공 ────────────────────────────────────────────
async function onLoginSuccess(session) {
  updateHeader(session)
  showMainApp()
  initOrderView(() => switchTab('menu'))

  // 주문하기 버튼 연결
  document.getElementById('order-btn').addEventListener('click', () => showConfirmModal())

  // 장바구니 비우기 버튼
  document.getElementById('clear-cart-btn').addEventListener('click', () => {
    import('./cart.js').then(({ clearCart }) => {
      clearCart()
      renderCartView()
    })
  })

  await switchTab('menu')
}

// ─── 화면 전환 ──────────────────────────────────────────────
function showSetupScreen(errorMsg) {
  document.getElementById('setup-screen').classList.remove('hidden')
  document.getElementById('main-app').classList.add('hidden')

  initSetupForm((session) => {
    document.getElementById('setup-screen').classList.add('hidden')
    onLoginSuccess(session)
  })

  if (errorMsg) {
    const errEl = document.getElementById('setup-error')
    errEl.textContent = errorMsg
    errEl.classList.remove('hidden')
  }
}

function showMainApp() {
  document.getElementById('setup-screen').classList.add('hidden')
  document.getElementById('main-app').classList.remove('hidden')
}

// ─── 탭 전환 ────────────────────────────────────────────────
async function switchTab(tabName) {
  currentTab = tabName

  // 탭 버튼 활성 상태
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  })

  // 콘텐츠 전환
  hideMenu()
  document.getElementById('cart-view').classList.add('hidden')
  hideOrders()

  if (tabName === 'menu') {
    showMenu()
    if (!menuInitialized) {
      await initMenuView()
      menuInitialized = true
    }
  } else if (tabName === 'cart') {
    document.getElementById('cart-view').classList.remove('hidden')
    renderCartView()
  } else if (tabName === 'orders') {
    showOrders()
    if (!ordersInitialized) {
      await initOrderHistory()
      ordersInitialized = true
    }
  }
}

// ─── 이벤트 바인딩 ───────────────────────────────────────────

// 하단 탭 클릭
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
})

// 설정 버튼: 인증 초기화 → 설정 화면
document.getElementById('settings-btn').addEventListener('click', () => {
  if (confirm('설정 화면으로 이동하시겠습니까?\n인증 정보가 초기화됩니다.')) {
    disconnectSSE()
    clearAuth()
    menuInitialized = false
    ordersInitialized = false
    showSetupScreen()
  }
})

// 주문 성공 후 메뉴 탭 이동 이벤트
document.addEventListener('navigate:tab', (e) => {
  switchTab(e.detail.tab)
})

// cart:changed → 메뉴 카드 수량 배지 동기화
document.addEventListener('cart:changed', (e) => {
  syncCartQuantities(e.detail.items)
  // 장바구니 탭이 활성화된 경우 즉시 재렌더링
  if (currentTab === 'cart') renderCartView()
})

// ─── 헤더 업데이트 ───────────────────────────────────────────
function updateHeader(session) {
  const storeNameEl = document.getElementById('store-name')
  const tableInfoEl = document.getElementById('table-info')
  if (storeNameEl && session.store_name) {
    storeNameEl.textContent = session.store_name
  }
  if (tableInfoEl) {
    const creds = Storage.get('tableCredentials')
    tableInfoEl.textContent = `테이블 ${creds?.tableNumber ?? '-'}번`
  }
}
