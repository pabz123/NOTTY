"""
Windows Startup Notification Script
Run this on Windows startup to check for missed/due activities
"""
import sys
import os
import requests
from datetime import datetime, timezone, timedelta
from win10toast import ToastNotifier
import time

# Get the directory of this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_BASE = "http://127.0.0.1:8000"

def get_auth_token():
    """Try to get auth token from a saved location"""
    # In production, you might save token after login
    # For now, returns None (app should be running)
    return None

def check_startup_notifications():
    """Check for due/missed activities on startup"""
    try:
        toaster = ToastNotifier()
        icon_path = os.path.join(SCRIPT_DIR, "icon.ico")
        
        # Try to fetch activities (may require auth)
        headers = {}
        token = get_auth_token()
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        # Note: This requires the app to be running for the API to be available
        response = requests.get(f"{API_BASE}/activities", headers=headers, timeout=5)
        
        if response.status_code != 200:
            # App might not be running or not authenticated
            toaster.show_toast(
                "Accountability System",
                "System is ready! Open the app to view your activities.",
                duration=5,
                icon_path=icon_path if os.path.exists(icon_path) else None,
                threaded=True
            )
            return
        
        activities = response.json()
        now = datetime.now(timezone.utc)
        
        missed_count = 0
        due_soon_count = 0
        
        for activity in activities:
            if activity['status'] == 'missed':
                missed_count += 1
            elif activity['status'] == 'pending':
                # Parse deadline
                deadline_str = activity['deadline']
                if deadline_str.endswith('Z'):
                    deadline_str = deadline_str[:-1] + '+00:00'
                deadline = datetime.fromisoformat(deadline_str)
                
                time_diff = (deadline - now).total_seconds() / 60  # minutes
                
                if time_diff < 60 and time_diff > 0:  # Due within 1 hour
                    due_soon_count += 1
        
        # Show notifications
        if missed_count > 0:
            toaster.show_toast(
                "Accountability System - Missed Activities",
                f"⚠️ You have {missed_count} missed {'activity' if missed_count == 1 else 'activities'}!",
                duration=10,
                icon_path=icon_path if os.path.exists(icon_path) else None,
                threaded=True
            )
            time.sleep(2)
        
        if due_soon_count > 0:
            toaster.show_toast(
                "Accountability System - Due Soon",
                f"⏰ {due_soon_count} {'activity is' if due_soon_count == 1 else 'activities are'} due within 1 hour!",
                duration=10,
                icon_path=icon_path if os.path.exists(icon_path) else None,
                threaded=True
            )
            time.sleep(2)
        
        if missed_count == 0 and due_soon_count == 0:
            # Show a friendly reminder that system is active
            toaster.show_toast(
                "Accountability System",
                "✅ All caught up! No urgent activities.",
                duration=5,
                icon_path=icon_path if os.path.exists(icon_path) else None,
                threaded=True
            )
        
        print(f"Startup notification check complete: {missed_count} missed, {due_soon_count} due soon")
        
    except requests.exceptions.ConnectionError:
        # App not running, show gentle reminder
        try:
            toaster = ToastNotifier()
            toaster.show_toast(
                "Accountability System",
                "Reminder: Open your accountability app to stay on track!",
                duration=5,
                threaded=True
            )
        except:
            pass
        print("Accountability system not running")
    except Exception as e:
        print(f"Error checking startup notifications: {e}")

if __name__ == "__main__":
    check_startup_notifications()
    # Keep process alive for 3 seconds to ensure toasts are shown
    time.sleep(3)
