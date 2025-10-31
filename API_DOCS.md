# ECHOLOCK API Documentation

## Overview

ECHOLOCK provides a RESTful API for creating and managing cryptographic dead man's switches. The API uses JWT authentication, PostgreSQL storage, and integrates with Nostr relays for decentralized fragment distribution.

**Base URL:** `http://localhost:3000/api` (development)

**Authentication:** Bearer token in `Authorization` header

---

## Table of Contents

1. [Authentication](#authentication)
2. [Switch Management](#switch-management)
3. [User Management](#user-management)
4. [Error Handling](#error-handling)
5. [Rate Limits](#rate-limits)
6. [WebSocket Events](#websocket-events)

---

## Authentication

All authenticated endpoints require a JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### POST /api/auth/signup

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "message": "Account created successfully",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "emailVerificationRequired": true
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### POST /api/auth/login

Login with email and password to receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": true
    }
  }
}
```

**Token Expiry:**
- Access Token: 15 minutes
- Refresh Token: 7 days

**Rate Limit:** 5 requests per 15 minutes

---

### POST /api/auth/refresh

Refresh an expired access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

---

### POST /api/auth/verify-email

Verify email address with token sent via email.

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully",
  "data": {
    "email": "user@example.com",
    "verified": true
  }
}
```

---

### POST /api/auth/forgot-password

Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists with that email, a password reset link has been sent"
}
```

**Note:** Always returns success to prevent email enumeration.

---

### POST /api/auth/reset-password

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

### POST /api/auth/logout

Logout (client should delete stored tokens).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Switch Management

### POST /api/switches

Create a new dead man's switch.

**Headers:**
- `Authorization: Bearer <token>`
- Email must be verified

**Request Body:**
```json
{
  "title": "Emergency Access",
  "message": "My secret message to be released",
  "checkInHours": 72,
  "password": "encryption-password",
  "recipients": [
    {
      "email": "recipient@example.com",
      "name": "John Doe"
    }
  ],
  "useBitcoinTimelock": false
}
```

**Field Descriptions:**
- `title` (required): Switch title (max 100 chars)
- `message` (required): Secret message (max 10MB)
- `checkInHours` (required): Hours until trigger (1-8760)
- `password` (required): Encryption password (min 8 chars)
- `recipients` (required): Email recipients (max 10)
- `useBitcoinTimelock` (optional): Enable Bitcoin timelock proof

**Response (201):**
```json
{
  "message": "Switch created successfully",
  "data": {
    "id": "uuid",
    "title": "Emergency Access",
    "status": "ARMED",
    "checkInHours": 72,
    "expiresAt": "2025-10-30T12:00:00Z",
    "lastCheckIn": "2025-10-27T12:00:00Z",
    "checkInCount": 0,
    "fragmentCount": 5,
    "requiredFragments": 3,
    "recipients": [
      {
        "email": "recipient@example.com",
        "name": "John Doe"
      }
    ],
    "nostrDistribution": {
      "enabled": true,
      "publishedRelays": 7,
      "requiredPublishes": 5
    }
  }
}
```

**Rate Limit:** 5 switches per hour

**Status Values:**
- `ARMED` - Active, waiting for check-in
- `PAUSED` - Temporarily disabled
- `TRIGGERED` - Timer expired, releasing message
- `RELEASED` - Message sent to recipients
- `CANCELLED` - Deleted by user

---

### GET /api/switches

List all switches for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Switches retrieved successfully",
  "data": {
    "switches": [
      {
        "id": "uuid",
        "title": "Emergency Access",
        "status": "ARMED",
        "checkInHours": 72,
        "expiresAt": "2025-10-30T12:00:00Z",
        "lastCheckIn": "2025-10-27T12:00:00Z",
        "checkInCount": 5,
        "createdAt": "2025-10-01T12:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

### GET /api/switches/:id

Get details for a specific switch.

**Headers:** `Authorization: Bearer <token>`

**URL Parameters:**
- `id` - Switch UUID

**Response (200):**
```json
{
  "message": "Switch retrieved successfully",
  "data": {
    "id": "uuid",
    "title": "Emergency Access",
    "status": "ARMED",
    "checkInHours": 72,
    "expiresAt": "2025-10-30T12:00:00Z",
    "lastCheckIn": "2025-10-27T12:00:00Z",
    "checkInCount": 5,
    "fragmentCount": 5,
    "requiredFragments": 3,
    "recipients": [
      {
        "email": "recipient@example.com",
        "name": "John Doe"
      }
    ],
    "bitcoinTimelock": {
      "enabled": false
    }
  }
}
```

**Error (404):**
```json
{
  "error": "Switch not found",
  "message": "Switch does not exist or you do not have access"
}
```

---

### POST /api/switches/:id/checkin

Check in to reset the timer and prevent message release.

**Headers:** `Authorization: Bearer <token>`

**URL Parameters:**
- `id` - Switch UUID

**Response (200):**
```json
{
  "message": "Check-in successful",
  "data": {
    "id": "uuid",
    "title": "Emergency Access",
    "status": "ARMED",
    "expiresAt": "2025-10-30T12:00:00Z",
    "lastCheckIn": "2025-10-27T12:00:00Z",
    "checkInCount": 6,
    "hoursExtended": 72
  }
}
```

**Rate Limit:** 10 check-ins per hour per switch

**Errors:**
- `404` - Switch not found
- `400` - Cannot check in (status not ARMED)
- `429` - Too many check-ins

---

### PATCH /api/switches/:id

Update switch settings.

**Headers:** `Authorization: Bearer <token>`

**URL Parameters:**
- `id` - Switch UUID

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "PAUSED"
}
```

**Updateable Fields:**
- `title` - Switch title
- `status` - Status (ARMED, PAUSED, CANCELLED)

**Response (200):**
```json
{
  "message": "Switch updated successfully",
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    "status": "PAUSED"
  }
}
```

---

### DELETE /api/switches/:id

Cancel and delete a switch (prevents message release).

**Headers:** `Authorization: Bearer <token>`

**URL Parameters:**
- `id` - Switch UUID

**Response (200):**
```json
{
  "message": "Switch cancelled successfully",
  "data": {
    "id": "uuid",
    "status": "CANCELLED"
  }
}
```

---

### GET /api/switches/:id/check-ins

Get check-in history for a switch.

**Headers:** `Authorization: Bearer <token>`

**URL Parameters:**
- `id` - Switch UUID

**Response (200):**
```json
{
  "message": "Check-in history retrieved",
  "data": {
    "checkIns": [
      {
        "id": "uuid",
        "timestamp": "2025-10-27T12:00:00Z",
        "ip_address": "192.168.1.1"
      }
    ],
    "count": 50
  }
}
```

**Note:** Returns last 50 check-ins.

---

## User Management

### GET /api/users/me

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "User profile retrieved",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "createdAt": "2025-10-01T12:00:00Z",
    "lastLogin": "2025-10-27T12:00:00Z",
    "switchCount": 5
  }
}
```

---

### PATCH /api/users/me

Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "email": "newemail@example.com",
    "emailVerified": false
  }
}
```

**Note:** Changing email requires re-verification.

---

### DELETE /api/users/me

Delete user account and all associated switches.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "password": "current-password",
  "confirm": "DELETE MY ACCOUNT"
}
```

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized (invalid/missing token) |
| 403  | Forbidden (email not verified) |
| 404  | Not Found |
| 429  | Too Many Requests (rate limit) |
| 500  | Internal Server Error |

### Common Errors

**Authentication Required:**
```json
{
  "error": "Authentication required",
  "message": "No token provided"
}
```

**Token Expired:**
```json
{
  "error": "Token expired",
  "message": "Please refresh your token"
}
```

**Email Not Verified:**
```json
{
  "error": "Email not verified",
  "message": "Please verify your email address to continue"
}
```

**Rate Limit Exceeded:**
```json
{
  "error": "Too many requests",
  "message": "Please try again later"
}
```

**Validation Error:**
```json
{
  "error": "Validation error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Rate Limits

### Global API Limit
- **100 requests** per 15 minutes per IP

### Authentication Endpoints
- **5 requests** per 15 minutes per IP
- Applies to: `/api/auth/login`, `/api/auth/signup`

### Switch Creation
- **5 switches** per hour per user

### Check-Ins
- **10 check-ins** per hour per switch per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698422400
```

---

## WebSocket Events

Connect to WebSocket for real-time updates:

**URL:** `ws://localhost:3000/ws`

**Authentication:** Send access token after connection:
```json
{
  "type": "authenticate",
  "token": "eyJhbGc..."
}
```

### Events

**Switch Update:**
```json
{
  "type": "SWITCH_UPDATE",
  "data": {
    "id": "uuid",
    "title": "Emergency Access",
    "status": "ARMED",
    "expiresAt": "2025-10-30T12:00:00Z"
  }
}
```

**Check-In:**
```json
{
  "type": "CHECK_IN",
  "data": {
    "switchId": "uuid",
    "timestamp": "2025-10-27T12:00:00Z",
    "expiresAt": "2025-10-30T12:00:00Z"
  }
}
```

**Switch Released:**
```json
{
  "type": "SWITCH_RELEASED",
  "data": {
    "switchId": "uuid",
    "releasedAt": "2025-10-30T12:00:00Z"
  }
}
```

---

## Security Best Practices

### For API Consumers

1. **Store tokens securely**
   - Use httpOnly cookies or secure storage
   - Never expose tokens in URLs or logs

2. **Implement token refresh**
   - Refresh access tokens before expiry
   - Handle 401 errors gracefully

3. **Use HTTPS in production**
   - Never send tokens over HTTP
   - Validate SSL certificates

4. **Validate user input**
   - Sanitize all user inputs
   - Follow password requirements

5. **Handle rate limits**
   - Implement exponential backoff
   - Cache responses when possible

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Encryption Details

- **Message Encryption:** AES-256-GCM
- **Password Derivation:** PBKDF2 with 600,000 iterations
- **Secret Sharing:** Shamir Secret Sharing (3-of-5 threshold)
- **Fragment Authentication:** HMAC-SHA256
- **JWT Algorithm:** HS256

---

## Example Client Implementation

### JavaScript/Node.js

```javascript
const ECHOLOCK_API = 'http://localhost:3000/api';

class EchoLockClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(email, password) {
    const response = await fetch(`${ECHOLOCK_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
      return data.data.user;
    }

    throw new Error(data.message);
  }

  async createSwitch(switchData) {
    const response = await fetch(`${ECHOLOCK_API}/switches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(switchData)
    });

    const data = await response.json();

    if (response.ok) {
      return data.data;
    }

    // Handle token expiry
    if (response.status === 401) {
      await this.refreshAccessToken();
      return this.createSwitch(switchData); // Retry
    }

    throw new Error(data.message);
  }

  async checkIn(switchId) {
    const response = await fetch(`${ECHOLOCK_API}/switches/${switchId}/checkin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      return data.data;
    }

    throw new Error(data.message);
  }

  async refreshAccessToken() {
    const response = await fetch(`${ECHOLOCK_API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    const data = await response.json();

    if (response.ok) {
      this.accessToken = data.data.accessToken;
    } else {
      // Refresh token expired, need to login again
      throw new Error('Session expired');
    }
  }
}

// Usage
const client = new EchoLockClient();

await client.login('user@example.com', 'password');

const switchData = {
  title: 'Emergency Access',
  message: 'Secret message',
  checkInHours: 72,
  password: 'encryption-password',
  recipients: [
    { email: 'recipient@example.com', name: 'John Doe' }
  ]
};

const newSwitch = await client.createSwitch(switchData);
console.log('Switch created:', newSwitch.id);

await client.checkIn(newSwitch.id);
console.log('Check-in successful');
```

---

## Testing

### Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "database": {
    "connected": true,
    "error": null
  },
  "websocket": {
    "connectedClients": 5,
    "connectedUsers": 3
  }
}
```

### API Info

```bash
curl http://localhost:3000/api
```

**Response:**
```json
{
  "name": "EchoLock API",
  "version": "1.0.0",
  "description": "Censorship-resistant dead man's switch using Nostr protocol",
  "documentation": "/api/docs",
  "endpoints": {
    "health": "/health",
    "auth": "/api/auth",
    "switches": "/api/switches",
    "users": "/api/users"
  }
}
```

---

## Support

For issues or questions:
- GitHub: https://github.com/echolock/echolock
- Documentation: https://docs.echolock.xyz

---

**Version:** 1.0.0
**Last Updated:** October 2025
