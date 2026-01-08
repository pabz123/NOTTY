from scheduler import scheduler
from auth import get_current_user, get_password_hash, verify_password, create_token

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Request
from fastapi import APIRouter
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from datetime import timezone
from database import engine, SessionLocal
from models import Base, Activity, User, ActivityNote, Subtask, ActivityTemplate, ActivityHistory, ActivityAttachment
from schemas import ActivityCreate, ActivityResponse, ActivityUpdate, UserRegister, UserLogin, Token, UserResponse, ActivityNoteCreate, ActivityNoteResponse, SubtaskCreate, SubtaskUpdate, SubtaskResponse, TemplateCreate, TemplateResponse, ActivityHistoryResponse, AttachmentResponse
from fastapi.responses import StreamingResponse
import asyncio
from events import subscribers
from config import settings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import aiofiles

Base.metadata.create_all(bind=engine)

# Create upload directory
os.makedirs(settings.upload_dir, exist_ok=True)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== AUTH ENDPOINTS ====================

@app.post("/auth/register", response_model=Token)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def register(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create token
        token = create_token(new_user.id, new_user.email)
        
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/auth/login", response_model=Token)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def login(request: Request, user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == user_data.email).first()
        
        if not user or not verify_password(user_data.password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )
        
        token = create_token(user.id, user.email)
        
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== ACTIVITY ENDPOINTS ====================

@app.post("/activities", response_model=ActivityResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def create_activity(request: Request, activity: ActivityCreate, db: Session = Depends(get_db)):
    try:
        # Validation
        if not activity.title or not activity.title.strip():
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        
        if activity.priority not in ["low", "medium", "high"]:
            raise HTTPException(status_code=400, detail="Priority must be low, medium, or high")
        
        if activity.category not in ["general", "work", "personal", "health", "finance", "education", "other"]:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        if activity.is_recurring and activity.recurrence_pattern not in ["daily", "weekly", "monthly"]:
            raise HTTPException(status_code=400, detail="Recurrence pattern must be daily, weekly, or monthly")
        
        # Check if deadline is in the past
        now = datetime.now(timezone.utc)
        activity_deadline = activity.deadline.replace(tzinfo=timezone.utc)
        if activity_deadline < now:
            raise HTTPException(status_code=400, detail="Deadline cannot be in the past")

        new_activity = Activity(
            title=activity.title.strip(),
            description=activity.description.strip() if activity.description else None,
            deadline=activity_deadline,
            priority=activity.priority,
            category=activity.category,
            is_recurring=activity.is_recurring,
            recurrence_pattern=activity.recurrence_pattern,
            notification_minutes=activity.notification_minutes,
            estimated_minutes=activity.estimated_minutes,
            status="pending"
        )
        
        db.add(new_activity)
        db.commit()
        db.refresh(new_activity)
        
        # Log history
        log_activity_history(db, new_activity.id, "created", None, None, None)
        
        broadcast({
            "type": "created",
            "title": new_activity.title
        })

        return new_activity
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create activity: {str(e)}")

@app.get("/activities", response_model=list[ActivityResponse])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
def list_activities(
    request: Request,
    status: str = Query(None, description="Filter by status: pending, missed, completed"),
    priority: str = Query(None, description="Filter by priority: low, medium, high"),
    category: str = Query(None, description="Filter by category"),
    search: str = Query(None, description="Search in title and description"),
    sort_by: str = Query("deadline", description="Sort by: deadline, priority, created_at"),
    sort_order: str = Query("asc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Activity)
        
        # Filtering
        if status:
            if status not in ["pending", "missed", "completed"]:
                raise HTTPException(status_code=400, detail="Invalid status")
            query = query.filter(Activity.status == status)
        
        if priority:
            if priority not in ["low", "medium", "high"]:
                raise HTTPException(status_code=400, detail="Invalid priority")
            query = query.filter(Activity.priority == priority)
        
        if category:
            query = query.filter(Activity.category == category)
        
        # Search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Activity.title.ilike(search_term)) | 
                (Activity.description.ilike(search_term))
            )
        
        # Sorting
        if sort_by not in ["deadline", "priority", "created_at"]:
            raise HTTPException(status_code=400, detail="Invalid sort_by field")
        
        sort_column = getattr(Activity, sort_by)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Pagination
        total = query.count()
        offset = (page - 1) * page_size
        activities = query.offset(offset).limit(page_size).all()
        
        # Add pagination metadata to response headers (if needed in future)
        # For now, just return the activities
        return activities
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities: {str(e)}")

@app.put("/activities/{activity_id}", response_model=ActivityResponse)
def update_activity(activity_id: int, activity_update: ActivityUpdate, db: Session = Depends(get_db)):
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Update only provided fields
        if activity_update.title is not None:
            if not activity_update.title.strip():
                raise HTTPException(status_code=400, detail="Title cannot be empty")
            activity.title = activity_update.title.strip()
        
        if activity_update.description is not None:
            activity.description = activity_update.description.strip() if activity_update.description else None
        
        if activity_update.deadline is not None:
            # Check if new deadline is in the past
            now = datetime.now(timezone.utc)
            new_deadline = activity_update.deadline.replace(tzinfo=timezone.utc)
            if new_deadline < now:
                raise HTTPException(status_code=400, detail="Deadline cannot be in the past")
            activity.deadline = new_deadline
        
        if activity_update.priority is not None:
            if activity_update.priority not in ["low", "medium", "high"]:
                raise HTTPException(status_code=400, detail="Priority must be low, medium, or high")
            activity.priority = activity_update.priority
        
        if activity_update.category is not None:
            if activity_update.category not in ["general", "work", "personal", "health", "finance", "education", "other"]:
                raise HTTPException(status_code=400, detail="Invalid category")
            activity.category = activity_update.category
        
        if activity_update.notification_minutes is not None:
            if activity_update.notification_minutes < 5 or activity_update.notification_minutes > 1440:
                raise HTTPException(status_code=400, detail="Notification minutes must be between 5 and 1440")
            activity.notification_minutes = activity_update.notification_minutes
        
        if activity_update.is_recurring is not None:
            activity.is_recurring = activity_update.is_recurring
        
        if activity_update.recurrence_pattern is not None:
            if activity_update.recurrence_pattern and activity_update.recurrence_pattern not in ["daily", "weekly", "monthly"]:
                raise HTTPException(status_code=400, detail="Recurrence pattern must be daily, weekly, or monthly")
            activity.recurrence_pattern = activity_update.recurrence_pattern
        
        if activity_update.estimated_minutes is not None:
            activity.estimated_minutes = activity_update.estimated_minutes
        
        if activity_update.actual_minutes is not None:
            activity.actual_minutes = activity_update.actual_minutes
        
        db.commit()
        db.refresh(activity)
        
        # Log history for significant changes
        if activity_update.title or activity_update.deadline or activity_update.priority or activity_update.category:
            log_activity_history(db, activity_id, "updated", None, None, None)
        
        broadcast({
            "type": "updated",
            "title": activity.title
        })
        
        return activity
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update activity: {str(e)}")
    
@app.on_event("startup")
def start_scheduler():
    scheduler.start()
    
def broadcast(event: dict):
    for q in subscribers:
        q.put_nowait(event)

    
@app.get("/activities/missed", response_model=list[ActivityResponse])
def get_missed_activities(db: Session = Depends(get_db)):
    return db.query(Activity).filter(Activity.status == "missed").all()

@app.post("/activities/{activity_id}/complete", response_model=ActivityResponse)
def complete_activity(activity_id: int, db: Session = Depends(get_db)):
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()

        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        activity.status = "completed"
        activity.completed_at = datetime.utcnow()
        
        # Log history
        log_activity_history(db, activity_id, "completed", "status", "pending", "completed")
        
        # Handle recurring tasks
        if activity.is_recurring and activity.recurrence_pattern:
            from datetime import timedelta
            
            # Create next occurrence
            if activity.recurrence_pattern == "daily":
                next_deadline = activity.deadline + timedelta(days=1)
            elif activity.recurrence_pattern == "weekly":
                next_deadline = activity.deadline + timedelta(weeks=1)
            elif activity.recurrence_pattern == "monthly":
                next_deadline = activity.deadline + timedelta(days=30)
            
            new_activity = Activity(
                title=activity.title,
                description=activity.description,
                deadline=next_deadline,
                priority=activity.priority,
                category=activity.category,
                is_recurring=True,
                recurrence_pattern=activity.recurrence_pattern,
                notification_minutes=activity.notification_minutes,
                status="pending"
            )
            db.add(new_activity)
        
        broadcast({
            "type": "completed",
            "title": activity.title
        })

        db.commit()
        db.refresh(activity)

        return activity
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete activity: {str(e)}")

@app.post("/activities/{activity_id}/snooze", response_model=ActivityResponse)
def snooze_activity(activity_id: int, minutes: int = Query(30, description="Minutes to snooze"), db: Session = Depends(get_db)):
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()

        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        from datetime import timedelta
        activity.snoozed_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        activity.reminded = False  # Reset reminder so it can notify again
        
        db.commit()
        db.refresh(activity)
        
        broadcast({
            "type": "snoozed",
            "title": activity.title
        })

        return activity
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to snooze activity: {str(e)}")

# Activity Notes Endpoints
@app.post("/activities/{activity_id}/notes", response_model=ActivityNoteResponse)
def add_activity_note(activity_id: int, note_data: ActivityNoteCreate, db: Session = Depends(get_db)):
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        new_note = ActivityNote(
            activity_id=activity_id,
            note=note_data.note
        )
        
        db.add(new_note)
        db.commit()
        db.refresh(new_note)
        
        return new_note
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add note: {str(e)}")

@app.get("/activities/{activity_id}/notes", response_model=list[ActivityNoteResponse])
def get_activity_notes(activity_id: int, db: Session = Depends(get_db)):
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        notes = db.query(ActivityNote).filter(ActivityNote.activity_id == activity_id).order_by(ActivityNote.created_at.desc()).all()
        return notes
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notes: {str(e)}")

        return activity
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete activity: {str(e)}")

@app.get("/achievements")
def get_achievements(db: Session = Depends(get_db)):
    completed_count = db.query(Activity).filter(
        Activity.status == "completed"
    ).count()

    achievements = []

    # Existing and new achievements
    if completed_count >= 1:
        achievements.append({"id": "first_win", "title": "🎯 First Win", "description": "Completed your first activity"})
    if completed_count >= 3:
        achievements.append({"id": "consistency", "title": "🔥 Consistency Starter", "description": "Completed 3 activities"})
    if completed_count >= 10:
        achievements.append({"id": "dedicated", "title": "💪 Dedicated", "description": "Completed 10 activities"})
    if completed_count >= 25:
        achievements.append({"id": "warrior", "title": "⚔️ Accountability Warrior", "description": "Completed 25 activities"})
    if completed_count >= 50:
        achievements.append({"id": "master", "title": "🏆 Master of Tasks", "description": "Completed 50 activities"})
    if completed_count >= 100:
        achievements.append({"id": "legend", "title": "👑 Legendary", "description": "Completed 100 activities"})
    
    # Category-specific achievements
    categories = db.query(Activity.category).filter(Activity.status == "completed").distinct().all()
    if len(categories) >= 5:
        achievements.append({"id": "diverse", "title": "🌈 Well-Rounded", "description": "Completed tasks in 5+ categories"})

    return {
        "completed": completed_count,
        "achievements": achievements,
        "total_possible": 7
    }

@app.get("/goal-status")
def goal_status(db: Session = Depends(get_db)):
    completed = db.query(Activity).filter(
        Activity.status == "completed"
    ).count()

    goal = 5

    return {
        "goal": goal,
        "completed": completed,
        "reached": completed >= goal
    }
@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func, case
    from datetime import timedelta
    
    total = db.query(Activity).count()
    completed = db.query(Activity).filter(Activity.status == "completed").count()
    missed = db.query(Activity).filter(Activity.status == "missed").count()
    pending = db.query(Activity).filter(Activity.status == "pending").count()

    goal_reached = completed >= 5
    
    # Completion rate
    completion_rate = (completed / total * 100) if total > 0 else 0
    
    # Category breakdown
    category_stats = db.query(
        Activity.category,
        func.count(Activity.id).label('total'),
        func.sum(case((Activity.status == 'completed', 1), else_=0)).label('completed')
    ).group_by(Activity.category).all()
    
    # Priority breakdown
    priority_stats = db.query(
        Activity.priority,
        func.count(Activity.id).label('total'),
        func.sum(case((Activity.status == 'completed', 1), else_=0)).label('completed')
    ).group_by(Activity.priority).all()
    
    # Streak calculation
    completed_activities = db.query(Activity).filter(
        Activity.status == "completed",
        Activity.completed_at.isnot(None)
    ).order_by(Activity.completed_at.desc()).all()
    
    current_streak = 0
    longest_streak = 0
    if completed_activities:
        dates = set()
        for act in completed_activities:
            if act.completed_at:
                dates.add(act.completed_at.date())
        
        sorted_dates = sorted(dates, reverse=True)
        current_streak = 1 if sorted_dates else 0
        temp_streak = 1
        longest_streak = 1 if sorted_dates else 0
        
        for i in range(1, len(sorted_dates)):
            diff = (sorted_dates[i-1] - sorted_dates[i]).days
            if diff == 1:
                temp_streak += 1
                if i == len(sorted_dates) - 1 or (sorted_dates[0] - datetime.now(timezone.utc).date()).days <= 1:
                    current_streak = temp_streak
                longest_streak = max(longest_streak, temp_streak)
            else:
                temp_streak = 1

    return {
        "total": total,
        "completed": completed,
        "missed": missed,
        "pending": pending,
        "goal_reached": goal_reached,
        "completion_rate": round(completion_rate, 1),
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "category_breakdown": [{"category": cat, "total": tot, "completed": comp or 0} for cat, tot, comp in category_stats],
        "priority_breakdown": [{"priority": pri, "total": tot, "completed": comp or 0} for pri, tot, comp in priority_stats]
    }
@app.delete("/activities/{activity_id}")
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    try:
        activity = db.query(Activity).get(activity_id)
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        broadcast({
            "type": "deleted",
            "title": activity.title
        })
     
        db.delete(activity)
        db.commit()
        return {"message": "Deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete activity: {str(e)}")
    
    

@app.get("/events")
async def event_stream():
    queue = asyncio.Queue()
    subscribers.append(queue)

    async def generator():
        try:
            while True:
                event = await queue.get()
                yield f"data: {event}\n\n"
        finally:
            subscribers.remove(queue)

    return StreamingResponse(generator(), media_type="text/event-stream")

@app.get("/export")
def export_activities(db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    import json
    
    try:
        activities = db.query(Activity).all()
        
        export_data = {
            "export_date": datetime.now(timezone.utc).isoformat(),
            "version": "1.0",
            "activities": []
        }
        
        for activity in activities:
            export_data["activities"].append({
                "title": activity.title,
                "description": activity.description,
                "deadline": activity.deadline.isoformat() if activity.deadline else None,
                "status": activity.status,
                "priority": activity.priority,
                "category": activity.category,
                "is_recurring": activity.is_recurring,
                "recurrence_pattern": activity.recurrence_pattern,
                "notification_minutes": activity.notification_minutes,
                "created_at": activity.created_at.isoformat() if activity.created_at else None,
                "completed_at": activity.completed_at.isoformat() if activity.completed_at else None
            })
        
        return JSONResponse(content=export_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/import")
def import_activities(import_data: dict, db: Session = Depends(get_db)):
    try:
        if "activities" not in import_data:
            raise HTTPException(status_code=400, detail="Invalid import format")
        
        imported_count = 0
        for act_data in import_data["activities"]:
            new_activity = Activity(
                title=act_data.get("title"),
                description=act_data.get("description"),
                deadline=datetime.fromisoformat(act_data["deadline"]) if act_data.get("deadline") else datetime.now(timezone.utc),
                status=act_data.get("status", "pending"),
                priority=act_data.get("priority", "medium"),
                category=act_data.get("category", "general"),
                is_recurring=act_data.get("is_recurring", False),
                recurrence_pattern=act_data.get("recurrence_pattern"),
                notification_minutes=act_data.get("notification_minutes", 30)
            )
            db.add(new_activity)
            imported_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "imported": imported_count,
            "message": f"Successfully imported {imported_count} activities"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# ==================== SUBTASK ENDPOINTS ====================

@app.post("/activities/{activity_id}/subtasks", response_model=SubtaskResponse)
def create_subtask(activity_id: int, subtask: SubtaskCreate, db: Session = Depends(get_db)):
    try:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        new_subtask = Subtask(
            activity_id=activity_id,
            title=subtask.title,
            order=subtask.order
        )
        db.add(new_subtask)
        db.commit()
        db.refresh(new_subtask)
        
        # Log history
        log_activity_history(db, activity_id, "subtask_added", None, None, subtask.title)
        
        return new_subtask
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create subtask: {str(e)}")

@app.get("/activities/{activity_id}/subtasks", response_model=list[SubtaskResponse])
def get_subtasks(activity_id: int, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    subtasks = db.query(Subtask).filter(Subtask.activity_id == activity_id).order_by(Subtask.order).all()
    return subtasks

@app.put("/subtasks/{subtask_id}", response_model=SubtaskResponse)
def update_subtask(subtask_id: int, updates: SubtaskUpdate, db: Session = Depends(get_db)):
    try:
        subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
        if not subtask:
            raise HTTPException(status_code=404, detail="Subtask not found")
        
        if updates.title is not None:
            subtask.title = updates.title
        if updates.is_completed is not None:
            old_status = "completed" if subtask.is_completed else "pending"
            new_status = "completed" if updates.is_completed else "pending"
            subtask.is_completed = updates.is_completed
            if old_status != new_status:
                log_activity_history(db, subtask.activity_id, "subtask_completed" if updates.is_completed else "subtask_uncompleted", 
                                   None, old_status, new_status)
        if updates.order is not None:
            subtask.order = updates.order
        
        db.commit()
        db.refresh(subtask)
        return subtask
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update subtask: {str(e)}")

@app.delete("/subtasks/{subtask_id}")
def delete_subtask(subtask_id: int, db: Session = Depends(get_db)):
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    activity_id = subtask.activity_id
    db.delete(subtask)
    db.commit()
    
    log_activity_history(db, activity_id, "subtask_deleted", None, None, None)
    
    return {"message": "Subtask deleted successfully"}

# ==================== TEMPLATE ENDPOINTS ====================

@app.post("/templates", response_model=TemplateResponse)
def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    try:
        new_template = ActivityTemplate(
            name=template.name,
            title_template=template.title_template,
            description_template=template.description_template,
            priority=template.priority,
            category=template.category,
            estimated_minutes=template.estimated_minutes,
            notification_minutes=template.notification_minutes
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        return new_template
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")

@app.get("/templates", response_model=list[TemplateResponse])
def get_templates(db: Session = Depends(get_db)):
    return db.query(ActivityTemplate).all()

@app.post("/templates/{template_id}/create-activity", response_model=ActivityResponse)
def create_activity_from_template(template_id: int, deadline: datetime, db: Session = Depends(get_db)):
    try:
        template = db.query(ActivityTemplate).filter(ActivityTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        new_activity = Activity(
            title=template.title_template,
            description=template.description_template,
            deadline=deadline.replace(tzinfo=timezone.utc),
            priority=template.priority,
            category=template.category,
            estimated_minutes=template.estimated_minutes,
            notification_minutes=template.notification_minutes,
            status="pending"
        )
        
        db.add(new_activity)
        db.commit()
        db.refresh(new_activity)
        
        log_activity_history(db, new_activity.id, "created_from_template", None, None, template.name)
        
        broadcast({
            "type": "created",
            "title": new_activity.title
        })
        
        return new_activity
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create activity from template: {str(e)}")

@app.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(ActivityTemplate).filter(ActivityTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}

# ==================== BATCH OPERATIONS ====================

@app.post("/activities/batch/complete")
def batch_complete(activity_ids: list[int], db: Session = Depends(get_db)):
    try:
        completed_count = 0
        for activity_id in activity_ids:
            activity = db.query(Activity).filter(Activity.id == activity_id).first()
            if activity and activity.status != "completed":
                activity.status = "completed"
                activity.completed_at = datetime.now(timezone.utc)
                log_activity_history(db, activity_id, "completed", "status", "pending", "completed")
                completed_count += 1
        
        db.commit()
        return {"success": True, "completed": completed_count, "message": f"Completed {completed_count} activities"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Batch complete failed: {str(e)}")

@app.post("/activities/batch/delete")
def batch_delete(activity_ids: list[int], db: Session = Depends(get_db)):
    try:
        deleted_count = 0
        for activity_id in activity_ids:
            activity = db.query(Activity).filter(Activity.id == activity_id).first()
            if activity:
                log_activity_history(db, activity_id, "deleted", None, None, None)
                db.delete(activity)
                deleted_count += 1
        
        db.commit()
        return {"success": True, "deleted": deleted_count, "message": f"Deleted {deleted_count} activities"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")

@app.post("/activities/batch/update-category")
def batch_update_category(data: dict, db: Session = Depends(get_db)):
    try:
        activity_ids = data.get("activity_ids", [])
        category = data.get("category")
        
        if not category:
            raise HTTPException(status_code=400, detail="Category is required")
        
        if category not in ["general", "work", "personal", "health", "finance", "education", "other"]:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        updated_count = 0
        for activity_id in activity_ids:
            activity = db.query(Activity).filter(Activity.id == activity_id).first()
            if activity:
                old_category = activity.category
                activity.category = category
                log_activity_history(db, activity_id, "updated", "category", old_category, category)
                updated_count += 1
        
        db.commit()
        return {"success": True, "updated": updated_count, "message": f"Updated {updated_count} activities"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")

# ==================== HISTORY ENDPOINT ====================

@app.get("/activities/{activity_id}/history", response_model=list[ActivityHistoryResponse])
def get_activity_history(activity_id: int, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    history = db.query(ActivityHistory).filter(ActivityHistory.activity_id == activity_id).order_by(ActivityHistory.timestamp.desc()).all()
    return history

# Helper function to log activity history
def log_activity_history(db: Session, activity_id: int, action: str, field_name: str = None, old_value: str = None, new_value: str = None):
    try:
        history_entry = ActivityHistory(
            activity_id=activity_id,
            action=action,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value
        )
        db.add(history_entry)
        db.commit()
    except Exception as e:
        # Don't fail the main operation if history logging fails
        print(f"Failed to log history: {str(e)}")

# ==================== FILE ATTACHMENT ENDPOINTS ====================

@app.post("/activities/{activity_id}/attachments", response_model=AttachmentResponse)
async def upload_attachment(activity_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        # Check if activity exists
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Check file size
        file_content = await file.read()
        file_size = len(file_content)
        max_size = settings.max_upload_size_mb * 1024 * 1024
        
        if file_size > max_size:
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {settings.max_upload_size_mb}MB")
        
        # Generate unique filename
        import uuid
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.upload_dir, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Create database record
        attachment = ActivityAttachment(
            activity_id=activity_id,
            filename=file.filename,
            filepath=file_path,
            filesize=file_size,
            content_type=file.content_type
        )
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        
        log_activity_history(db, activity_id, "attachment_added", None, None, file.filename)
        
        return attachment
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        # Clean up file if database operation failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(e)}")

@app.get("/activities/{activity_id}/attachments", response_model=list[AttachmentResponse])
def list_attachments(activity_id: int, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return db.query(ActivityAttachment).filter(ActivityAttachment.activity_id == activity_id).all()

@app.get("/attachments/{attachment_id}/download")
async def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(ActivityAttachment).filter(ActivityAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    if not os.path.exists(attachment.filepath):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        attachment.filepath,
        filename=attachment.filename,
        media_type=attachment.content_type or "application/octet-stream"
    )

@app.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(ActivityAttachment).filter(ActivityAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete file from filesystem
    if os.path.exists(attachment.filepath):
        os.remove(attachment.filepath)
    
    activity_id = attachment.activity_id
    db.delete(attachment)
    db.commit()
    
    log_activity_history(db, activity_id, "attachment_deleted", None, None, attachment.filename)
    
    return {"message": "Attachment deleted successfully"}

#@app.get("/activities")
#def get_activities(user=Depends(get_current_user)):
    #pass
    #db = SessionLocal()
    #activities = db.query(Activity).all()
    #db.close()
    #return activities
