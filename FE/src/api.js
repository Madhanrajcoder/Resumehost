const origin = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

export const apiBase = origin || (import.meta.env.DEV ? '' : null);
