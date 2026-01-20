"""
Database Migration Script
Drops existing database and recreates with user_id foreign keys
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from models import Activity, User, ActivityNote, Subtask, ActivityTemplate, ActivityHistory, ActivityAttachment

def migrate_database():
    """Drop all tables and recreate with new schema"""
    print("Starting database migration...")
    
    # Delete existing database file
    db_file = "activities.db"
    if os.path.exists(db_file):
        print(f"Deleting existing database: {db_file}")
        os.remove(db_file)
    
    # Create all tables with new schema
    print("Creating new database schema...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Migration complete! Database recreated with authentication support.")
    print("Note: All existing data has been cleared as requested.")

if __name__ == "__main__":
    migrate_database()
