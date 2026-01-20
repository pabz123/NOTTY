# Copilot Instructions - Accountability Backend

## Project Overview
FastAPI-based task management system with real-time notifications via Server-Sent Events (SSE), automated deadline tracking, and a vanilla JavaScript frontend. Uses SQLite with SQLAlchemy ORM and APScheduler for background jobs.

## Architecture Patterns

### Real-Time Event Broadcasting
- **SSE Implementation**: `@app.get("/events")` streams activity updates to connected clients
- **Event Queue System**: `events.py` maintains a global `subscribers` list of `asyncio.Queue` instances