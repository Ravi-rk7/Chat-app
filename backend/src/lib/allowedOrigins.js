const DEFAULT_CLIENT_URL = "http://localhost:5173";

const parseOrigins = (value) =>
    value
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean);

export const allowedOrigins = parseOrigins(process.env.CLIENT_URL || DEFAULT_CLIENT_URL);
