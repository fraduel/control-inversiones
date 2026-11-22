import { state } from './state.js';

import {
  openModal,
  editSelected,
  deleteSelected,
  closeModal,
  renderTable,
  renderPortfolioOverview,
  handleProductChange,
  updateProductStats,
  saveEntry,
  refreshAll
} from './ui.js';

import { exportJSON, importJSON, exportCSV } from './backup.js';

function initApp() {
  document.getElementById('btnNew')?.addEventListener('click', () => openModal('create'));
  document.getElementById('btnEdit')?.addEventListener('click', editSelected);
  document.getElementById('btnDelete')?.addEventListener('click', deleteSelected);
  document.getElementById('btnCloseTop')?.addEventListener('click', closeModal);
  document.getElementById('btnCancel')?.addEventListener('click', closeModal);

  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSON);
  document.getElementById('btnImportJSON')?.addEventListener('click', () =>
    document.getElementById('importFile')?.click()
  );
  document.getElementById('importFile')?.addEventListener('change', importJSON);
  document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    document.getElementById('filterYear')?.addEventListener('change', renderTable);
  document.getElementById('filterPlatform')?.addEventListener('change', () => {
    renderPortfolioOverview();
    renderTable();
  });
  document.getElementById('filterProduct')?.addEventListener('change', () => {
    renderPortfolioOverview();
    renderTable();
  });

  document.getElementById('entryProduct')?.addEventListener('change', handleProductChange);
  document.getElementById('modalCurrentValue')?.addEventListener('input', () => {
    const val = document.getElementById('entryProduct').value;
    if (val !== '__NEW__') updateProductStats(val);
  });
  document.getElementById('entryForm')?.addEventListener('submit', saveEntry);
  document.getElementById('showClosedProducts')?.addEventListener('change', renderPortfolioOverview);

  document.getElementById('modalProductClosed')?.addEventListener('change', (e) => {
    const valInput = document.getElementById('modalCurrentValue');
    if (e.target.checked) {
      valInput.value = 0;
      valInput.disabled = true;
    } else {
      valInput.disabled = false;
    }
    const prodId = document.getElementById('entryProduct').value;
    if (prodId !== '__NEW__') updateProductStats(prodId);
  });


  window.addEventListener(
    'keydown',
    (e) => {
      const modal = document.getElementById('modalBackdrop');
      const isModalOpen = modal && modal.classList.contains('open');
      const activeTag = document.activeElement?.tagName;
      const isInputFocused = ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag);

      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        openModal('create');
        setTimeout(() => document.getElementById('entryAmount')?.focus(), 50);
      } else if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        if (state.selectedEntryId) {
          editSelected();
          setTimeout(() => document.getElementById('entryAmount')?.focus(), 50);
        }
      } else if (e.key === 'Delete' && !isModalOpen && !isInputFocused) {
        e.preventDefault();
        if (state.selectedEntryId) deleteSelected();
      } else if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        closeModal();
      }
    },
    true
  );

  refreshAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

