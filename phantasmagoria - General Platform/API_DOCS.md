# Phantasmagoria API Documentation

This document outlines the primary RESTful API endpoints available in the General Platform (CW1).

## Base URL
`http://localhost:3000/api`

---

## 1. Authentication Endpoints

### Login
`POST /auth/login`
Authenticates a user and returns a signed JSON Web Token (JWT).

**Request Body:**
```json
{
  "email": "user@my.westminster.ac.uk",
  "password": "securepassword123"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@my.westminster.ac.uk",
    "role": "alumni"
  }
}
```

---

## 2. API Token Management (Developer Only)

### Generate API Token
`POST /admin/tokens`
Generates a new secure Bearer token for third-party systems.
*Requires JWT Authorization (`role: developer`)*

**Request Body:**
```json
{
  "token_name": "Analytics Dashboard",
  "permissions": ["read:analytics", "read:alumni"]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "API token generated. Copy it now, it will never be shown again.",
  "token_id": 12,
  "token_name": "Analytics Dashboard",
  "permissions": ["read:analytics", "read:alumni"],
  "api_token": "a1b2c3d4e5f6g7h8..."
}
```

---

## 3. Analytics Endpoints (Requires API Token)

All analytics endpoints require an API Token passed in the `Authorization` header.
`Authorization: Bearer <API_TOKEN>`

### Overview Statistics
`GET /analytics/overview`
*Requires Permission: `read:analytics`*

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalAlumni": 1420,
    "totalCertifications": 850,
    "totalDegrees": 1420
  }
}
```

### Alumni Directory Search
`GET /analytics/alumni?programme=Computer%20Science&industry=Technology`
*Requires Permission: `read:alumni`*

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "email": "w1234567@my.westminster.ac.uk",
      "first_name": "John",
      "last_name": "Doe",
      "degree_name": "Computer Science",
      "graduation_year": 2024,
      "industry_sector": "Technology",
      "job_title": "Software Engineer"
    }
  ]
}
```

### System Status
`GET /analytics/system-status`
Retrieves the permissions and scope of the currently provided API token.

**Success Response (200 OK):**
```json
{
  "success": true,
  "token_name": "Analytics Dashboard",
  "permissions": ["read:analytics", "read:alumni"]
}
```

### 403 Forbidden Response Example
If the provided API key lacks the required permission scope (e.g., attempting to hit `/analytics/overview` without `read:analytics`):
```json
{
  "success": false,
  "message": "Forbidden. This token does not have the 'read:analytics' permission."
}
```
