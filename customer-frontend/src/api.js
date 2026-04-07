// CustomerAPI — 모든 백엔드 API 호출 집중 관리

class APIError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.type = 'api'
  }
}

class NetworkError extends Error {
  constructor() {
    super('네트워크 연결을 확인해 주세요.')
    this.type = 'network'
  }
}

function getToken() {
  try {
    const session = JSON.parse(localStorage.getItem('authSession'))
    return session?.token ?? null
  } catch {
    return null
  }
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    })
  } catch {
    throw new NetworkError()
  }

  if (!response.ok) {
    let message = '요청에 실패했습니다.'
    try {
      const data = await response.json()
      message = data.detail ?? message
    } catch { /* ignore */ }
    throw new APIError(response.status, message)
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  return null
}

// US-001, US-002: 테이블 로그인
export async function login(storeId, tableNumber, password) {
  return request('POST', '/api/auth/table-login', {
    store_id: storeId,
    table_number: Number(tableNumber),
    password
  })
}

// US-003: 메뉴 목록 조회
export async function getMenus() {
  return request('GET', '/api/menus')
}

// US-007: 주문 생성
export async function createOrder(tableId, sessionId, items) {
  return request('POST', '/api/orders', {
    table_id: tableId,
    session_id: sessionId,
    items
  })
}

// US-009: 현재 세션 주문 내역 조회
export async function getOrdersByTable(tableId) {
  return request('GET', `/api/orders/table/${tableId}`)
}

export { APIError, NetworkError }
