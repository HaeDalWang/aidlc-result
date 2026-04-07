const Dashboard = {
  tables: [],    // TableSummary[]
  filter: null,  // selectedTableId

  async init() {
    showScreen('dashboard');
    await this.loadSummary();
    this._bindSSE();
    SSEClient.connect();
  },

  async loadSummary() {
    try {
      const summaries = await API.get('/orders/summary');
      if (!summaries) return;
      this.tables = summaries.map(s => ({
        tableId: s.table_id,
        tableNumber: s.table_number,
        totalAmount: s.total_amount,
        orders: s.orders,
        isHighlighted: false,
        highlightTimer: null,
      }));
      this._renderFilterBar();
      this._renderGrid();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  _bindSSE() {
    SSEClient.on('new_order', ({ order }) => {
      const table = this._findTable(order.table_id);
      if (!table) return;
      table.orders.unshift(order);
      table.totalAmount = table.orders.reduce((s, o) => s + o.total_amount, 0);
      this._highlightCard(table.tableId);
      this._updateCard(table);
    });

    SSEClient.on('order_updated', ({ order_id, status, table_id }) => {
      const table = this._findTable(table_id);
      if (!table) return;
      const order = table.orders.find(o => o.id === order_id);
      if (order) {
        order.status = status;
        this._updateCard(table);
        OrderDetail.updateOrder(order);
      }
    });

    SSEClient.on('order_deleted', ({ order_id, table_id }) => {
      const table = this._findTable(table_id);
      if (!table) return;
      table.orders = table.orders.filter(o => o.id !== order_id);
      table.totalAmount = table.orders.reduce((s, o) => s + o.total_amount, 0);
      this._updateCard(table);
      OrderDetail.removeOrder(order_id);
    });

    SSEClient.on('session_completed', ({ table_id }) => {
      const table = this._findTable(table_id);
      if (!table) return;
      table.orders = [];
      table.totalAmount = 0;
      this._updateCard(table);
    });
  },

  _findTable(tableId) {
    return this.tables.find(t => t.tableId === tableId);
  },

  _highlightCard(tableId) {
    const table = this._findTable(tableId);
    if (!table) return;
    clearTimeout(table.highlightTimer);
    table.isHighlighted = true;
    this._updateCard(table);
    table.highlightTimer = setTimeout(() => {
      table.isHighlighted = false;
      this._updateCard(table);
    }, 3000);
  },

  _renderFilterBar() {
    const bar = document.getElementById('filter-bar');
    bar.innerHTML = `<button data-testid="filter-all-button" class="filter-btn active" data-table-id="">전체</button>`;
    this.tables.forEach(t => {
      const btn = document.createElement('button');
      btn.dataset.testid = `filter-table-${t.tableNumber}-button`;
      btn.className = 'filter-btn';
      btn.dataset.tableId = t.tableId;
      btn.textContent = `${t.tableNumber}번`;
      bar.appendChild(btn);
    });
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.filter = btn.dataset.tableId ? Number(btn.dataset.tableId) : null;
      this._renderGrid();
    });
  },

  _renderGrid() {
    const grid = document.getElementById('tables-grid');
    const filtered = this.filter
      ? this.tables.filter(t => t.tableId === this.filter)
      : this.tables;
    grid.innerHTML = filtered.map(t => this._cardHTML(t)).join('');
    this._bindCardEvents();
  },

  _updateCard(table) {
    const existing = document.querySelector(`[data-testid="table-card-${table.tableId}"]`);
    if (!existing) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = this._cardHTML(table);
    existing.replaceWith(tmp.firstElementChild);
    this._bindCardEvents();
  },

  _cardHTML(t) {
    const statusMap = { PENDING: '대기중', PREPARING: '준비중', COMPLETED: '완료' };
    const previewOrders = t.orders.slice(0, 3);
    return `
      <div data-testid="table-card-${t.tableId}" class="table-card${t.isHighlighted ? ' highlight' : ''}">
        <div class="table-card-header">
          <h3 data-testid="table-card-number-${t.tableId}">${t.tableNumber}번 테이블</h3>
          <span data-testid="table-card-total-${t.tableId}" class="table-total">${t.totalAmount.toLocaleString()}원</span>
        </div>
        <div data-testid="table-card-orders-${t.tableId}" class="orders-preview">
          ${previewOrders.length
            ? previewOrders.map(o => `
              <div data-testid="order-preview-${o.id}" class="order-preview" data-order-id="${o.id}" data-table-id="${t.tableId}">
                <span>#${o.id} ${new Date(o.created_at).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'})}</span>
                <span class="order-status status-${o.status}">${statusMap[o.status]}</span>
              </div>`).join('')
            : '<p class="no-orders">주문 없음</p>'
          }
        </div>
        <div class="card-actions">
          <button data-testid="complete-session-button-${t.tableId}" class="btn-complete" data-table-id="${t.tableId}" data-table-number="${t.tableNumber}">이용 완료</button>
          <button data-testid="view-history-button-${t.tableId}" class="btn-history" data-table-id="${t.tableId}" data-table-number="${t.tableNumber}">과거 내역</button>
        </div>
      </div>`;
  },

  _bindCardEvents() {
    document.getElementById('tables-grid').querySelectorAll('.order-preview').forEach(el => {
      el.addEventListener('click', () => {
        const tableId = Number(el.dataset.tableId);
        const orderId = Number(el.dataset.orderId);
        const table = this._findTable(tableId);
        const order = table?.orders.find(o => o.id === orderId);
        if (order) OrderDetail.open(order);
      });
    });

    document.querySelectorAll('[data-testid^="complete-session-button-"]').forEach(btn => {
      btn.addEventListener('click', () => this._completeSession(Number(btn.dataset.tableId), Number(btn.dataset.tableNumber)));
    });

    document.querySelectorAll('[data-testid^="view-history-button-"]').forEach(btn => {
      btn.addEventListener('click', () => PastHistory.open(Number(btn.dataset.tableId), Number(btn.dataset.tableNumber)));
    });
  },

  async _completeSession(tableId, tableNumber) {
    const confirmed = await showConfirm(`${tableNumber}번 테이블을 이용 완료 처리하시겠습니까?`);
    if (!confirmed) return;
    try {
      await API.post(`/tables/${tableId}/complete`);
      showToast('이용 완료 처리되었습니다');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },
};

// 앱 진입점
(function initApp() {
  if (Auth.isTokenValid()) {
    Dashboard.init();
  } else {
    showScreen('login');
  }
})();
