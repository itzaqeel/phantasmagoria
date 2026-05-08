const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios'); // For proxying
const path = require('path');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "https://*"],
            "connect-src": ["'self'", "http://localhost:3000", "http://127.0.0.1:3000"],
        },
    },
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session for Dashboard Users
app.use(session({
    secret: process.env.SESSION_SECRET || 'dashboard-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 3600000 // 1 hour
    }
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api', limiter);

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'up', timestamp: new Date() });
});

// --- API Proxying Architecture ---
// 
// Why do we proxy? 
// 1. Security: We need to consume data from the General Platform (CW1), which requires
//    a secret API Bearer Token. If the frontend (Vanilla JS) made these requests directly,
//    the secret key would be exposed to the client's browser.
// 2. CORS Bypass: By having our server make the request, we bypass browser CORS restrictions.
// 
// ALGORITHM:
// 1. Intercept all `/api/analytics/*` traffic originating from the Dashboard UI.
// 2. Read the `CW1_API_KEY` from the hidden `.env` file.
// 3. Construct a new server-to-server request to `CW1_API_URL` using axios.
// 4. Inject the Bearer Token into the headers.
// 5. Stream the response back to the Dashboard UI seamlessly.

// 1. Analytics Proxy (Requires API Key Injection)
app.use('/api/analytics', async (req, res) => {
    try {
        const endpoint = req.path;
        const rawKey = process.env.CW1_API_KEY;
        const apiKey = rawKey ? rawKey.trim() : null;
        
        console.log(`[PROXY] Request: analytics${endpoint}`);
        console.log(`[PROXY] Key present: ${!!apiKey} | Key length: ${apiKey ? apiKey.length : 0}`);

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            return res.status(500).json({ 
                success: false, 
                message: 'Dashboard Error: CW1_API_KEY is not configured in .env' 
            });
        }

        const response = await axios({
            method: req.method,
            url: `${process.env.CW1_API_URL}/analytics${endpoint}`,
            params: req.query,
            data: req.body,
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (response.data.success && response.data.data) {
            res.json(response.data.data);
        } else {
            res.json(response.data);
        }
    } catch (err) {
        console.error('Analytics Proxy Error:', err.message);
        res.status(err.response?.status || 500).json({
            success: false,
            message: 'Failed to fetch data from General Platform',
            error: err.response?.data?.message || err.message
        });
    }
});

// 2. General API Proxy (Pass-through for Auth, Profile, etc.)
app.use('/api', async (req, res) => {
    try {
        const endpoint = req.path;
        const url = `${process.env.CW1_API_URL}${endpoint}`;

        // For forgot-password, we must tell CW1 our own origin so it
        // constructs the reset URL pointing back to THIS dashboard's
        // reset-password page rather than CW1's own page.
        const forwardHeaders = {
            ...req.headers,
            host: new URL(process.env.CW1_API_URL).host
        };
        if (endpoint === '/auth/forgot-password') {
            const dashboardUrl = process.env.DASHBOARD_URL || `http://localhost:${process.env.PORT || 4000}`;
            forwardHeaders['origin'] = dashboardUrl;
        }

        const response = await axios({
            method: req.method,
            url: url,
            data: req.body,
            params: req.query,
            headers: forwardHeaders,
            validateStatus: () => true
        });

        res.status(response.status).json(response.data);
    } catch (err) {
        console.error('General Proxy Error:', err.message);
        res.status(500).json({ success: false, message: 'Proxy connection failed.' });
    }
});

// Fallback for SPA (404)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Analytical Dashboard running on http://localhost:${PORT}`);
});
