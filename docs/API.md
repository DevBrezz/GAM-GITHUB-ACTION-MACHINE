# API Contract — GitHub Action Machine (GTM)

Author: KingBrezz  
Base path: `/api` (also accepted without prefix on Worker)

## GET /health

Response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "author": "KingBrezz",
  "product": "GitHub Action Machine",
  "timestamp": "ISO-8601",
  "configured": { "github": true, "r2": true, "kv": true }
}
```

## GET /settings

Public limits and policy (no secrets).

## POST /build

`multipart/form-data`:

- `file`: ZIP
- `meta`: JSON string `{ fileName, fileSize, profile, customCommand?, timeoutMinutes? }`

Response `201`:

```json
{ "buildId": "hex32", "status": "queued", "message": "..." }
```

## GET /builds?page=1&pageSize=20&status=

## GET /build/:id

## GET /build/:id/logs

## GET /build/:id/artifacts

## POST /build/:id/cancel

Returns `501 NOT_IMPLEMENTED` in this version.

## GET /artifacts/:id/download

Streams the object from R2 when registered.

## POST /internal/callback

Requires `X-Admin-Key` when `ADMIN_API_KEY` is set. Used by runner/automation to attach artifacts and final status.

### Error shape

```json
{ "error": "message", "code": "CODE", "details": {} }
```
