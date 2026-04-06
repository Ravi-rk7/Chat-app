const trimTrailingSlashes = (value) => value.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlashes(
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
);

export const SOCKET_URL = trimTrailingSlashes(
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api$/, "")
);
