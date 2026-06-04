const socket = io();

const connectionStatus = document.getElementById('connectionStatus');
const ordersTableBody = document.getElementById('ordersTableBody');
const updatesList = document.getElementById('updatesList');
const clearEventsButton = document.getElementById('clearEventsButton');

const totalOrders = document.getElementById('totalOrders');
const pendingOrders = document.getElementById('pendingOrders');
const shippedOrders = document.getElementById('shippedOrders');
const deliveredOrders = document.getElementById('deliveredOrders');

const orders = new Map();

function setConnectionStatus(isConnected) {
  connectionStatus.innerHTML = `
    <span class="status-dot ${isConnected ? 'connected' : 'disconnected'}"></span>
    <span>${isConnected ? 'Connected' : 'Disconnected'}</span>
  `;
}

function formatTime(value) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSummary() {
  const list = Array.from(orders.values());

  totalOrders.textContent = list.length;
  pendingOrders.textContent = list.filter((order) => order.status === 'pending').length;
  shippedOrders.textContent = list.filter((order) => order.status === 'shipped').length;
  deliveredOrders.textContent = list.filter((order) => order.status === 'delivered').length;
}

function renderOrders() {
  if (orders.size === 0) {
    ordersTableBody.innerHTML = '<tr><td colspan="5" class="empty-cell">No orders found.</td></tr>';
    renderSummary();
    return;
  }

  const rows = Array.from(orders.values())
    .sort((a, b) => a.id - b.id)
    .map((order) => `
      <tr>
        <td>#${order.id}</td>
        <td>${escapeHtml(order.customer_name)}</td>
        <td>${escapeHtml(order.product_name)}</td>
        <td><span class="status-badge ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></td>
        <td>${formatTime(order.updated_at)}</td>
      </tr>
    `)
    .join('');

  ordersTableBody.innerHTML = rows;
  renderSummary();
}

function summarizeEvent(event, data) {
  if (event === 'DELETE') {
    return `${data.customer_name}'s ${data.product_name} order was removed.`;
  }

  return `${data.customer_name} ordered ${data.product_name}. Status is ${data.status}.`;
}

function addEvent(eventPayload) {
  const { event, data, receivedAt } = eventPayload;
  const item = document.createElement('article');

  item.className = `event-item ${event.toLowerCase()}`;
  item.innerHTML = `
    <div class="event-meta">
      <span>[${formatTime(receivedAt)}]</span>
      <span class="event-type">${escapeHtml(event)}</span>
    </div>
    <div class="event-title">Order #${escapeHtml(data.id)}</div>
    <div class="event-body">${escapeHtml(summarizeEvent(event, data))}</div>
  `;

  if (updatesList.querySelector('.empty-state')) {
    updatesList.innerHTML = '';
  }

  updatesList.prepend(item);
}

function applyOrderChange(payload) {
  const { event, data } = payload;

  if (event === 'DELETE') {
    orders.delete(data.id);
  } else {
    orders.set(data.id, data);
  }

  renderOrders();
  addEvent(payload);
}

async function loadInitialOrders() {
  try {
    const response = await fetch('/api/orders');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    result.data.forEach((order) => orders.set(order.id, order));
    renderOrders();
  } catch (error) {
    ordersTableBody.innerHTML = '<tr><td colspan="5" class="empty-cell">Unable to load orders.</td></tr>';
    console.error('Failed to load initial orders', error);
  }
}

socket.on('connect', () => {
  setConnectionStatus(true);
});

socket.on('disconnect', () => {
  setConnectionStatus(false);
});

socket.on('order_change', applyOrderChange);

clearEventsButton.addEventListener('click', () => {
  updatesList.innerHTML = '<div class="empty-state">Waiting for database changes...</div>';
});

loadInitialOrders();
