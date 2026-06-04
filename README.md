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


### INSERT Test

```sql
INSERT INTO orders (customer_name, product_name, status)
VALUES ('John', 'Laptop', 'pending');
```

Expected client output:

```text
[12:05:14]
INSERT
Order #4
John ordered Laptop. Status is pending.
```

### UPDATE Test

```sql
UPDATE orders
SET status = 'shipped'
WHERE customer_name = 'John'
  AND product_name = 'Laptop';
```

Expected client output:

```text
[12:05:25]
UPDATE
Order #4
John ordered Laptop. Status is shipped.
```

### DELETE Test

```sql
DELETE FROM orders
WHERE customer_name = 'John'
  AND product_name = 'Laptop';
```

Expected client output:

```text
[12:05:40]
DELETE
Order #4
John's Laptop order was removed.
```

## Sample Server Logs

```text
[2026-06-04T10:30:00.000Z] [INFO] Connected to PostgreSQL
[2026-06-04T10:30:00.010Z] [INFO] Connected notification listener to PostgreSQL
[2026-06-04T10:30:00.012Z] [INFO] Listening on channel: order_changes
[2026-06-04T10:30:00.020Z] [INFO] Server started on port 3000
[2026-06-04T10:30:10.100Z] [INFO] Client connected: rG9YHn3YjYX8wUuXAAAB
[2026-06-04T10:31:22.500Z] [INFO] Notification received: { event: 'UPDATE', data: { id: 1 } }
```

## Why This Is Not Polling

Polling repeatedly asks the server or database whether something changed. That wastes CPU, network bandwidth, and database connections when there are no updates. It also creates latency because users only see changes on the next polling interval.

This system is event-driven:

- PostgreSQL emits a notification exactly when data changes.
- The backend stays idle until a notification arrives.
- Socket.IO pushes the update to clients immediately.

The result is lower latency and more efficient resource usage.

## Scalability Discussion

### Benefits of Current Design

- Low latency because updates are pushed as soon as the transaction commits.
- No repeated API calls from clients.
- No repeated database reads just to detect changes.
- Simple operational model for local development and interview demonstration.
- Correctly captures direct database changes, not only changes made through one backend route.

### Limitations of PostgreSQL LISTEN/NOTIFY

- Payload size is limited, so large event bodies should use IDs and fetch details separately.
- Notifications are not durable. If the backend listener is down, events sent during downtime are missed.
- It is not a replacement for a message broker when replay, retention, ordering guarantees, or high fan-out are required.
- Every backend instance needs its own listener connection.

### Scaling With Redis Pub/Sub

For multiple Socket.IO server instances, Redis can act as a fan-out layer:

```text
PostgreSQL NOTIFY
  -> One or more backend listeners
  -> Redis Pub/Sub
  -> Socket.IO instances
  -> Connected clients
```

Socket.IO also supports a Redis adapter, which allows events emitted from one Node.js instance to reach clients connected to other instances.

### Scaling With Kafka

For very large systems, Kafka can be introduced when durability and replay matter:

```text
PostgreSQL change event
  -> Backend or CDC producer
  -> Kafka topic
  -> Consumer group
  -> WebSocket gateway
  -> Clients
```

Kafka improves:

- Durable event storage
- Replay after outages
- Back-pressure handling
- Independent consumers for analytics, notifications, auditing, and search indexing

The trade-off is higher operational complexity.

### Horizontal Scaling Strategy

To scale the current design:

1. Put Node.js instances behind a load balancer.
2. Use sticky sessions or the Socket.IO Redis adapter.
3. Add Redis Pub/Sub so broadcasts reach clients connected to any instance.
4. Keep PostgreSQL trigger payloads small.
5. Move durable event processing to Kafka or another message broker if missed events are unacceptable.
6. Add observability for listener health, socket counts, event lag, and database errors.

### Trade-Offs

The current design is intentionally simple and excellent for local development, interviews, and moderate real-time workloads. It favors low latency and minimal infrastructure over durable messaging. For mission-critical production systems, add a durable event log, replay support, authentication, authorization, and stronger observability.

## Future Improvements

- Add authentication and authorize which clients can see which orders.
- Add integration tests that run against a disposable local PostgreSQL database.
- Add event persistence for missed notification recovery.
- Add Socket.IO Redis adapter for multi-instance deployments.
- Add schema migration tooling such as Knex, Prisma Migrate, or node-pg-migrate.
- Add structured JSON logging for production log aggregation.
  #
