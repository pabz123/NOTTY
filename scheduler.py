from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Activity
import asyncio
from events import notify


def check_missed_activities():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    activities = db.query(Activity).filter(
        Activity.status == "pending"
    ).all()

    for activity in activities:
        if activity.deadline.tzinfo is None:
            activity.deadline = activity.deadline.replace(tzinfo=timezone.utc)

        if activity.deadline < now:
            activity.status = "missed"

    db.commit()
    db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(check_missed_activities, "interval", minutes=1)


def check_due_soon():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    activities = db.query(Activity).filter(
        Activity.status == "pending",
        Activity.reminded == False
    ).all()

    for activity in activities:
        # Skip snoozed activities
        if activity.snoozed_until and activity.snoozed_until > now:
            continue
        
        # Check if activity is due within its custom notification window
        threshold = now + timedelta(minutes=activity.notification_minutes)
        
        if activity.deadline.tzinfo is None:
            activity.deadline = activity.deadline.replace(tzinfo=timezone.utc)
        
        if activity.deadline <= threshold and activity.deadline > now:
            activity.reminded = True
            asyncio.run(
                notify({
                    "type": "due_soon",
                    "title": activity.title,
                    "minutes": activity.notification_minutes
                })
            )

    db.commit()
    db.close()

scheduler.add_job(check_due_soon, "interval", minutes=1)
    