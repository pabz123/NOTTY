"""
Create notifications table if it doesn't exist
Run this to fix HTTP 500 error on notifications endpoint
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine, Base
    from models import Notification, Activity, User, ActivityNote, Subtask, ActivityTemplate, ActivityHistory, ActivityAttachment
except ImportError as e:
    print("\n" + "="*60)
    print("  ERROR: Required packages not installed")
    print("="*60)
    print(f"\nMissing module: {e}")
    print("\nPlease install dependencies first:")
    print("  pip install -r requirements.txt")
    print("\nOr activate your virtual environment:")
    print("  venv\\Scripts\\activate")
    print("="*60 + "\n")
    sys.exit(1)

def create_tables():
    """Create all database tables"""
    try:
        print("=" * 60)
        print("  Creating Database Tables")
        print("=" * 60)
        print()
        
        print("Creating all tables from models...")
        Base.metadata.create_all(bind=engine)
        
        print("\n✅ All tables created successfully!")
        print("\nTables created:")
        print("  - users")
        print("  - activities")
        print("  - activity_notes")
        print("  - subtasks")
        print("  - activity_templates")
        print("  - activity_history")
        print("  - activity_attachments")
        print("  - notifications ← This fixes the HTTP 500 error!")
        print()
        print("You can now use the notifications panel!")
        
    except Exception as e:
        print(f"\n❌ Failed to create tables: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure the backend is not running")
        print("2. Check that you have write permissions")
        print("3. Delete accountability.db and try again")
        sys.exit(1)

if __name__ == "__main__":
    create_tables()
