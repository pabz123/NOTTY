# Copilot Instructions - Accountability Backend

## Project Overview
FastAPI-based task management system with real-time notifications via Server-Sent Events (SSE), automated deadline tracking, and a vanilla JavaScript frontend. Uses SQLite with SQLAlchemy ORM and APScheduler for background jobs.

## Architecture Patterns

### Real-Time Event Broadcasting
- **SSE Implementation**: `@app.get("/events")` streams activity updates to connected clients
- **Event Queue System**: `events.py` maintains a global `subscribers` list of `asyncio.Queue` instances
- **Broadcasting**: `broadcast(event: dict)` in [main.py](main.py#L319) serializes events and pushes to all subscriber queues
- **Usage**: Call `broadcast({"type": "...", ...})` after any activity modification (create, update, complete, delete)
- Frontend connects via `EventSource` to receive real-time updates

### Background Scheduler Jobs
- **Scheduler**: APScheduler runs two 1-minute interval jobs defined in [scheduler.py](scheduler.py)
  - `check_missed_activities()`: Auto-updates `status='missed'` when deadlines pass
  - `check_due_soon()`: Sends notifications via `events.notify()` based on custom `notification_minutes` threshold
- **Important**: Scheduler uses `asyncio.run(notify(...))` to bridge sync scheduler with async event system
- **Timezone Handling**: All datetime comparisons convert to UTC using `replace(tzinfo=timezone.utc)`

### Database Configuration Mismatch
- **Active DB**: [database.py](database.py) uses `activities.db` (`DATABASE_URL = "sqlite:///./activities.db"`)
- **Config Setting**: [config.py](config.py) defines `database_url: str = "sqlite:///./accountability.db"` but it's NOT used
- **To Fix**: Update `database.py` to use `settings.database_url` from config instead of hardcoded value

### Authentication Flow
- **JWT Tokens**: [auth.py](auth.py) uses `python-jose` with HS256, 7-day expiration
- **Credentials**: HTTPBearer token extraction via `Depends(security)` → `get_current_user()`
- **Security Issue**: `SECRET_KEY` in `auth.py` is hardcoded; should use `settings.secret_key` from [config.py](config.py)
- **Protected Endpoints**: Add `current_user: User = Depends(get_current_user)` parameter (currently auth is defined but NOT enforced on activity endpoints)

### Activity Lifecycle & Status Management
- **Three States**: `pending` → `completed` or `missed` (auto-updated by scheduler)
- **Completion Flow**: POST `/activities/{id}/complete` sets `status='completed'`, `completed_at=now()`, logs history
- **Snoozed Activities**: `snoozed_until` field prevents notifications until timestamp passes
- **Recurring Tasks**: `is_recurring` + `recurrence_pattern` (daily/weekly/monthly) stored but NOT auto-implemented

## Data Models & Relationships

### Core Tables ([models.py](models.py))
- `Activity`: Main task entity with deadline, priority (low/medium/high), category, recurrence settings
- `ActivityNote`: One-to-many notes via `activity_id` FK with CASCADE delete
- `Subtask`: Ordered checklist items with `order` field, `is_completed` boolean
- `ActivityTemplate`: Reusable templates with `*_template` fields for title/description
- `ActivityHistory`: Audit log with `action`, `field_name`, `old_value`, `new_value`
- `ActivityAttachment`: File uploads stored in `./uploads` directory with metadata

### Field Validations (Schemas & Endpoints)
- **Priority**: Must be "low", "medium", or "high"
- **Category**: One of: general, work, personal, health, finance, education, other
- **Recurrence**: "daily", "weekly", or "monthly" (if `is_recurring=True`)
- **Notification Window**: 5-1440 minutes (enforced in update endpoint)
- **Deadline**: Cannot be in the past (checked against UTC now)

## Development Workflows

### Running the Server
```bash
# Install dependencies
pip install -r requirements.txt

# Start server with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use config settings
uvicorn main:app --reload --host $env:HOST --port $env:PORT
```

### Database Operations
- **Auto-Migration**: `Base.metadata.create_all(bind=engine)` runs on startup in [main.py](main.py#L32)
- **No Alembic**: Schema changes require manual table drops or SQLite migration scripts
- **Session Pattern**: All endpoints use `db: Session = Depends(get_db)` with try/except/rollback

### File Upload Handling
- **Endpoint**: POST `/activities/{id}/attachments` with `file: UploadFile = File(...)`
- **Storage**: Async write via `aiofiles` to `settings.upload_dir` (`./uploads` default)
- **Size Limit**: `settings.max_upload_size_mb` (10MB default) - enforced at app level
- **Retrieval**: GET `/activities/{activity_id}/attachments/{attachment_id}/download` returns `FileResponse`

## Frontend Integration ([frontend/](frontend/))
- **Vanilla JS**: No framework, direct fetch API calls to backend
- **SSE Connection**: `EventSource('/events')` for real-time updates
- **Toast Notifications**: Custom implementation in [app.js](frontend/app.js)
- **Theme Support**: localStorage-persisted dark/light mode via `data-theme` attribute
- **Timezone Display**: All dates shown in user's local timezone using `Intl.DateTimeFormat()`

## Configuration & Environment
- **Settings Class**: [config.py](config.py) uses `pydantic-settings` with `.env` file support
- **CORS**: Comma-separated string `cors_origins` parsed into list via `cors_origins_list` property
- **Rate Limiting**: `slowapi` with `rate_limit_per_minute` setting (default 60/min)
- **Critical**: Update `SECRET_KEY` in production via environment variable

## Common Patterns

### Adding New Endpoints
1. Define Pydantic schema in [schemas.py](schemas.py)
2. Add route in [main.py](main.py) with `@limiter.limit()` decorator
3. Log history via `log_activity_history(db, activity_id, action, ...)` (imported from utils)
4. Call `broadcast({"type": "...", ...})` to notify connected clients
5. Wrap in try/except with `db.rollback()` on failure

### Datetime Handling
- **Always UTC**: Use `to_utc(dt)` helper function before comparisons
- **Frontend**: Send ISO strings, backend auto-parses via Pydantic `datetime` type
- **Scheduler**: Ensure `tzinfo` is set before comparisons: `dt.replace(tzinfo=timezone.utc)`

### Query Filtering Best Practices
- Use validated Query params: `status: str = Query(None, description="...")`
- Check enum values before filtering: `if status not in ["pending", "missed", "completed"]`
- Support pagination: `page` + `page_size` with `offset = (page - 1) * page_size`
- Add sorting: `order_by(sort_column.desc())` based on validated `sort_by` param
