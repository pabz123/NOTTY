from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Activity

def check_missed_activities():
    db = SessionLocal()
    now = datetime.utcnow()

    missed = db.query(Activity).filter(
        Activity.status == "pending",
        Activity.deadline < now
    ).all()

    for activity in missed:
        activity.status = "missed"

    db.commit()
    db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(check_missed_activities, "interval", minutes=1)
