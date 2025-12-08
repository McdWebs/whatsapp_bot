# API Documentation

## Base URL

Production: `https://your-service.onrender.com`
Development: `http://localhost:3000`

## Authentication

Admin endpoints require API key authentication:

```
X-API-Key: your_admin_api_key
```

Or via Authorization header:

```
Authorization: Bearer your_admin_api_key
```

## Endpoints

### Health Check

#### GET /health

Check service health status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected"
  }
}
```

#### GET /health/ready

Check if service is ready to accept requests.

**Response**:
```json
{
  "status": "ready"
}
```

### WhatsApp Webhook

#### POST /webhook/whatsapp

Receive incoming WhatsApp messages.

**Headers**:
- `X-Twilio-Signature` (or provider-specific signature header)

**Body**: Provider-specific webhook payload

**Response**:
```json
{
  "status": "ok"
}
```

### Admin Endpoints

#### GET /admin/stats

Get overall statistics.

**Headers**:
- `X-API-Key`: Admin API key

**Response**:
```json
{
  "users": {
    "total": 100
  },
  "reminders": {
    "total": 500,
    "sent": 450,
    "delivered": 400,
    "failed": 50
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /admin/stats/reminders

Get reminder statistics.

**Query Parameters**:
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response**:
```json
{
  "total": 500,
  "sent": 450,
  "delivered": 400,
  "failed": 50,
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

#### GET /admin/stats/users

Get user statistics.

**Response**:
```json
{
  "total": 100,
  "active": 80,
  "inactive": 20
}
```

#### GET /admin/users

Get list of users.

**Query Parameters**:
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "phone_number": "+972501234567",
      "current_state": "CONFIRMED",
      "created_at": "2024-01-01T00:00:00.000Z",
      "reminders": 3,
      "enabledReminders": 2
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 100
  }
}
```

#### GET /admin/users/:id

Get user details.

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "phone_number": "+972501234567",
    "current_state": "CONFIRMED",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "reminders": [
    {
      "id": "uuid",
      "type": "sunset",
      "time": null,
      "location": "Jerusalem",
      "enabled": true
    }
  ],
  "recentHistory": [
    {
      "id": "uuid",
      "type": "sunset",
      "sent_at": "2024-01-01T18:00:00.000Z",
      "delivery_status": "sent"
    }
  ]
}
```

#### POST /admin/export/sheets

Export all data to Google Sheets.

**Response**:
```json
{
  "success": true,
  "message": "Data exported to Google Sheets successfully",
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/..."
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- Webhook endpoints: No rate limiting (handled by provider)
- Admin endpoints: Consider implementing rate limiting for production

## Webhook Signature Verification

Webhooks verify signatures to ensure authenticity. Each provider has different signature methods:

- **Twilio**: Uses `X-Twilio-Signature` header
- **360dialog**: Uses `X-360dialog-Signature` header
- **MessageBird**: Uses `X-MessageBird-Signature` header

## Example Requests

### Get Statistics

```bash
curl -X GET \
  https://your-service.onrender.com/admin/stats \
  -H 'X-API-Key: your_admin_api_key'
```

### Export to Sheets

```bash
curl -X POST \
  https://your-service.onrender.com/admin/export/sheets \
  -H 'X-API-Key: your_admin_api_key'
```

### Get Users

```bash
curl -X GET \
  'https://your-service.onrender.com/admin/users?limit=50&offset=0' \
  -H 'X-API-Key: your_admin_api_key'
```

