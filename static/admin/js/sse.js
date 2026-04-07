const SSEClient = {
  es: null,
  retryCount: 0,
  maxRetry: 5,
  retryTimer: null,
  handlers: {},

  connect() {
    const token = Auth.getToken();
    if (!token) return;

    this.es = new EventSource(`/api/sse/admin?token=${encodeURIComponent(token)}`);

    this.es.onopen = () => {
      this.retryCount = 0;
      this._setStatus(true);
    };

    this.es.onmessage = (e) => {
      if (e.data.startsWith(':')) return; // ping
      try {
        const event = JSON.parse(e.data);
        if (this.handlers[event.type]) this.handlers[event.type](event);
      } catch {}
    };

    this.es.onerror = () => {
      this._setStatus(false);
      this.es.close();
      this._scheduleReconnect();
    };
  },

  disconnect() {
    clearTimeout(this.retryTimer);
    if (this.es) { this.es.close(); this.es = null; }
    this._setStatus(false);
  },

  on(type, handler) { this.handlers[type] = handler; },

  _setStatus(connected) {
    const indicator = document.getElementById('sse-status');
    const text = document.getElementById('sse-status-text');
    if (!indicator) return;
    indicator.className = connected ? 'sse-connected' : 'sse-disconnected';
    text.textContent = connected ? '실시간 연결됨' : '연결 끊김';
  },

  _scheduleReconnect() {
    if (this.retryCount >= this.maxRetry) {
      showToast('서버 연결이 끊겼습니다. 페이지를 새로고침해 주세요.', 'error');
      return;
    }
    const delay = Math.min(3000 * Math.pow(2, this.retryCount), 30000);
    this.retryCount++;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  },
};
