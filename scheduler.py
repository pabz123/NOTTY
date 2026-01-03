from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Activity

def check_missed_activities():
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()

        activities = db.query(Activity).filter(
            Activity.status == "pending",
            Activity.deadline < now
        ).all()

        for activity in activities:
            activity.status = "missed"

        if activities:
            db.commit()

    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        check_missed_activities,
        trigger="interval",
        minutes=1
    )
    scheduler.start()
