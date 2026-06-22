/* ============================
   Minha Lista — app.js
   ============================ */

const STORAGE_KEY = 'minha-lista-items';

let items = loadItems();
let nextId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;

/* ─────────────────────────────
   Persistência
───────────────────────────── */
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveItems() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch { /* storage cheio */ }
}

/* ─────────────────────────────
   Qty stepper
───────────────────────────── */
function changeQty(delta) {
  const inp = document.getElementById('qty-input');
  inp.value = Math.min(99, Math.max(1, (parseInt(inp.value) || 1) + delta));
}

/* ─────────────────────────────
   Ações principais
───────────────────────────── */
function addItem() {
  const inp    = document.getElementById('item-input');
  const qtyInp = document.getElementById('qty-input');
  const name   = inp.value.trim();
  if (!name) { inp.focus(); return; }
  const qty = Math.max(1, parseInt(qtyInp.value) || 1);
  items.unshift({ id: nextId++, name, qty, done: false });
  inp.value    = '';
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
  if (!items.some(i => i.done)) return;
  items = items.filter(i => !i.done);
  saveItems();
  render();
}

/* ─────────────────────────────
   Exportar
───────────────────────────── */
function openExport() {
  const pending   = items.filter(i => !i.done);
  const doneItems = items.filter(i => i.done);

  if (items.length === 0) {
    showToast('Lista vazia, nada para exportar');
    return;
  }

  let lines = ['🛒 Minha Lista', ''];

  if (pending.length) {
    pending.forEach(item => {
      lines.push(item.qty > 1 ? `• ${item.name} (${item.qty}×)` : `• ${item.name}`);
    });
  }

  if (doneItems.length) {
    if (pending.length) lines.push('');
    lines.push('✅ Já comprado:');
    doneItems.forEach(item => {
      lines.push(item.qty > 1 ? `✓ ${item.name} (${item.qty}×)` : `✓ ${item.name}`);
    });
  }

  document.getElementById('export-text').value = lines.join('\n');
  // Reset copy button
  document.getElementById('copy-icon').className  = 'ti ti-copy';
  document.getElementById('copy-label').textContent = 'Copiar tudo';
  openModal('export-modal');
}

function copyExport() {
  const text = document.getElementById('export-text').value;
  const icon  = document.getElementById('copy-icon');
  const label = document.getElementById('copy-label');

  navigator.clipboard.writeText(text).then(() => {
    icon.className      = 'ti ti-check';
    label.textContent   = 'Copiado!';
    setTimeout(() => {
      icon.className    = 'ti ti-copy';
      label.textContent = 'Copiar tudo';
    }, 2000);
  }).catch(() => {
    // Fallback para dispositivos sem clipboard API
    document.getElementById('export-text').select();
    document.execCommand('copy');
    showToast('Texto copiado!');
  });
}

/* ─────────────────────────────
   Importar
───────────────────────────── */
let parsedImportItems = [];

function openImport() {
  document.getElementById('import-text').value = '';
  document.getElementById('import-parse-btn').disabled = true;
  showImportStep(1);
  openModal('import-modal');
  setTimeout(() => document.getElementById('import-text').focus(), 400);
}

function onImportInput() {
  const val = document.getElementById('import-text').value.trim();
  document.getElementById('import-parse-btn').disabled = val.length < 2;
}

/**
 * Parseia texto livre (formato WhatsApp exportado pelo app, ou qualquer lista)
 * Aceita:
 *   • Item (3×)  /  • Item (3x)  /  • Item x3
 *   - Item
 *   ✓ Item
 *   Item 2x  /  Item (2)
 *   Linhas livres sem marcador
 */
function parseImport() {
  const raw   = document.getElementById('import-text').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  parsedImportItems = [];

  for (const line of lines) {
    // Ignora cabeçalhos comuns
    if (/^(🛒|minha lista|lista de compras|✅ já comprado|já comprado)/i.test(line)) continue;

    // Remove marcadores: •, -, *, ✓, ✔, números seguidos de . ou )
    let text = line.replace(/^(•|-|\*|✓|✔|\d+[.)]\s*)/, '').trim();
    if (!text) continue;

    // Extrai quantidade: (3×), (3x), (3), x3, 3x ao final
    let qty = 1;
    const patterns = [
      /\((\d+)[×x]\)\s*$/i,   // (3×) ou (3x) no final
      /\((\d+)\)\s*$/,        // (3) no final
      /[×x](\d+)\s*$/i,       // ×3 ou x3 no final
      /(\d+)[×x]\s*$/i,       // 3× ou 3x no final
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) {
        qty  = Math.min(99, Math.max(1, parseInt(m[1])));
        text = text.replace(pat, '').trim();
        break;
      }
    }

    // Ignora linhas que sobraram vazias ou muito curtas
    if (text.length < 1) continue;

    // Capitaliza primeira letra
    text = text.charAt(0).toUpperCase() + text.slice(1);

    parsedImportItems.push({ name: text, qty });
  }

  if (parsedImportItems.length === 0) {
    showToast('Nenhum item encontrado no texto');
    return;
  }

  // Monta preview
  const label = document.getElementById('import-count-label');
  label.textContent = `${parsedImportItems.length} item${parsedImportItems.length !== 1 ? 's' : ''} encontrado${parsedImportItems.length !== 1 ? 's' : ''}`;

  const ul = document.getElementById('import-preview-list');
  ul.innerHTML = parsedImportItems.map(item => `
    <li>
      <div class="preview-check"><i class="ti ti-check"></i></div>
      <span>${escapeHTML(item.name)}</span>
      ${item.qty > 1 ? `<span class="preview-qty">${item.qty}×</span>` : ''}
    </li>
  `).join('');

  showImportStep(2);
}

function backToStep1() {
  showImportStep(1);
}

function doImport(mode) {
  if (parsedImportItems.length === 0) return;

  if (mode === 'replace') {
    items = parsedImportItems.map(p => ({ id: nextId++, name: p.name, qty: p.qty, done: false }));
  } else {
    // Merge: adiciona ao início, evita duplicatas exatas pelo nome (case-insensitive)
    const existing = new Set(items.map(i => i.name.toLowerCase()));
    const toAdd    = parsedImportItems.filter(p => !existing.has(p.name.toLowerCase()));
    const dupes    = parsedImportItems.length - toAdd.length;
    items = [
      ...toAdd.map(p => ({ id: nextId++, name: p.name, qty: p.qty, done: false })),
      ...items
    ];
    if (dupes > 0) {
      setTimeout(() => showToast(`${dupes} item${dupes !== 1 ? 's' : ''} já existia${dupes !== 1 ? 'm' : ''} e foi${dupes !== 1 ? 'ram' : ''} ignorado${dupes !== 1 ? 's' : ''}`), 350);
    }
  }

  saveItems();
  render();
  closeModal('import-modal');

  const msg = mode === 'replace'
    ? `Lista atualizada com ${parsedImportItems.length} item${parsedImportItems.length !== 1 ? 's' : ''}`
    : `${parsedImportItems.length} item${parsedImportItems.length !== 1 ? 's' : ''} adicionado${parsedImportItems.length !== 1 ? 's' : ''}`;
  setTimeout(() => showToast(msg), 300);
}

function showImportStep(step) {
  document.getElementById('import-step-1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('import-step-2').style.display = step === 2 ? 'block' : 'none';
}

/* ─────────────────────────────
   Modal helpers
───────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Fecha modais com Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['export-modal', 'import-modal'].forEach(id => {
      document.getElementById(id).classList.remove('open');
    });
    document.body.style.overflow = '';
  }
});

/* ─────────────────────────────
   Toast
───────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1c1c1a; color: #f0f0ec; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 99px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 200;
      opacity: 0; transition: opacity 0.2s, transform 0.2s; white-space: nowrap;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2800);
}

/* ─────────────────────────────
   Render
───────────────────────────── */
function render() {
  const body  = document.getElementById('list-body');
  const total = items.length;
  const done  = items.filter(i => i.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('prog').style.width = pct + '%';

  if (total === 0) {
    document.getElementById('sub-text').textContent = 'Nenhum item ainda';
  } else if (done === total) {
    document.getElementById('sub-text').textContent = '🎉 Tudo comprado!';
  } else {
    document.getElementById('sub-text').textContent =
      `${done} de ${total} comprado${done !== 1 ? 's' : ''} · ${pct}%`;
  }

  const fp = document.getElementById('footer-pill');
  if (total === 0) {
    fp.classList.remove('visible');
  } else {
    fp.classList.add('visible');
    document.getElementById('footer-left').textContent =
      `${done} de ${total} item${total !== 1 ? 's' : ''}`;
    document.getElementById('footer-right').textContent =
      done === total ? '✓ tudo comprado!' : `${total - done} restante${total - done !== 1 ? 's' : ''}`;
  }

  if (total === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="ti ti-shopping-cart"></i></div>
        <p>Sua lista está vazia.<br>Adicione itens acima para começar.</p>
      </div>`;
    return;
  }

  const pending   = items.filter(i => !i.done);
  const doneItems = items.filter(i => i.done);
  let html = '';

  if (pending.length) {
    html += `<div class="section-label">A comprar</div>`;
    pending.forEach(item => { html += itemHTML(item); });
  }
  if (doneItems.length) {
    html += `<div class="section-label" style="margin-top:4px">Comprado</div>`;
    doneItems.forEach(item => { html += itemHTML(item); });
  }

  body.innerHTML = html;
}

function itemHTML(item) {
  const qtyBadge = item.qty > 1 ? `<span class="item-qty">${item.qty}×</span>` : '';
  return `
    <div class="item-card${item.done ? ' done' : ''}" onclick="toggle(${item.id})">
      <div class="check-circle${item.done ? ' checked' : ''}">
        <i class="ti ti-check"></i>
      </div>
      <div class="item-info">
        <div class="item-name">${escapeHTML(item.name)}</div>
        ${qtyBadge}
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
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────
   Input listeners
───────────────────────────── */
document.getElementById('item-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

/* ─────────────────────────────
   Service Worker
───────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ─────────────────────────────
   Init
───────────────────────────── */
render();
