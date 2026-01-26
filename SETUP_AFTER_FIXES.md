# QUICK SETUP GUIDE - After Fixes

## Step 0: Install Dependencies (IMPORTANT!)
**Run this first if you haven't already:**
```bash
INSTALL_DEPENDENCIES.bat
```
or manually:
```bash
# Activate virtual environment
venv\Scripts\activate
# or
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Step 1: Update Database Schema
Run the migration to add new fields for recurring activities:
```bash
RUN_MIGRATION.bat
```
This will automatically activate your virtual environment and run the migration.

## Step 2: Configure Email Notifications (Optional)
1. Create/edit `.env` file in the project root:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
EMAIL_FROM=your-email@gmail.com
```

2. For Gmail users:
   - Go to Google Account → Security
   - Enable 2-Factor Authentication
   - Go to "App Passwords"
   - Generate a password for "Mail"
   - Use that password in `SMTP_PASSWORD`

## Step 3: Enable Windows Startup Notifications (Optional)
**Run as Administrator:**
```bash
SETUP_STARTUP_NOTIFICATIONS.bat
```
This creates a Windows Task Scheduler entry that shows notifications when you log in.

## Step 4: Start the Application
```bash
python main.py
```
or
```bash
QUICK_START.bat
```

## What's New?

### ✨ Fixed Issues:
1. **Notifications Panel** - Now loads properly with error handling
2. **Recurring Activities** - Auto-reset from "missed" to "pending" after 30min
3. **Edited Activities** - Reset to "pending" when deadline is changed
4. **Settings Save** - Sound and notification preferences now persist
5. **Enhanced Recurring** - Support for specific days and end dates

### ✨ New Features:
1. **Windows Startup Notifications** - Get alerts when PC starts
2. **Better Grace Period** - 30min window to complete missed recurring tasks
3. **Auto-Rescheduling** - Recurring tasks reschedule automatically

## Testing Your Setup

### Test 1: Notifications Panel
1. Open dashboard → Click "Notifications" in sidebar
2. Should see past 24 hours of notifications
3. Try "Mark All Read" and "Clear All" buttons

### Test 2: Recurring Activity Reset
1. Create a recurring activity with deadline in 2 minutes
2. Wait for it to become "missed" (check after deadline passes)
3. Wait 30 minutes
4. Check again - should be "pending" with new deadline

### Test 3: Edit Missed Activity
1. Create an activity and let it become "missed"
2. Edit it and change the deadline to tomorrow
3. It should automatically become "pending"

### Test 4: Settings Save
1. Go to Settings
2. Change sound notifications and default notification time
3. Refresh the page
4. Settings should persist

### Test 5: Startup Notifications
1. Make sure app is running
2. Create some activities (some missed, some due soon)
3. Restart your computer
4. You should see toast notifications on login

### Test 6: Email Notifications (if configured)
1. Configure email settings in `.env`
2. Create an activity due in 15 minutes
3. Wait and check your email
4. You should receive a "due soon" email

## Troubleshooting

### Notifications Not Loading:
- Check browser console for errors (F12)
- Verify you're logged in
- Check if backend is running

### Startup Notifications Not Working:
- Must run `SETUP_STARTUP_NOTIFICATIONS.bat` as Administrator
- Check Task Scheduler → Task Scheduler Library
- Look for "AccountabilityStartupNotifications"

### Email Not Sending:
- Check `.env` file exists and has correct values
- For Gmail, must use App Password, not regular password
- Check console logs for error messages

### Recurring Activities Not Resetting:
- Wait at least 5 minutes (scheduler runs every 5 min)
- Check console logs: `[{timestamp}] Reset recurring activity...`
- Grace period is 30 minutes after deadline

## Understanding Recurring Activities

### Daily Pattern:
- **Deadline**: The time you want to do it (e.g., "7:00 AM")
- **Behavior**: If missed, resets to same time tomorrow
- **Example**: "Morning workout at 7am" missed → resets to 7am tomorrow

### Weekly Pattern:
- **Deadline**: Specific day and time (e.g., "Friday 3pm")
- **Behavior**: If missed, resets to same time next week
- **Example**: "Weekly review" missed → resets to next Friday

### Monthly Pattern:
- **Deadline**: Approximate date and time
- **Behavior**: If missed, resets to ~30 days later
- **Example**: "Pay bills" missed → resets to next month

### Grace Period:
```
Activity due at 7:00 AM
├─ 7:00-7:30 AM: Status = "missed", can still mark complete
└─ After 7:30 AM: Auto-resets to tomorrow 7:00 AM, status = "pending"
```

## Need Help?

Check the logs:
- Backend: Terminal where you ran `python main.py`
- Frontend: Browser console (F12 → Console tab)
- Scheduler: Look for lines starting with `[{timestamp}]`

Common log messages:
- `Reset recurring activity 'XXX' to pending` - Working correctly!
- `Checking for missed recurring activities to reset...` - Scheduler running
- `Failed to load notifications` - Check authentication or API
