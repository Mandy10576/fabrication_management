const getApiBase = () => {
  if (typeof window !== 'undefined') {
    // If running on localhost development server (e.g., port 3000), target backend port 5000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  return '/api';
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API Request failed');
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API Request failed');
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API Request failed');
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API Request failed');
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API Request failed');
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
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  }
};
