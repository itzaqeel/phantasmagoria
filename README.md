# Phantasmagoria Ecosystem

**Author:** Aqeel Aslam  
**IIT No:** 20220628  
**UOW No:** w1953295  

The Phantasmagoria ecosystem is a dual-platform architecture designed to provide a robust, secure, and scalable environment for managing university alumni engagement and analyzing platform metrics.

This repository is split into two distinct codebases representing different coursework components:

1. **[Phantasmagoria General Platform (CW1)](./phantasmagoria%20-%20General%20Platform/)**: The core backend API and user-facing portal. Handles authentication, database operations, alumni bidding mechanics, and API key management.
2. **[Analytical Dashboard (CW2)](./phantasmagoria%20-%20Analytical%20Dashboard/)**: A dedicated, isolated frontend client that consumes the CW1 API to generate complex data visualizations, export custom PDF reports, and provide deep insights into platform usage.

## Architecture & Component Separation

### 1. Database Layer (SQLite)
The system relies on a unified relational database powered by SQLite (or MySQL depending on the environment configuration). The database is strictly isolated and can **only** be accessed by the General Platform (CW1) backend. The Analytical Dashboard (CW2) never communicates with the database directly.

### 2. Backend API Layer (Node.js/Express)
Located entirely within the `CW1` folder, the Express backend serves as the source of truth for the entire ecosystem.
- Exposes RESTful endpoints (`/api/auth`, `/api/bids`, `/api/analytics`).
- Enforces strict stateless JWT authentication for users and API Token Bearer authentication for external systems (like CW2).
- Executes complex background tasks via scheduled cron jobs (`bidScheduler.js`).

### 3. Frontend Clients ( JS / HTML / CSS)
- **General Platform UI:** Served directly by the CW1 Node server, providing the Alumni user experience and Developer Admin portal.
- **Analytical Dashboard:** A standalone Node/Express server (`app.js` in CW2 folder) that acts primarily as a secure proxy and static file server. It serves the Dashboard UI and securely proxies cross-origin requests to the CW1 API, injecting a hidden `.env` API key to retrieve data without exposing credentials to the browser.

## Getting Started

Please refer to the specific README files located inside each project folder for setup and execution instructions:
- [General Platform (CW1) Documentation](./phantasmagoria%20-%20General%20Platform/README.md)
- [Analytical Dashboard (CW2) Documentation](./phantasmagoria%20-%20Analytical%20Dashboard/README.md)
- [API Endpoints Documentation](./phantasmagoria%20-%20General%20Platform/API_DOCS.md)
