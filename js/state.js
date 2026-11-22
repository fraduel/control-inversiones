export const state = {
  products: JSON.parse(localStorage.getItem('inv_products')) || [],
  entries: JSON.parse(localStorage.getItem('inv_entries')) || [],
  selectedEntryId: null,
  modalMode: 'create'
};

export function saveData() {
  localStorage.setItem('inv_products', JSON.stringify(state.products));
  localStorage.setItem('inv_entries', JSON.stringify(state.entries));
}

