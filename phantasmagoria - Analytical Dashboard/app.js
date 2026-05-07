const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
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
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "https://*"],
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
app.get('/health', (req, res) => {
    res.json({ status: 'up', timestamp: new Date() });
});

// Fallback for SPA (404)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Analytical Dashboard running on http://localhost:${PORT}`);
});
