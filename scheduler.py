from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Activity
import asyncio
from main import broadcast


def check_missed_activities():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        print(f"[{now}] Checking for missed activities...")

        activities = db.query(Activity).filter(
            Activity.status == "pending"
        ).all()

        missed_count = 0
        for activity in activities:
            # Handle timezone properly
            if activity.deadline.tzinfo is None:
                # Naive datetime - assume it was meant to be local time
                # Convert local naive datetime to UTC
                local_deadline = activity.deadline.replace(tzinfo=timezone.utc) - datetime.now().astimezone().utcoffset()
                activity_deadline_utc = local_deadline
            else:
                # Aware datetime - convert to UTC
                activity_deadline_utc = activity.deadline.astimezone(timezone.utc)

            if activity_deadline_utc < now:
                activity.status = "missed"
                missed_count += 1
                print(f"[{now}] Activity '{activity.title}' marked as missed")
                print(f"  Original deadline: {activity.deadline}")
                print(f"  Converted to UTC: {activity_deadline_utc}")

        if missed_count > 0:
            db.commit()
            print(f"[{now}] Updated {missed_count} activities to 'missed' status")
    except Exception as e:
        print(f"[{datetime.now(timezone.utc)}] Error in check_missed_activities: {e}")
        db.rollback()
    finally:
        db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(check_missed_activities, "interval", minutes=1)


def check_due_soon():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        print(f"[{now}] Checking for due soon activities...")

        activities = db.query(Activity).filter(
            Activity.status == "pending",
            Activity.reminded == False
        ).all()

        notified_count = 0
        for activity in activities:
            # Skip snoozed activities
            if activity.snoozed_until and activity.snoozed_until > now:
                continue
            
            # Handle timezone properly
            if activity.deadline.tzinfo is None:
                # Naive datetime - assume it was meant to be local time
                # Convert local naive datetime to UTC
                local_deadline = activity.deadline.replace(tzinfo=timezone.utc) - datetime.now().astimezone().utcoffset()
                activity_deadline_utc = local_deadline
            else:
                # Aware datetime - convert to UTC
                activity_deadline_utc = activity.deadline.astimezone(timezone.utc)
            
            # Check if activity is due within its custom notification window
            threshold = now + timedelta(minutes=activity.notification_minutes)
            
            if activity_deadline_utc <= threshold and activity_deadline_utc > now:
                activity.reminded = True
                notified_count += 1
                print(f"[{now}] Sending notification for activity '{activity.title}' due in {activity.notification_minutes} minutes")
                print(f"  Original deadline: {activity.deadline}")
                print(f"  Converted to UTC: {activity_deadline_utc}")
                try:
                    asyncio.run(
                        notify({
                            "type": "due_soon",
                            "title": activity.title,
                            "minutes": activity.notification_minutes
                        })
                    )
                except Exception as notify_error:
                    print(f"[{now}] Error sending notification: {notify_error}")

        if notified_count > 0:
            db.commit()
            print(f"[{now}] Sent {notified_count} notifications")
    except Exception as e:
        print(f"[{datetime.now(timezone.utc)}] Error in check_due_soon: {e}")
        db.rollback()
    finally:
        db.close()

scheduler.add_job(check_due_soon, "interval", minutes=1)