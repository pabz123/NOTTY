"""
Migration script to add new recurring activity fields
Run this once to update your existing database
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from sqlalchemy import create_engine, text
    from database import SessionLocal, engine
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

def migrate_database():
    """Add new columns for recurring activities"""
    db = SessionLocal()
    
    try:
        print("Starting database migration...")
        
        # Check if columns already exist
        with engine.connect() as connection:
            # Add recurrence_days column
            try:
                connection.execute(text("""
                    ALTER TABLE activities 
                    ADD COLUMN recurrence_days VARCHAR
                """))
                connection.commit()
                print("✓ Added recurrence_days column")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg:
                    print("⚠ recurrence_days column already exists")
                else:
                    print(f"✗ Error adding recurrence_days: {e}")
            
            # Add recurrence_end_date column
            try:
                connection.execute(text("""
                    ALTER TABLE activities 
                    ADD COLUMN recurrence_end_date DATETIME
                """))
                connection.commit()
                print("✓ Added recurrence_end_date column")
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate column" in error_msg or "already exists" in error_msg:
                    print("⚠ recurrence_end_date column already exists")
                else:
                    print(f"✗ Error adding recurrence_end_date: {e}")
        
        print("\n✅ Migration completed successfully!")
        print("You can now use the enhanced recurring activity features.")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure the backend is not running")
        print("2. Check that accountability.db file exists")
        print("3. Ensure you have write permissions")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  DATABASE MIGRATION - Recurring Activities Enhancement")
    print("=" * 60)
    print()
    
    migrate_database()
