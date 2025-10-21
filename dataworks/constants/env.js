import Constants from "expo-constants";

const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};

// API base: env -> app.json -> emulator localhost
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  extra.EXPO_PUBLIC_API_BASE ||
  "http://10.0.2.2:8000";

// Auth guard: env overrides app.json
const rawAuth =
  process.env.EXPO_PUBLIC_AUTH_REQUIRED ??
  extra.AUTH_REQUIRED;
export const AUTH_REQUIRED =
  rawAuth === true || rawAuth === "true" || rawAuth === "1" || rawAuth === 1;

// Mocks flag: env overrides app.json
const rawMocks =
  process.env.EXPO_PUBLIC_USE_MOCKS ??
  extra.USE_MOCKS;
export const USE_MOCKS =
  rawMocks === true || rawMocks === "true" || rawMocks === "1" || rawMocks === 1;