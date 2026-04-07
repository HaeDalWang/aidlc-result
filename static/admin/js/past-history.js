const PastHistory = {
  currentTableId: null,
  currentTableNumber: null,

  async open(tableId, tableNumber) {
    this.currentTableId = tableId;
    this.currentTableNumber = tableNumber;
    document.getElementById('history-modal-title').textContent = `${tableNumber}번 테이블 과거 내역`;
    document.getElementById('history-modal').classList.remove('hidden');
    await this.search();
  },

  close() {
    document.getElementById('history-modal').classList.add('hidden');
    this.currentTableId = null;
  },

  async search() {
    const dateFrom = document.getElementById('history-date-from').value;
    const dateTo = document.getElementById('history-date-to').value;

    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo)   params.append('date_to', dateTo);
    const query = params.toString() ? `?${params}` : '';

    const btn = document.getElementById('history-search-btn');
    btn.disabled = true;
    try {
      const groups = await API.get(`/tables/${this.currentTableId}/history${query}`);
      this._render(groups || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  },

  _render(groups) {
    const container = document.getElementById('history-list');
    if (!groups.length) {
      container.innerHTML = '<p style="color:#64748b;text-align:center;padding:1rem">조회된 내역이 없습니다</p>';
      return;
    }
    container.innerHTML = groups.map(group => `
      <div data-testid="history-session-${group.session_id}" class="history-session">
        <div class="history-session-header">
          완료 시각: ${new Date(group.completed_at).toLocaleString('ko-KR')}
        </div>
        ${group.orders.map(order => `
          <div class="history-order">
            <div class="history-order-header">
              <span>주문 #${order.id} (${order.order_status})</span>
              <span>${order.total_amount.toLocaleString()}원</span>
            </div>
            <div class="history-items">
              ${order.items.map(i => `${i.menu_name} × ${i.quantity}`).join(', ')}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
  },
};

document.getElementById('history-close').addEventListener('click', () => PastHistory.close());
document.getElementById('history-search-btn').addEventListener('click', () => PastHistory.search());
