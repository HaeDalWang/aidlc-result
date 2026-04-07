// OrderHistoryView + SSEClient (US-009, US-010, US-017)

import { getOrdersByTable } from './api.js'
import { Storage } from './auth.js'
import { clearCart, updateTabBadge } from './cart.js'

let sseClient = null

// SSEClient — 최대 5회 재연결, 3초 간격 (Q8-A, NFR-AVAIL-001)
class SSEClient {
  constructor(url, handlers) {
    this.url = url
    this.handlers = handlers
    this.reconnectCount = 0
    this.MAX_RETRIES = 5
    this.RETRY_INTERVAL = 3000
    this.source = null
  }

  connect() {
    if (this.source) this.source.close()
    this.source = new EventSource(this.url)

    this.source.addEventListener('order_status_updated', (e) => {
      try {
        const data = JSON.parse(e.data)
        this.handlers.onStatusUpdate(data.order_id, data.status)
      } catch { /* ignore */ }
    })

    this.source.addEventListener('session_completed', () => {
      this.handlers.onSessionCompleted()
    })

    this.source.onerror = () => this._handleError()
    this.source.onopen = () => {
      this.reconnectCount = 0
    }
  }

  _handleError() {
    if (this.source) this.source.close()
    if (this.reconnectCount < this.MAX_RETRIES) {
      this.reconnectCount++
      setTimeout(() => this.connect(), this.RETRY_INTERVAL)
    } else {
      this.handlers.onMaxRetriesReached()
    }
  }

  disconnect() {
    if (this.source) {
      this.source.close()
      this.source = null
    }
  }
}

// 상태 코드 → 표시 텍스트
function getStatusLabel(status) {
  const map = { pending: '대기중', preparing: '준비중', completed: '완료' }
  return map[status] ?? status
}

// 상태 코드 → Progress Bar 너비 (Q7-B)
function getStatusProgress(status) {
  const map = { pending: '0%', preparing: '50%', completed: '100%' }
  return map[status] ?? '0%'
}

// US-009: 주문 내역 로드 및 SSE 연결
export async function initOrderHistory() {
  const session = Storage.get('authSession')
  if (!session) return

  await loadOrders(session.tableId)
  startSSE(session.tableId)
}

async function loadOrders(tableId) {
  try {
    const orders = await getOrdersByTable(tableId)
    renderOrders(orders)
  } catch {
    renderOrders([])
  }
}

function renderOrders(orders) {
  const listEl = document.getElementById('order-list')
  const emptyEl = document.getElementById('order-empty')

  listEl.innerHTML = ''

  if (!orders || orders.length === 0) {
    emptyEl.classList.remove('hidden')
    return
  }

  emptyEl.classList.add('hidden')

  const fragment = document.createDocumentFragment()
  orders.forEach(order => {
    fragment.appendChild(createOrderCard(order))
  })
  listEl.appendChild(fragment)
}

function createOrderCard(order) {
  const card = document.createElement('div')
  card.className = 'order-card'
  card.dataset.orderId = order.id

  // 헤더
  const header = document.createElement('div')
  header.className = 'order-card-header'

  const orderNum = document.createElement('span')
  orderNum.className = 'text-sm font-bold text-gray-700'
  orderNum.textContent = `주문 #${order.id}`

  const timeEl = document.createElement('span')
  timeEl.className = 'text-xs text-gray-400'
  timeEl.textContent = formatTime(order.created_at)

  header.appendChild(orderNum)
  header.appendChild(timeEl)

  // 메뉴 목록 미리보기
  const preview = document.createElement('div')
  preview.className = 'order-items-preview'
  const itemNames = (order.items ?? []).map(i => `${i.menu_name} ×${i.quantity}`).join(', ')
  preview.textContent = itemNames

  // 총 금액
  const totalEl = document.createElement('div')
  totalEl.className = 'flex justify-between items-center'

  const totalLabel = document.createElement('span')
  totalLabel.className = 'text-xs text-gray-500'
  totalLabel.textContent = '합계'

  const totalAmount = document.createElement('span')
  totalAmount.className = 'text-base font-bold text-orange-500'
  totalAmount.textContent = (order.total_amount ?? 0).toLocaleString('ko-KR') + '원'

  totalEl.appendChild(totalLabel)
  totalEl.appendChild(totalAmount)

  // 상태 Progress Bar (Q7-B)
  const statusWrap = document.createElement('div')
  statusWrap.className = 'progress-bar-wrap'

  const statusLabel = document.createElement('div')
  statusLabel.className = `text-xs font-semibold mb-1 status-label-${order.status}`
  statusLabel.textContent = getStatusLabel(order.status)

  const track = document.createElement('div')
  track.className = 'progress-bar-track'

  const fill = document.createElement('div')
  fill.className = `progress-bar-fill progress-fill-${order.status}`
  fill.style.width = getStatusProgress(order.status)

  track.appendChild(fill)
  statusWrap.appendChild(statusLabel)
  statusWrap.appendChild(track)

  card.appendChild(header)
  card.appendChild(preview)
  card.appendChild(totalEl)
  card.appendChild(statusWrap)

  return card
}

// SSE: 주문 상태 실시간 업데이트 (NFR-PERF-003 — 타겟 DOM만 변경)
export function updateOrderStatus(orderId, status) {
  const card = document.querySelector(`[data-order-id="${orderId}"]`)
  if (!card) return

  const fill = card.querySelector('.progress-bar-fill')
  const label = card.querySelector('[class*="status-label-"]')

  if (fill) {
    fill.className = `progress-bar-fill progress-fill-${status}`
    fill.style.width = getStatusProgress(status)
  }
  if (label) {
    label.className = `text-xs font-semibold mb-1 status-label-${status}`
    label.textContent = getStatusLabel(status)
  }
}

// US-010, US-017: session_completed 처리 (Q9-A)
function handleSessionCompleted() {
  // 주문 내역 UI 초기화
  const listEl = document.getElementById('order-list')
  const emptyEl = document.getElementById('order-empty')
  if (listEl) listEl.innerHTML = ''
  if (emptyEl) emptyEl.classList.remove('hidden')

  // 장바구니 초기화 (화면 유지)
  clearCart()
  updateTabBadge()
}

function startSSE(tableId) {
  // 중복 연결 방지
  if (sseClient) sseClient.disconnect()

  const token = Storage.get('authSession')?.token
  const url = `/api/sse/table/${tableId}`

  sseClient = new SSEClient(url, {
    onStatusUpdate: (orderId, status) => updateOrderStatus(orderId, status),
    onSessionCompleted: () => handleSessionCompleted(),
    onMaxRetriesReached: () => {
      const bar = document.getElementById('sse-status-bar')
      if (bar) bar.classList.remove('hidden')
    }
  })
  sseClient.connect()
}

export function disconnectSSE() {
  if (sseClient) {
    sseClient.disconnect()
    sseClient = null
  }
}

export function show() {
  document.getElementById('order-history-view').classList.remove('hidden')
}

export function hide() {
  document.getElementById('order-history-view').classList.add('hidden')
}

function formatTime(isoString) {
  if (!isoString) return ''
  if (typeof dayjs !== 'undefined') {
    return dayjs(isoString).format('MM/DD HH:mm')
  }
  return new Date(isoString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
