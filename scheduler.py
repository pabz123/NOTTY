from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Activity
import asyncio
from events import notify
from config import settings


def send_email_notification(activity_title: str, notification_type: str, **kwargs):
    """Helper to send email notifications if email service is available."""
    try:
        from email_service import send_due_soon_notification, send_missed_deadline_notification
        
        # Use settings email_from as recipient in single-user mode
        if not settings.email_from:
            return
        
        if notification_type == "due_soon":
            send_due_soon_notification(
                activity_title,
                kwargs.get('deadline', ''),
                kwargs.get('minutes', 30),
                settings.email_from
            )
        elif notification_type == "missed":
            send_missed_deadline_notification(
                activity_title,
                kwargs.get('deadline', ''),
                settings.email_from
            )
    except Exception as e:
        print(f"[EMAIL] Error sending {notification_type} notification: {e}")


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
                
                # Send email notification for missed deadline
                send_email_notification(
                    activity.title,
                    "missed",
                    deadline=activity.deadline.strftime("%Y-%m-%d %H:%M")
                )

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
                
                # Send email notification
                send_email_notification(
                    activity.title,
                    "due_soon",
                    deadline=activity.deadline.strftime("%Y-%m-%d %H:%M"),
                    minutes=activity.notification_minutes
                )
                
                # Send SSE notification
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


def generate_recurring_tasks():
    """Generate new instances of recurring tasks when completed."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        print(f"[{now}] Checking for recurring tasks to generate...")

        # Find completed recurring activities
        recurring_activities = db.query(Activity).filter(
            Activity.is_recurring == True,
            Activity.recurrence_pattern.isnot(None),
            Activity.status == "completed"
        ).all()

        generated_count = 0
        for activity in recurring_activities:
            # Handle timezone properly
            if activity.deadline.tzinfo is None:
                activity_deadline_utc = activity.deadline.replace(tzinfo=timezone.utc)
            else:
                activity_deadline_utc = activity.deadline.astimezone(timezone.utc)

            # Calculate next occurrence based on pattern
            if activity.recurrence_pattern == "daily":
                next_deadline = activity_deadline_utc + timedelta(days=1)
            elif activity.recurrence_pattern == "weekly":
                next_deadline = activity_deadline_utc + timedelta(weeks=1)
            elif activity.recurrence_pattern == "monthly":
                # Approximate month as 30 days
                next_deadline = activity_deadline_utc + timedelta(days=30)
            else:
                continue  # Skip invalid patterns

            # Only generate if next occurrence is in the future
            if next_deadline > now:
                # Create new activity instance
                new_activity = Activity(
                    title=activity.title,
                    description=activity.description,
                    deadline=next_deadline,
                    status="pending",
                    priority=activity.priority,
                    category=activity.category,
                    is_recurring=True,
                    recurrence_pattern=activity.recurrence_pattern,
                    notification_minutes=activity.notification_minutes,
                    estimated_minutes=activity.estimated_minutes,
                    reminded=False
                )
                
                db.add(new_activity)
                generated_count += 1
                print(f"[{now}] Generated recurring task '{activity.title}' with deadline {next_deadline}")

                # Mark original as no longer recurring to avoid duplicates
                activity.is_recurring = False

        if generated_count > 0:
            db.commit()
            print(f"[{now}] Generated {generated_count} recurring task instances")
    except Exception as e:
        print(f"[{datetime.now(timezone.utc)}] Error in generate_recurring_tasks: {e}")
        db.rollback()
    finally:
        db.close()

scheduler.add_job(generate_recurring_tasks, "interval", hours=1)