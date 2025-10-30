import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  fileInfo: null,
  columns: [],
  rows: [],
  hiddenCols: {},
  byHeader: {},
};

const auditSlice = createSlice({
  name: "audit",
  initialState,
  reducers: {
    setData(state, action) {
      const { fileInfo, columns, rows } = action.payload;
      state.fileInfo = fileInfo ?? null;
      state.columns = Array.isArray(columns) ? columns : [];
      state.rows = Array.isArray(rows) ? rows : [];
      state.hiddenCols = {};
    },
    toggleColumn(state, action) {
      const k = action.payload;
      state.hiddenCols[k] = !state.hiddenCols[k];
    },
    showColumn(state, action) {
      state.hiddenCols[action.payload] = false;
    },
    hideColumn(state, action) {
      state.hiddenCols[action.payload] = true;
    },
    clear(state) {
      state.fileInfo = null;
      state.columns = [];
      state.rows = [];
      state.hiddenCols = {};
    },
  },
});

export const { setData, toggleColumn, showColumn, hideColumn, clear } = auditSlice.actions;
export default auditSlice.reducer;

