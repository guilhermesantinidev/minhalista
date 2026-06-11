/* ============================
   Minha Lista — app.js
   ============================ */

const STORAGE_KEY = 'minha-lista-items';

let items = loadItems();
let nextId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;

/* ---- Persistência ---- */
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* storage cheio, ignora */ }
}

/* ---- Ações ---- */
function addItem() {
  const inp = document.getElementById('item-input');
  const qtyInp = document.getElementById('qty-input');
  const name = inp.value.trim();
  if (!name) { inp.focus(); return; }
  const qty = Math.max(1, parseInt(qtyInp.value) || 1);
  items.unshift({ id: nextId++, name, qty, done: false });
  inp.value = '';
  qtyInp.value = 1;
  inp.focus();
  saveItems();
  render();
}

function toggle(id) {
  const item = items.find(i => i.id === id);
  if (item) item.done = !item.done;
  saveItems();
  render();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  render();
}

function clearDone() {
  const doneCount = items.filter(i => i.done).length;
  if (doneCount === 0) return;
  items = items.filter(i => !i.done);
  saveItems();
  render();
}

/* ---- Render ---- */
function render() {
  const body = document.getElementById('list-body');
  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Header
  document.getElementById('prog').style.width = pct + '%';
  if (total === 0) {
    document.getElementById('sub-text').textContent = 'Nenhum item ainda';
  } else if (done === total) {
    document.getElementById('sub-text').textContent = '🎉 Tudo comprado!';
  } else {
    document.getElementById('sub-text').textContent =
      `${done} de ${total} comprado${done !== 1 ? 's' : ''} · ${pct}%`;
  }

  // Footer
  const fp = document.getElementById('footer-pill');
  if (total === 0) {
    fp.classList.remove('visible');
  } else {
    fp.classList.add('visible');
    document.getElementById('footer-left').textContent =
      `${done} de ${total} comprado${done !== 1 ? 's' : ''}`;
    document.getElementById('footer-right').textContent =
      done === total ? '✓ tudo comprado!' : `${total - done} restante${total - done !== 1 ? 's' : ''}`;
  }

  // Lista vazia
  if (total === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-shopping-cart"></i>
        <p>Sua lista está vazia.<br>Adicione itens acima para começar.</p>
      </div>`;
    return;
  }

  // Itens
  const pending = items.filter(i => !i.done);
  const doneItems = items.filter(i => i.done);
  let html = '';

  if (pending.length) {
    html += `<div class="section-label">a comprar</div>`;
    pending.forEach(item => { html += itemHTML(item); });
  }
  if (doneItems.length) {
    if (pending.length) html += `<div style="margin-top:4px"></div>`;
    html += `<div class="section-label">comprado</div>`;
    doneItems.forEach(item => { html += itemHTML(item); });
  }

  body.innerHTML = html;
}

function itemHTML(item) {
  const qtyLabel = item.qty > 1 ? `<div class="item-qty">${item.qty} unidade${item.qty !== 1 ? 's' : ''}</div>` : '';
  return `
    <div class="item-card${item.done ? ' done' : ''}" onclick="toggle(${item.id})">
      <div class="check-circle${item.done ? ' checked' : ''}">
        <i class="ti ti-check"></i>
      </div>
      <div class="item-info">
        <div class="item-name">${escapeHTML(item.name)}</div>
        ${qtyLabel}
      </div>
      <button
        class="delete-btn"
        onclick="event.stopPropagation(); deleteItem(${item.id})"
        aria-label="Remover ${escapeHTML(item.name)}"
      >
        <i class="ti ti-trash"></i>
      </button>
    </div>`;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---- Input: Enter para adicionar ---- */
document.getElementById('item-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

/* ---- Service Worker ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ---- Init ---- */
render();
