

def cleanup_old_notifications():
    """Delete notifications older than 24 hours"""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=24)
        print(f"[{now}] Cleaning up notifications older than {cutoff}...")
        
        deleted_count = db.query(Notification).filter(
            Notification.created_at < cutoff
        ).delete()
        
        if deleted_count > 0:
            db.commit()
            print(f"[{now}] Deleted {deleted_count} old notifications")
    except Exception as e:
        print(f"[{datetime.now(timezone.utc)}] Error in cleanup_old_notifications: {e}")
        db.rollback()
    finally:
        db.close()

scheduler.add_job(cleanup_old_notifications, "interval", hours=1)
