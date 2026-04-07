// MenuView — 메뉴 목록 + 카테고리 탭 + 상세 모달 (US-003, US-004)

import { getMenus } from './api.js'
import { addItem, getQuantity } from './cart.js'

let allMenus = []
let categoryObserver = null

export async function initMenuView() {
  try {
    allMenus = await getMenus()
  } catch {
    allMenus = []
  }

  if (allMenus.length === 0) {
    document.getElementById('menu-empty').classList.remove('hidden')
    document.getElementById('menu-grid').classList.add('hidden')
    document.getElementById('category-tabs').classList.add('hidden')
    return
  }

  renderCategoryTabs()
  renderMenuGrid()
  bindModalEvents()
  setupCategoryObserver()
}

// US-003: 카테고리 탭 렌더링
function renderCategoryTabs() {
  const tabsEl = document.getElementById('category-tabs')
  const categories = getCategories()

  tabsEl.innerHTML = ''
  const fragment = document.createDocumentFragment()

  categories.forEach((cat, idx) => {
    const btn = document.createElement('button')
    btn.className = 'category-tab' + (idx === 0 ? ' active' : '')
    btn.textContent = cat
    btn.dataset.category = cat
    btn.dataset.testid = `category-tab-${cat}`
    btn.addEventListener('click', () => scrollToCategory(cat))
    fragment.appendChild(btn)
  })

  tabsEl.appendChild(fragment)
}

// US-003: 메뉴 카드 그리드 렌더링
function renderMenuGrid() {
  const gridEl = document.getElementById('menu-grid')
  const categories = getCategories()

  gridEl.innerHTML = ''
  const fragment = document.createDocumentFragment()

  categories.forEach(cat => {
    const section = document.createElement('section')
    section.className = 'category-section'
    section.dataset.category = cat

    const title = document.createElement('h2')
    title.className = 'text-base font-bold text-gray-700 mb-3'
    title.textContent = cat
    section.appendChild(title)

    const cards = document.createElement('div')
    cards.className = 'space-y-3'

    const catMenus = allMenus.filter(m => m.category === cat)
    catMenus.forEach(menu => {
      cards.appendChild(createMenuCard(menu))
    })

    section.appendChild(cards)
    fragment.appendChild(section)
  })

  gridEl.appendChild(fragment)
}

function createMenuCard(menu) {
  const card = document.createElement('div')
  card.className = 'menu-card cursor-pointer'
  card.dataset.menuId = menu.id
  card.dataset.testid = `menu-card-${menu.id}`

  // 이미지 (Q11-C: 없으면 회색 배경만)
  if (menu.image_url) {
    const img = document.createElement('img')
    img.className = 'menu-card-image'
    img.src = menu.image_url
    img.alt = menu.name
    img.addEventListener('error', () => {
      img.replaceWith(createImagePlaceholder())
    })
    card.appendChild(img)
  } else {
    card.appendChild(createImagePlaceholder())
  }

  // 카드 내용
  const body = document.createElement('div')
  body.className = 'menu-card-body'

  const nameEl = document.createElement('p')
  nameEl.className = 'text-sm font-semibold text-gray-800 line-clamp-1'
  nameEl.textContent = menu.name

  const descEl = document.createElement('p')
  descEl.className = 'text-xs text-gray-500 line-clamp-1 mt-0.5'
  descEl.textContent = menu.description ?? ''

  const priceEl = document.createElement('p')
  priceEl.className = 'text-sm font-bold text-orange-500 mt-1'
  priceEl.textContent = menu.price.toLocaleString('ko-KR') + '원'

  // +/- 수량 버튼 (Q4-A)
  const qtyControl = document.createElement('div')
  qtyControl.className = 'menu-card-qty-control mt-2'
  qtyControl.id = `qty-control-${menu.id}`

  const currentQty = getQuantity(menu.id)

  if (currentQty > 0) {
    renderQtyButtons(qtyControl, menu, currentQty)
  } else {
    renderAddButton(qtyControl, menu)
  }

  body.appendChild(nameEl)
  body.appendChild(descEl)
  body.appendChild(priceEl)
  body.appendChild(qtyControl)
  card.appendChild(body)

  // 카드 탭 → 상세 모달 (US-004)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.menu-card-qty-control')) return
    openDetailModal(menu.id)
  })

  return card
}

function renderAddButton(container, menu) {
  container.innerHTML = ''
  const addBtn = document.createElement('button')
  addBtn.className = 'qty-btn qty-btn-plus w-full justify-center text-sm'
  addBtn.dataset.testid = `add-to-cart-${menu.id}`
  addBtn.setAttribute('aria-label', `${menu.name} 장바구니 추가`)
  addBtn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> 추가'
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    addItem(menu.id, menu.name, menu.price)
    renderQtyButtons(container, menu, 1)
  })
  container.appendChild(addBtn)
}

function renderQtyButtons(container, menu, qty) {
  container.innerHTML = ''

  const minusBtn = document.createElement('button')
  minusBtn.className = 'qty-btn qty-btn-minus'
  minusBtn.setAttribute('aria-label', '수량 감소')
  minusBtn.dataset.testid = `decrease-${menu.id}`
  minusBtn.innerHTML = '<i class="fa-solid fa-minus text-sm"></i>'
  minusBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    import('./cart.js').then(({ decreaseItem, getQuantity }) => {
      decreaseItem(menu.id)
      const newQty = getQuantity(menu.id)
      if (newQty === 0) {
        renderAddButton(container, menu)
      } else {
        qtyEl.textContent = newQty
      }
    })
  })

  const qtyEl = document.createElement('span')
  qtyEl.className = 'qty-display'
  qtyEl.id = `qty-display-${menu.id}`
  qtyEl.textContent = qty

  const plusBtn = document.createElement('button')
  plusBtn.className = 'qty-btn qty-btn-plus'
  plusBtn.setAttribute('aria-label', '수량 증가')
  plusBtn.dataset.testid = `increase-${menu.id}`
  plusBtn.innerHTML = '<i class="fa-solid fa-plus text-sm"></i>'
  plusBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    import('./cart.js').then(({ increaseItem, getQuantity }) => {
      increaseItem(menu.id)
      qtyEl.textContent = getQuantity(menu.id)
    })
  })

  container.appendChild(minusBtn)
  container.appendChild(qtyEl)
  container.appendChild(plusBtn)
}

function createImagePlaceholder() {
  const div = document.createElement('div')
  div.className = 'menu-card-image-placeholder'
  return div
}

function getCategories() {
  return [...new Set(allMenus.map(m => m.category))]
}

// US-003: 카테고리 스크롤 이동 (Q2-A)
function scrollToCategory(categoryName) {
  const section = document.querySelector(`.category-section[data-category="${CSS.escape(categoryName)}"]`)
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  setActiveTab(categoryName)
}

function setActiveTab(categoryName) {
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === categoryName)
  })
}

// IntersectionObserver: 스크롤 중 활성 탭 자동 변경 (NFR-PERF-003)
function setupCategoryObserver() {
  if (categoryObserver) categoryObserver.disconnect()

  categoryObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setActiveTab(entry.target.dataset.category)
      }
    })
  }, { threshold: 0.3 })

  document.querySelectorAll('.category-section').forEach(el => {
    categoryObserver.observe(el)
  })
}

// US-004: 메뉴 상세 모달 (Q3-A)
function openDetailModal(menuId) {
  const menu = allMenus.find(m => m.id === menuId)
  if (!menu) return

  const modal = document.getElementById('menu-detail-modal')
  const imgWrap = document.getElementById('menu-modal-img-wrap')
  const img = document.getElementById('menu-modal-image')
  const nameEl = document.getElementById('menu-modal-name')
  const priceEl = document.getElementById('menu-modal-price')
  const descEl = document.getElementById('menu-modal-description')
  const qtyEl = document.getElementById('modal-qty-display')

  if (menu.image_url) {
    img.src = menu.image_url
    img.alt = menu.name
    img.classList.remove('hidden')
    imgWrap.style.background = ''
    img.onerror = () => { img.classList.add('hidden'); imgWrap.style.background = '#e5e7eb' }
  } else {
    img.classList.add('hidden')
    imgWrap.style.background = '#e5e7eb'
  }

  nameEl.textContent = menu.name
  priceEl.textContent = menu.price.toLocaleString('ko-KR') + '원'
  descEl.textContent = menu.description ?? ''

  const currentQty = getQuantity(menu.id)
  qtyEl.textContent = currentQty

  modal.dataset.currentMenuId = menuId
  modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeDetailModal() {
  document.getElementById('menu-detail-modal').classList.add('hidden')
  document.body.style.overflow = ''
}

function bindModalEvents() {
  document.getElementById('menu-modal-close').addEventListener('click', closeDetailModal)
  document.getElementById('menu-modal-overlay').addEventListener('click', closeDetailModal)

  document.getElementById('modal-qty-decrease').addEventListener('click', () => {
    const modal = document.getElementById('menu-detail-modal')
    const menuId = Number(modal.dataset.currentMenuId)
    const qtyEl = document.getElementById('modal-qty-display')
    const currentQty = parseInt(qtyEl.textContent)
    if (currentQty > 0) {
      import('./cart.js').then(({ decreaseItem, getQuantity }) => {
        decreaseItem(menuId)
        qtyEl.textContent = getQuantity(menuId)
      })
    }
  })

  document.getElementById('modal-qty-increase').addEventListener('click', () => {
    const modal = document.getElementById('menu-detail-modal')
    const menuId = Number(modal.dataset.currentMenuId)
    const menu = allMenus.find(m => m.id === menuId)
    const qtyEl = document.getElementById('modal-qty-display')
    if (menu) {
      addItem(menu.id, menu.name, menu.price)
      qtyEl.textContent = getQuantity(menuId)
    }
  })

  document.getElementById('modal-add-to-cart').addEventListener('click', () => {
    const modal = document.getElementById('menu-detail-modal')
    const menuId = Number(modal.dataset.currentMenuId)
    const menu = allMenus.find(m => m.id === menuId)
    if (menu && getQuantity(menuId) === 0) {
      addItem(menu.id, menu.name, menu.price)
      document.getElementById('modal-qty-display').textContent = 1
    }
    closeDetailModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailModal()
  })
}

// cart:changed 이벤트 수신 시 카드 수량 배지 동기화
export function syncCartQuantities(items) {
  const qtyMap = {}
  items.forEach(i => { qtyMap[i.menuId] = i.quantity })

  allMenus.forEach(menu => {
    const container = document.getElementById(`qty-control-${menu.id}`)
    if (!container) return
    const qty = qtyMap[menu.id] ?? 0
    if (qty > 0) {
      const qtyEl = document.getElementById(`qty-display-${menu.id}`)
      if (qtyEl) qtyEl.textContent = qty
      else renderQtyButtons(container, menu, qty)
    } else {
      renderAddButton(container, menu)
    }
  })
}

export function show() {
  document.getElementById('menu-view').classList.remove('hidden')
}

export function hide() {
  document.getElementById('menu-view').classList.add('hidden')
}
