import { state, saveData } from './state.js';
import { refreshAll } from './ui.js';

export function exportJSON() {
  const data = JSON.stringify(
    { products: state.products, entries: state.entries },
    null,
    2
  );
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inversiones_backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed.products) && Array.isArray(parsed.entries)) {
        state.products = parsed.products;
        state.entries = parsed.entries;
        state.selectedEntryId = null;
        saveData();
        refreshAll();
        alert('Copia de seguridad restaurada correctamente.');
      } else {
        alert('El archivo JSON no tiene un formato válido.');
      }
    } catch {
      alert('Error al leer el archivo JSON.');
    }
  };

  reader.readAsText(file);
  event.target.value = '';
}

export function exportCSV() {
  const headers = ['Fecha', 'Operacion', 'Producto', 'Plataforma', 'Importe'];
  const rows = state.entries.map((entry) => {
    const prod = state.products.find((p) => p.id === entry.productId) || {
      name: '',
      platform: ''
    };
    return [
      entry.date,
      entry.type,
      `"${prod.name.replace(/"/g, '""')}"`,
      `"${prod.platform.replace(/"/g, '""')}"`,
      entry.amount.toFixed(2).replace('.', ',')
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inversiones_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

