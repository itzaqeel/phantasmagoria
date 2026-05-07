// public/js/api.js

const API_BASE_URL = 'http://localhost:8082/api'; // Adjust port if needed

const API = {
    // We'll store a 'master' developer key here for the dashboard.
    // In a production app, this would be handled via a secure session or login.
    key: localStorage.getItem('token') || '',

    async request(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.key) {
            headers['Authorization'] = `Bearer ${this.key}`;
        }

        const options = { method, headers };
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
    
    setKey(key) {
        this.key = key;
        localStorage.setItem('dashboard_api_key', key);
    }
};
