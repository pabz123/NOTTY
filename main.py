from scheduler import scheduler
#from auth import get_current_user

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends
from fastapi import APIRouter
from sqlalchemy.orm import Session
from datetime import datetime
from datetime import timezone
from database import engine, SessionLocal
from models import Base, Activity
from schemas import ActivityCreate, ActivityResponse
from fastapi.responses import StreamingResponse
import asyncio
from events import subscribers

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # OK for development
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

@app.post("/activities")
def create_activity(activity: ActivityCreate):
    db = SessionLocal()

    # ✅ Convert incoming local datetime → UTC
    activity.deadline = activity.deadline.replace(tzinfo=timezone.utc)

    new_activity = Activity(
        title=activity.title,
        description=activity.description,
        deadline=activity.deadline,
        status="pending"
    )
    broadcast({
    "type": "created",
    "title": new_activity.title
    })

    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    db.close()

    return new_activity

@app.get("/activities", response_model=list[ActivityResponse])
def list_activities(db: Session = Depends(get_db)):
    return db.query(Activity).all()
    
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
    activity = db.query(Activity).filter(Activity.id == activity_id).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity.status = "completed"
    activity.completed_at = datetime.utcnow()
    
    broadcast({
    "type": "completed",
    "title": activity.title
    })

    db.commit()
    db.refresh(activity)

    return activity

@app.get("/achievements")
def get_achievements(db: Session = Depends(get_db)):
    completed_count = db.query(Activity).filter(
        Activity.status == "completed"
    ).count()

    achievements = []

    if completed_count >= 3:
        achievements.append({
            "title": "Consistency Starter",
            "description": "Completed 3 activities"
        })

    return {
        "completed": completed_count,
        "achievements": achievements
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
    total = db.query(Activity).count()
    completed = db.query(Activity).filter(Activity.status == "completed").count()
    missed = db.query(Activity).filter(Activity.status == "missed").count()

    goal_reached = completed >= 5

    return {
        "total": total,
        "completed": completed,
        "missed": missed,
        "goal_reached": goal_reached
    }
@app.delete("/activities/{activity_id}")
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    activity = db.query(Activity).get(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Not found")
    broadcast({
    "type": "deleted",
    "title": activity.title
    })
 
    db.delete(activity)
    db.commit()
    return {"message": "Deleted"}
    
    

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

#@app.get("/activities")
#def get_activities(user=Depends(get_current_user)):
    #pass
    #db = SessionLocal()
    #activities = db.query(Activity).all()
    #db.close()
    #return activities
