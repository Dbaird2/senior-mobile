import { configureStore } from "@reduxjs/toolkit";
import auditReducer from "./app/auditSlice";

export const store = configureStore({
  reducer: {
    audit: auditReducer,
  },
});

