# Phantasmagoria Analytical Dashboard (CW2)

The Analytical Dashboard is a dedicated frontend client designed to consume the General Platform (CW1) APIs to generate high-fidelity data visualizations, export PDF/CSV reports, and manage local filter presets.

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Copy the example environment file and configure the settings.
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in `CW1_API_URL` (usually `http://localhost:3000/api`) and the `CW1_API_KEY`. 
   > **Note:** The API Key must be generated from the General Platform's Admin Panel and have `read:analytics` and `read:alumni` permissions.

3. **Run the Server:**
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:4000`.

## Architecture Details

### Secure Server-Side Proxy Pattern
To maintain strict security and avoid exposing the `CW1_API_KEY` to the public internet or the user's browser, the Analytical Dashboard employs a server-side proxy pattern.
- The Node.js server (`app.js`) intercepts all requests starting with `/api/analytics` or `/api/auth`.
- It securely injects the `CW1_API_KEY` Bearer token into the Authorization header.
- It forwards the request to the CW1 backend, masking the true origin and securing the key.

### Frontend Technologies
- **Vanilla JavaScript:** No heavy frameworks used, ensuring optimal load times.
- **Chart.js:** Utilized for rendering dynamic, interactive HTML5 Canvas charts.
- **html2pdf.js:** Used for taking high-quality snapshots of the charts and compiling them into custom multi-page PDF reports.
- **LocalStorage:** Used for persisting user-defined filter presets across sessions.
