from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from database import Base
from datetime import datetime


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    deadline = Column(DateTime, nullable=False)
    status = Column(String, default="pending")
    priority = Column(String, default="medium")  # low, medium, high
    category = Column(String, default="general")  # general, work, personal, health, finance, education, other
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    reminded = Column(Boolean, default=False)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String, nullable=True)  # daily, weekly, monthly
    notification_minutes = Column(Integer, default=30)  # minutes before deadline
    snoozed_until = Column(DateTime, nullable=True)
    estimated_minutes = Column(Integer, nullable=True)  # Estimated time to complete
    actual_minutes = Column(Integer, nullable=True)  # Actual time taken

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)

class ActivityNote(Base):
    __tablename__ = "activity_notes"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"))
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityTemplate(Base):
    __tablename__ = "activity_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    title_template = Column(String, nullable=False)
    description_template = Column(Text, nullable=True)
    priority = Column(String, default="medium")
    category = Column(String, default="general")
    estimated_minutes = Column(Integer, nullable=True)
    notification_minutes = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityHistory(Base):
    __tablename__ = "activity_history"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"))
    action = Column(String, nullable=False)  # created, updated, completed, deleted, snoozed
    field_name = Column(String, nullable=True)  # Which field was changed
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ActivityAttachment(Base):
    __tablename__ = "activity_attachments"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"))
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    filesize = Column(Integer, nullable=False)  # in bytes
    content_type = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
