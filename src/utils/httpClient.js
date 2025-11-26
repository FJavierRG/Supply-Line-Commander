let tokenProvider = null;

function resolveBaseUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const base = typeof window !== 'undefined' ? (window.__API_BASE_URL__ || '') : '';
    return `${base}${path}`;
}

export function setHttpTokenProvider(provider) {
    tokenProvider = provider;
}

async function request(method, url, { data, headers = {}, auth = true } = {}) {
    const requestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    if (data !== undefined) {
        requestInit.body = JSON.stringify(data);
    }

    if (auth && tokenProvider) {
        const token = await tokenProvider();
        if (token) {
            requestInit.headers.Authorization = `Bearer ${token}`;
        }
    }

    const response = await fetch(resolveBaseUrl(url), requestInit);
    const contentType = response.headers.get('content-type');

    let payload = null;
    if (contentType && contentType.includes('application/json')) {
        payload = await response.json();
    } else {
        payload = await response.text();
    }

    if (!response.ok) {
        const error = new Error(payload?.error || response.statusText);
        error.status = response.status;
        error.body = payload;
        throw error;
    }

    return payload;
}

export const http = {
    get: (url, options = {}) => request('GET', url, options),
    post: (url, data, options = {}) => request('POST', url, { ...options, data }),
    put: (url, data, options = {}) => request('PUT', url, { ...options, data }),
    delete: (url, options = {}) => request('DELETE', url, options)
};

