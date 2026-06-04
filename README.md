# Order Change Notification System

Production-style local implementation of a real-time notification system where browser clients automatically receive updates whenever the `orders` table changes in PostgreSQL.

This solution does not use polling. PostgreSQL triggers publish change events with `LISTEN/NOTIFY`, a Node.js backend receives those events, and Socket.IO broadcasts them to all connected browsers.
