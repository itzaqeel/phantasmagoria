// public/js/api.js

const API_BASE_URL = '/api'; // Point to our own Dashboard Proxy

const API = {
    // Current user's session token (from auth.js)
    token: localStorage.getItem('token') || '',
    csrfToken: null,

    async fetchCsrfToken() {
        try {
            const response = await fetch(`${API_BASE_URL}/csrf-token`, { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                this.csrfToken = data.csrfToken;
                console.log('[SECURITY] CSRF Token Synchronized.');
            }
        } catch (err) {
            console.error('Failed to fetch CSRF token:', err);
        }
    },

    async request(endpoint, method = 'GET', body = null) {
        if (!this.csrfToken && endpoint !== '/csrf-token') {
            await this.fetchCsrfToken();
        }

        const headers = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.csrfToken || ''
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const options = { 
            method, 
            headers,
            credentials: 'include' // Important for session cookies
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const data = await response.json();
            return { ok: response.ok, data };
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            return { ok: false, data: { message: 'Network error or server unreachable' } };
        }
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, body) { return this.request(endpoint, 'POST', body); },

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    },

    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
};
