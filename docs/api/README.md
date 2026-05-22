# API Documentation

Base URL: `http://localhost:3000/api`

## Health Check

`GET /api/health`

Response:

```json
{
  "success": true,
  "message": "API is running"
}
```

## Response Format

Success:

```json
{
  "success": true,
  "message": "Message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {}
}
```
