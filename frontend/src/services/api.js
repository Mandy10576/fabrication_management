/**
 * Single source of truth for the API origin.
 *
 * Always relative by default: in development Vite proxies `/api` to the backend
 * (see `server.proxy` in vite.config.js), and in production vercel.json routes
 * it to the serverless function. Previously this hardcoded
 * `http://localhost:5000` on localhost, which bypassed the proxy entirely and
 * duplicated the port across three files — so when something else grabbed 5000,
 * requests silently went to that other server instead of failing loudly.
 *
 * Set VITE_API_BASE_URL to point at a backend on another host/port.
 */
export const getApiBase = () => {
  const override = import.meta.env?.VITE_API_BASE_URL;
  return override ? override.replace(/\/$/, '') : '/api';
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponseError = async (res, defaultMsg = 'API Request failed') => {
  let msg = '';
  let payload = null;
  try {
    const data = await res.json();
    payload = data;
    msg = data.error || data.message || data.detail || '';
  } catch (e) {
    try {
      const text = await res.text();
      if (text && text.length < 200 && !text.trim().startsWith('<')) {
        msg = text.trim();
      }
    } catch (e2) {}
  }
  if (!msg) {
    msg = res.statusText ? `Error ${res.status}: ${res.statusText}` : `Server Error (${res.status})`;
  }
  // Keep the status and parsed body on the error so callers that need to react
  // to a specific failure (e.g. a 409 duplicate carrying the existing record)
  // can, without changing the message-only contract everything else relies on.
  const err = new Error(msg);
  err.status = res.status;
  err.data = payload;
  throw err;
};

// In-memory & Session cache for sub-10ms instant page loads
const cacheMap = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

const getCachedData = (key) => {
  if (cacheMap.has(key)) {
    const { data, timestamp } = cacheMap.get(key);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      return data;
    }
  }
  try {
    const raw = sessionStorage.getItem('api_cache_' + key);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        cacheMap.set(key, { data, timestamp });
        return data;
      }
    }
  } catch (e) {}
  return null;
};

const setCachedData = (key, data) => {
  const timestamp = Date.now();
  cacheMap.set(key, { data, timestamp });
  try {
    sessionStorage.setItem('api_cache_' + key, JSON.stringify({ data, timestamp }));
  } catch (e) {}
};

export const clearApiCache = () => {
  cacheMap.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('api_cache_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {}
};

export const api = {
  async get(endpoint, skipCache = false) {
    const API_BASE = getApiBase();

    // Check cache first for instant 0ms response
    if (!skipCache) {
      const cached = getCachedData(endpoint);
      if (cached) {
        // Revalidate in background asynchronously
        fetch(`${API_BASE}${endpoint}`, { headers: getHeaders() })
          .then(res => res.ok ? res.json() : null)
          .then(freshData => {
            if (freshData) setCachedData(endpoint, freshData);
          })
          .catch(() => {});

        return cached;
      }
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    const data = await res.json();
    setCachedData(endpoint, data);
    return data;
  },

  async post(endpoint, body) {
    clearApiCache(); // Invalidate cache on mutations
    const API_BASE = getApiBase();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },

  async put(endpoint, body) {
    clearApiCache(); // Invalidate cache on mutations
    const API_BASE = getApiBase();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },

  async patch(endpoint, body) {
    clearApiCache(); // Invalidate cache on mutations
    const API_BASE = getApiBase();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },

  async delete(endpoint) {
    clearApiCache(); // Invalidate cache on mutations
    const API_BASE = getApiBase();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      await handleResponseError(res);
    }
    return res.json();
  },

  async upload(endpoint, formData) {
    clearApiCache(); // Invalidate cache on mutations
    const API_BASE = getApiBase();
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      await handleResponseError(res, 'Upload failed');
    }
    return res.json();
  }
};

