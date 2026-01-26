# QUICK FIX FOR HTTP 500 NOTIFICATIONS ERROR

## The Problem
The notifications endpoint returns HTTP 500 error.

## The Cause
Missing `NotificationResponse` schema in `schemas.py`

## The Fix

**Option 1: Automatic (Recommended)**
```bash
FIX_NOTIFICATIONS_ERROR.bat
```

**Option 2: Manual**
1. Stop the backend (Ctrl+C)
2. The fix has already been applied to `schemas.py`
3. Restart: `python main.py`

## What Was Fixed
- Added `NotificationResponse` schema to `schemas.py`
- This schema is needed for the `/notifications` endpoint
- Created helper script to ensure all tables exist

## Test It
1. Start the app: `python main.py`
2. Open dashboard
3. Click "Notifications" in sidebar
4. Should load without errors now!

## If Still Not Working

### Error: "Table doesn't exist"
Run:
```bash
python create_notifications_table.py
```

### Error: "Still getting 500"
Check terminal output for specific error, likely:
- Database locked (close other connections)
- Permission issue (run as admin)
- Wrong database file

### Error: "No notifications to show"
That's correct! Create some activities and wait for notifications to be generated.

---

**The fix is already applied. Just restart your backend!**
