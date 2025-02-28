// Existing constants
export const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

// Application settings with defaults
export const DEFAULT_APP_SETTINGS = {
  maxParallelStepAnalysis: 1,
};
