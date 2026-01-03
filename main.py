from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from database import engine, SessionLocal
from models import Base, Activity
from schemas import ActivityCreate, ActivityResponse

Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/activities", response_model=ActivityResponse)
def create_activity(activity: ActivityCreate, db: Session = Depends(get_db)):
    new_activity = Activity(
        title=activity.title,
        description=activity.description,
        deadline=activity.deadline,
        status="pending"
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity

@app.get("/activities", response_model=list[ActivityResponse])
def list_activities(db: Session = Depends(get_db)):
    return db.query(Activity).all()
