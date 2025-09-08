# MyMaps API Migration

This document describes the migrated MyMaps API endpoints from the old Express.js application to NextJS API routes.

## Environment Configuration

Create a `.env.local` file in the project root with the following environment variables:

```bash
# Database Configuration
# PostgreSQL connection settings for MyMaps functionality
PG_HOST=localhost
PG_PORT=5432
PG_TABULAR_DB=your_database_name
PG_TABULAR_USER=your_username
PG_TABULAR_PASS=your_password

# Application Configuration
APP_ALLOWED_ORIGINS=localhost,yourdomain.com
```

## API Endpoints

### POST /api/mymaps

Save a new MyMaps drawing to the database.

**Request Body:**

```json
{
  "features": [...],
  "metadata": {...}
}
```

**Response:**

```json
{
  "id": 123
}
```

### GET /api/mymaps/[id]

Retrieve a MyMaps drawing by its ID.

**Parameters:**

- `id` (string): The ID of the MyMaps record

**Response:**

```json
{
  "id": 123,
  "json": {...},
  "date_created": "2024-01-01 12:00:00"
}
```

## Database Schema

The API expects a PostgreSQL table with the following structure:

```sql
CREATE TABLE public.tbl_mymaps (
    id SERIAL PRIMARY KEY,
    json JSONB NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Files Created

- `src/lib/database.ts` - PostgreSQL connection and query utilities
- `src/lib/common.ts` - Common utility functions (date formatting, host validation)
- `src/lib/myMaps.ts` - MyMaps-specific data access layer
- `src/app/api/mymaps/route.ts` - POST endpoint for saving MyMaps
- `src/app/api/mymaps/[id]/route.ts` - GET endpoint for retrieving MyMaps

## Security

- Host validation is implemented to ensure requests come from allowed domains
- All database queries use parameterized statements to prevent SQL injection
- Error handling prevents sensitive information from being exposed

## Error Handling

All endpoints return appropriate HTTP status codes:

- 200: Success
- 403: Forbidden (unauthorized domain)
- 404: Not Found (for GET requests with invalid ID)
- 500: Internal Server Error

## Testing

Test the endpoints using curl or a similar tool:

```bash
# Save a MyMaps record
curl -X POST http://localhost:3000/api/mymaps \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Retrieve a MyMaps record
curl http://localhost:3000/api/mymaps/1
```
