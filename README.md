# Order Change Notification System

Production-style local implementation of a real-time notification system where browser clients automatically receive updates whenever the `orders` table changes in PostgreSQL.

This solution does not use polling. PostgreSQL triggers publish change events with `LISTEN/NOTIFY`, a Node.js backend receives those events, and Socket.IO broadcasts them to all connected browsers.


# Project Overview

The app demonstrates an event-driven path from database mutation to client UI update:

- PostgreSQL owns change detection through triggers.
- `pg_notify()` emits structured JSON payloads.
- Node.js maintains a dedicated `LISTEN order_changes` connection.
- Socket.IO keeps persistent WebSocket connections with clients.
- The frontend updates its order table and live event stream immediately.

# Problem Statement

Build a local development system where clients receive real-time updates for all `INSERT`, `UPDATE`, and `DELETE` operations on the `orders` table without polling the database or repeatedly calling an API.

Each notification contains:

```json
{
  "event": "UPDATE",
  "data": {
    "id": 1,
    "customer_name": "John",
    "product_name": "Laptop",
    "status": "shipped",
    "updated_at": "2026-06-04T10:30:00.000Z"
  }
}
```

# Architecture Diagram

```text
Client Browser
  |
  | Socket.IO persistent connection
  v
Node.js + Express Server
  |
  | LISTEN order_changes
  v
PostgreSQL
  |
  | Trigger + pg_notify()
  v
orders table
```

# Data Flow Diagram

```text
1. A row is inserted, updated, or deleted in orders.
2. PostgreSQL executes trg_notify_order_change.
3. notify_order_change() builds a JSON payload.
4. pg_notify('order_changes', payload) publishes the event.
5. The backend notification listener receives the payload.
6. The backend parses and logs the event.
7. Socket.IO broadcasts order_change to every connected client.
8. The browser updates the table and live update panel instantly.
```

# Folder Structure

```text
project-root/
  backend/
    server.js
    .env
    config/
      db.js
      env.js
    listeners/
      orderListener.js
    routes/
      orderRoutes.js
    socket/
      socketManager.js
    utils/
      logger.js
  frontend/
    index.html
    style.css
    app.js
  schema.sql
  package.json
  README.md
```

# Design Decisions

### PostgreSQL Trigger Function

The database is the source of truth for change detection. A trigger guarantees that every direct SQL mutation on `orders` emits an event, even if the change does not come from the Node.js app.

### PostgreSQL LISTEN/NOTIFY

`LISTEN/NOTIFY` is lightweight, built into PostgreSQL, and ideal for low-latency local or small-to-medium real-time workflows. It removes the need for repeated database reads.

### Dedicated Notification Connection

The backend uses a dedicated `pg.Client` for `LISTEN order_changes`. Long-lived listener connections are simpler and safer when separated from the HTTP query pool.

### Express.js

Express serves the static frontend and exposes a small API for health checks and the initial order snapshot. The initial snapshot is not polling; it is a one-time load so the UI has current state before future live events arrive.

### Socket.IO

Socket.IO provides WebSocket-based real-time delivery with reconnection support and a simple browser client. It is a strong fit for interview assignments because it clearly demonstrates persistent client communication.

### Clean Separation

Backend responsibilities are split by concern:

- `config/` handles environment and database setup.
- `listeners/` handles PostgreSQL notifications.
- `socket/` handles client connections and broadcasts.
- `routes/` handles HTTP endpoints.
- `utils/` handles logging.

## Requirements

- Node.js 18+
- PostgreSQL installed locally
- `psql` available in your terminal

No Docker, Kubernetes, or cloud services are required.

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Create a PostgreSQL database:

```sql
CREATE DATABASE order_notifications;
```

3. Configure the database URL in `backend/.env`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/order_notifications
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

4. Apply the schema:

```bash
npm run db:setup
```

You can also apply the schema with `psql` if it is installed:

```bash
psql "postgres://postgres:postgres@localhost:5432/order_notifications" -f schema.sql
```

If your local username, password, host, port, or database name differs, update both `backend/.env` and the `psql` command.

## Running Instructions

Start the server:

```bash
npm start
```

Open the app:

```text
http://localhost:3000
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

```text
GET /api/health
```

Returns server and database health.

```text
GET /api/orders
```

Returns the current order snapshot used by the frontend on initial page load.

## SQL Testing Instructions

Open a second terminal and connect to the database:

```bash
psql "postgres://postgres:postgres@localhost:5432/order_notifications"
```
