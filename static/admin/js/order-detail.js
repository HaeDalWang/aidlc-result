const OrderDetail = {
  currentOrder: null,

  open(order) {
    this.currentOrder = order;
    this._render();
    document.getElementById('order-detail-modal').classList.remove('hidden');
  },

  close() {
    document.getElementById('order-detail-modal').classList.add('hidden');
    this.currentOrder = null;
  },

  updateOrder(updatedOrder) {
    if (!this.currentOrder || this.currentOrder.id !== updatedOrder.id) return;
    this.currentOrder = updatedOrder;
    this._render();
  },

  removeOrder(orderId) {
    if (this.currentOrder && this.currentOrder.id === orderId) this.close();
  },

  _render() {
    const o = this.currentOrder;
    const statusMap = { PENDING: '대기중', PREPARING: '준비중', COMPLETED: '완료' };

    document.getElementById('order-detail-title').textContent = `주문 #${o.id}`;
    document.getElementById('order-detail-status').textContent = statusMap[o.status] || o.status;
    document.getElementById('order-detail-status').className = `order-status status-${o.status}`;

    const ul = document.getElementById('order-detail-items');
    ul.innerHTML = o.items.map(item =>
      `<li data-testid="order-item-${item.id}">
        <span>${item.menu_name} × ${item.quantity}</span>
        <span>${(item.unit_price * item.quantity).toLocaleString()}원</span>
       </li>`
    ).join('');

    document.getElementById('order-detail-total').textContent = `${o.total_amount.toLocaleString()}원`;

    const prepareBtn = document.getElementById('order-prepare-btn');
    const completeBtn = document.getElementById('order-complete-btn');
    prepareBtn.classList.toggle('hidden', o.status !== 'PENDING');
    completeBtn.classList.toggle('hidden', o.status !== 'PREPARING');
  },

  async changeStatus(newStatus) {
    const btn = newStatus === 'PREPARING'
      ? document.getElementById('order-prepare-btn')
      : document.getElementById('order-complete-btn');
    btn.disabled = true;
    try {
      await API.patch(`/orders/${this.currentOrder.id}/status`, { status: newStatus });
      showToast('상태가 변경되었습니다');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  },

  async deleteOrder() {
    const confirmed = await showConfirm('이 주문을 삭제하시겠습니까?');
    if (!confirmed) return;
    const btn = document.getElementById('order-delete-btn');
    btn.disabled = true;
    try {
      await API.delete(`/orders/${this.currentOrder.id}`);
      showToast('주문이 삭제되었습니다');
      this.close();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
    }
  },
};

// 이벤트 바인딩
document.getElementById('order-detail-close').addEventListener('click', () => OrderDetail.close());
document.getElementById('order-prepare-btn').addEventListener('click', () => OrderDetail.changeStatus('PREPARING'));
document.getElementById('order-complete-btn').addEventListener('click', () => OrderDetail.changeStatus('COMPLETED'));
document.getElementById('order-delete-btn').addEventListener('click', () => OrderDetail.deleteOrder());
