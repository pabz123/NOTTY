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
    threshold = now + timedelta(minutes=30)

    due_soon = db.query(Activity).filter(
        Activity.status == "pending",
        Activity.reminded == False,
        Activity.deadline <= threshold,
        Activity.deadline > now
    ).all()

    for activity in due_soon:
        activity.reminded = True
        asyncio.run(
            notify({
                "type": "due_soon",
                "title": activity.title
            })
        )

    db.commit()
    db.close()

scheduler.add_job(check_due_soon, "interval", minutes=1)
    