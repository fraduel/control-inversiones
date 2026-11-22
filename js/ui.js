import { state, saveData } from './state.js';
import { fmtCurrency, fmtPct, calculateXIRR } from './finance.js';

export function renderPortfolioOverview() {
  const fPlat = document.getElementById('filterPlatform').value;
  const fProd = document.getElementById('filterProduct').value;

  // Filtrar productos según plataforma y producto seleccionados
  const filteredProducts = state.products.filter((p) => {
    if (fPlat && p.platform !== fPlat) return false;
    if (fProd && p.id !== fProd) return false;
    return true;
  });

  const allowedProductIds = new Set(filteredProducts.map((p) => p.id));

  // Filtrar entradas pertenecientes a esos productos
  const filteredEntries = state.entries.filter((e) => allowedProductIds.has(e.productId));

  const totalInvested = filteredEntries
    .filter((e) => e.type === 'SUSCRIPCIÓN')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalReturned = filteredEntries
    .filter((e) => e.type === 'REEMBOLSO')
    .reduce((sum, e) => sum + e.amount, 0);

  const netInvested = totalInvested - totalReturned;
  const totalCurrentVal = filteredProducts.reduce(
    (sum, p) => sum + (parseFloat(p.currentValue) || 0),
    0
  );
  const profit = totalCurrentVal + totalReturned - totalInvested;
  const globalXirr = calculateXIRR(filteredEntries, totalCurrentVal);

  document.getElementById('globalNetInvested').textContent = fmtCurrency(netInvested);
  document.getElementById('globalCurrentValue').textContent = fmtCurrency(totalCurrentVal);

  const profitEl = document.getElementById('globalProfit');
  profitEl.textContent = fmtCurrency(profit);
  profitEl.className = profit > 0 ? 'pos' : profit < 0 ? 'neg' : '';

  const xirrEl = document.getElementById('globalXirr');
  xirrEl.textContent = fmtPct(globalXirr);
  xirrEl.className = globalXirr > 0 ? 'pos' : globalXirr < 0 ? 'neg' : '';

  const tbody = document.getElementById('productsSummaryBody');
  if (filteredProducts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-msg">No hay productos para el filtro seleccionado.</td></tr>';
    return;
  }

  tbody.innerHTML = filteredProducts
    .map((prod) => {
      const pEntries = filteredEntries.filter((e) => e.productId === prod.id);
      const inv = pEntries
        .filter((e) => e.type === 'SUSCRIPCIÓN')
        .reduce((s, e) => s + e.amount, 0);
      const ret = pEntries
        .filter((e) => e.type === 'REEMBOLSO')
        .reduce((s, e) => s + e.amount, 0);
      const curVal = parseFloat(prod.currentValue) || 0;
      const pXirr = calculateXIRR(pEntries, curVal);

      // El peso (%) se calcula sobre el subconjunto filtrado seleccionado
      const baseTotal = totalCurrentVal > 0 ? totalCurrentVal : Math.max(0, netInvested);
      const baseProd = totalCurrentVal > 0 ? curVal : Math.max(0, inv - ret);
      const weight = baseTotal > 0 ? ((baseProd / baseTotal) * 100).toFixed(1) + '%' : '0%';
      const xirrClass = pXirr > 0 ? 'pos' : pXirr < 0 ? 'neg' : '';

      return `
        <tr>
          <td><strong>${prod.name}</strong></td>
          <td>${prod.platform}</td>
          <td class="amount">${fmtCurrency(inv)}</td>
          <td class="amount">${fmtCurrency(ret)}</td>
          <td>${weight}</td>
          <td>
            <input type="number" class="inline-val-input" step="0.01" min="0"
              value="${curVal}" data-prod-id="${prod.id}" title="Editar valor actual">
          </td>
          <td class="amount ${xirrClass}">${fmtPct(pXirr)}</td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('.inline-val-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const prod = state.products.find((p) => p.id === e.target.dataset.prodId);
      if (prod) {
        prod.currentValue = parseFloat(e.target.value) || 0;
        saveData();
        renderPortfolioOverview();
      }
    });
  });
}

export function populateFilters() {
  const yearSel = document.getElementById('filterYear');
  const platSel = document.getElementById('filterPlatform');
  const prodSel = document.getElementById('filterProduct');

  const [curYear, curPlat, curProd] = [yearSel.value, platSel.value, prodSel.value];

  const years = [...new Set(state.entries.map((e) => e.date.slice(0, 4)))].sort().reverse();
  const platforms = [...new Set(state.products.map((p) => p.platform))].sort();

  yearSel.innerHTML =
    '<option value="">Todos los años</option>' +
    years.map((y) => `<option value="${y}">${y}</option>`).join('');

  platSel.innerHTML =
    '<option value="">Todas las plataformas</option>' +
    platforms.map((p) => `<option value="${p}">${p}</option>`).join('');

  prodSel.innerHTML =
    '<option value="">Todos los productos</option>' +
    state.products.map((p) => `<option value="${p.id}">${p.name} (${p.platform})</option>`).join('');

  yearSel.value = curYear;
  platSel.value = curPlat;
  prodSel.value = curProd;
}

export function renderTable() {
  const fYear = document.getElementById('filterYear').value;
  const fPlat = document.getElementById('filterPlatform').value;
  const fProd = document.getElementById('filterProduct').value;

  const filtered = state.entries
    .filter((entry) => {
      const prod = state.products.find((p) => p.id === entry.productId);
      if (!prod) return false;
      if (fYear && !entry.date.startsWith(fYear)) return false;
      if (fPlat && prod.platform !== fPlat) return false;
      if (fProd && prod.id !== fProd) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const tbody = document.getElementById('entriesBody');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-msg">No hay entradas registradas. Pulsa F1 para crear una.</td></tr>';
    return;
  }

  filtered.forEach((entry) => {
    const prod = state.products.find((p) => p.id === entry.productId);
    const tr = document.createElement('tr');
    if (entry.id === state.selectedEntryId) tr.classList.add('selected');

    tr.addEventListener('click', () => selectRow(entry.id));
    tr.addEventListener('dblclick', () => {
      selectRow(entry.id);
      editSelected();
    });

    const badgeClass = entry.type === 'SUSCRIPCIÓN' ? 'sub' : 'red';
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td><span class="badge ${badgeClass}">${entry.type}</span></td>
      <td><strong>${prod.name}</strong></td>
      <td>${prod.platform}</td>
      <td class="amount">${fmtCurrency(entry.amount)}</td>
    `;
    tbody.appendChild(tr);
  });
}

export function selectRow(id) {
  state.selectedEntryId = id;
  document.getElementById('btnEdit').disabled = false;
  document.getElementById('btnDelete').disabled = false;
  renderTable();
}

export function deleteSelected() {
  if (!state.selectedEntryId) return;
  const entry = state.entries.find((e) => e.id === state.selectedEntryId);
  if (!entry) return;

  if (!confirm(`¿Eliminar esta ${entry.type} de ${fmtCurrency(entry.amount)} (${entry.date})?`)) {
    return;
  }

  state.entries = state.entries.filter((e) => e.id !== state.selectedEntryId);

  const remainingForProd = state.entries.filter((e) => e.productId === entry.productId);
  if (remainingForProd.length === 0) {
    state.products = state.products.filter((p) => p.id !== entry.productId);
  }

  state.selectedEntryId = null;
  document.getElementById('btnEdit').disabled = true;
  document.getElementById('btnDelete').disabled = true;

  saveData();
  refreshAll();
}

export function openModal(mode) {
  state.modalMode = mode;
  document.getElementById('modalTitle').textContent =
    mode === 'create' ? 'Nueva Entrada (F1)' : 'Modificar Entrada (F2)';

  const prodSelect = document.getElementById('entryProduct');
  prodSelect.innerHTML =
    '<option value="__NEW__">+ Nuevo producto...</option>' +
    state.products.map((p) => `<option value="${p.id}">${p.name} (${p.platform})</option>`).join('');

  if (mode === 'create') {
    document.getElementById('entryForm').reset();
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    prodSelect.value = state.products.length > 0 ? state.products[0].id : '__NEW__';
  } else if (mode === 'edit' && state.selectedEntryId) {
    const entry = state.entries.find((e) => e.id === state.selectedEntryId);
    document.getElementById('entryDate').value = entry.date;
    document.getElementById('entryAmount').value = entry.amount;
    document.getElementById('entryType').value = entry.type;
    prodSelect.value = entry.productId;
  }

  handleProductChange();
  document.getElementById('modalBackdrop').classList.add('open');
}

export function editSelected() {
  if (!state.selectedEntryId) return;
  openModal('edit');
}

export function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

export function handleProductChange() {
  const val = document.getElementById('entryProduct').value;
  const newBox = document.getElementById('newProductBox');
  const statsBox = document.getElementById('productStats');
  const nameInput = document.getElementById('newProdName');
  const platInput = document.getElementById('newProdPlatform');

  if (val === '__NEW__') {
    newBox.classList.add('visible');
    statsBox.classList.remove('visible');
    nameInput.required = true;
    platInput.required = true;
  } else {
    newBox.classList.remove('visible');
    nameInput.required = false;
    platInput.required = false;
    const prod = state.products.find((p) => p.id === val);
    document.getElementById('modalCurrentValue').value = prod ? prod.currentValue || 0 : 0;
    updateProductStats(val);
    statsBox.classList.add('visible');
  }
}

export function updateProductStats(productId) {
  const currentVal = parseFloat(document.getElementById('modalCurrentValue').value) || 0;

  const prodEntries = state.entries
    .filter((e) => e.productId === productId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const invested = prodEntries
    .filter((e) => e.type === 'SUSCRIPCIÓN')
    .reduce((sum, e) => sum + e.amount, 0);

  const returned = prodEntries
    .filter((e) => e.type === 'REEMBOLSO')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalGlobalInvested = state.entries.reduce(
    (sum, e) => sum + (e.type === 'SUSCRIPCIÓN' ? e.amount : -e.amount),
    0
  );
  const netProduct = Math.max(0, invested - returned);
  const pct = totalGlobalInvested > 0 ? ((netProduct / totalGlobalInvested) * 100).toFixed(1) : 0;
  const xirr = calculateXIRR(prodEntries, currentVal);

  document.getElementById('statPct').textContent = `${pct}%`;
  document.getElementById('statInvested').textContent = fmtCurrency(invested);
  document.getElementById('statReturned').textContent = fmtCurrency(returned);
  document.getElementById('statOpenDate').textContent =
    prodEntries.length > 0 ? prodEntries[0].date : 'Sin movimientos';

  const statXirrEl = document.getElementById('statXirr');
  statXirrEl.textContent = fmtPct(xirr);
  statXirrEl.className = xirr > 0 ? 'pos' : xirr < 0 ? 'neg' : '';

  const histBody = document.getElementById('productHistoryBody');
  histBody.innerHTML =
    prodEntries.length === 0
      ? '<tr><td colspan="3" class="empty-msg">Aún no hay entradas</td></tr>'
      : prodEntries
          .map(
            (e) => `
        <tr>
          <td>${e.date}</td>
          <td>${e.type}</td>
          <td>${fmtCurrency(e.amount)}</td>
        </tr>
      `
          )
          .join('');
}

export function saveEntry(e) {
  e.preventDefault();
  const date = document.getElementById('entryDate').value;
  const amount = parseFloat(document.getElementById('entryAmount').value);
  const type = document.getElementById('entryType').value;
  let productId = document.getElementById('entryProduct').value;

  if (productId === '__NEW__') {
    const name = document.getElementById('newProdName').value.trim();
    const platform = document.getElementById('newProdPlatform').value.trim();
    const newProd = { id: 'prod_' + Date.now(), name, platform, currentValue: 0 };
    state.products.push(newProd);
    productId = newProd.id;
  } else {
    const prod = state.products.find((p) => p.id === productId);
    if (prod) {
      prod.currentValue = parseFloat(document.getElementById('modalCurrentValue').value) || 0;
    }
  }

  if (state.modalMode === 'create') {
    state.entries.push({ id: 'ent_' + Date.now(), date, amount, type, productId });
  } else {
    const idx = state.entries.findIndex((item) => item.id === state.selectedEntryId);
    if (idx !== -1) {
      state.entries[idx] = { ...state.entries[idx], date, amount, type, productId };
    }
  }

  saveData();
  refreshAll();
  closeModal();
}

export function refreshAll() {
  renderPortfolioOverview();
  populateFilters();
  renderTable();
}

