import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
from typing import Optional


def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP configuration from settings.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body_html: HTML version of email body
        body_text: Plain text version of email body (optional)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # Skip if SMTP not configured
    if not settings.smtp_user or not settings.smtp_password:
        print(f"[EMAIL] SMTP not configured, skipping email to {to_email}")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = settings.email_from or settings.smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach plain text version
        if body_text:
            part1 = MIMEText(body_text, 'plain')
            msg.attach(part1)
        
        # Attach HTML version
        part2 = MIMEText(body_html, 'html')
        msg.attach(part2)
        
        # Connect to SMTP server and send
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        
        print(f"[EMAIL] Successfully sent email to {to_email}: {subject}")
        return True
        
    except Exception as e:
        print(f"[EMAIL] Failed to send email to {to_email}: {str(e)}")
        return False


def send_due_soon_notification(activity_title: str, deadline: str, minutes: int, to_email: str) -> bool:
    """Send notification that an activity is due soon."""
    subject = f"⏰ Reminder: {activity_title} due in {minutes} minutes"
    
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #f59e0b; margin-top: 0;">⏰ Activity Due Soon</h2>
          <p style="font-size: 16px; color: #374151;">Your activity <strong>{activity_title}</strong> is due in <strong>{minutes} minutes</strong>.</p>
          <p style="font-size: 14px; color: #6b7280;">Deadline: {deadline}</p>
          <p style="margin-top: 30px; font-size: 14px; color: #9ca3af;">
            This is an automated reminder from your Accountability System.
          </p>
        </div>
      </body>
    </html>
    """
    
    body_text = f"""
    ⏰ Activity Due Soon
    
    Your activity "{activity_title}" is due in {minutes} minutes.
    Deadline: {deadline}
    
    This is an automated reminder from your Accountability System.
    """
    
    return send_email(to_email, subject, body_html, body_text)


def send_missed_deadline_notification(activity_title: str, deadline: str, to_email: str) -> bool:
    """Send notification that an activity deadline was missed."""
    subject = f"❌ Missed Deadline: {activity_title}"
    
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #ef4444; margin-top: 0;">❌ Deadline Missed</h2>
          <p style="font-size: 16px; color: #374151;">You missed the deadline for <strong>{activity_title}</strong>.</p>
          <p style="font-size: 14px; color: #6b7280;">Deadline was: {deadline}</p>
          <p style="margin-top: 20px; font-size: 14px; color: #374151;">
            Don't worry! You can still complete this activity or reschedule it.
          </p>
          <p style="margin-top: 30px; font-size: 14px; color: #9ca3af;">
            This is an automated notification from your Accountability System.
          </p>
        </div>
      </body>
    </html>
    """
    
    body_text = f"""
    ❌ Deadline Missed
    
    You missed the deadline for "{activity_title}".
    Deadline was: {deadline}
    
    Don't worry! You can still complete this activity or reschedule it.
    
    This is an automated notification from your Accountability System.
    """
    
    return send_email(to_email, subject, body_html, body_text)


def send_daily_digest(to_email: str, pending_count: int, due_today: list, completed_today: int) -> bool:
    """Send daily digest of activities."""
    subject = f"📊 Daily Digest: {pending_count} pending activities"
    
    due_today_html = ""
    due_today_text = ""
    
    if due_today:
        due_today_html = "<h3 style='color: #374151; font-size: 16px;'>Due Today:</h3><ul style='color: #6b7280;'>"
        due_today_text = "\nDue Today:\n"
        for activity in due_today:
            due_today_html += f"<li>{activity['title']} - {activity['deadline']}</li>"
            due_today_text += f"  • {activity['title']} - {activity['deadline']}\n"
        due_today_html += "</ul>"
    
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #3b82f6; margin-top: 0;">📊 Your Daily Digest</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px;">
              <div style="font-size: 12px; color: #92400e;">Pending</div>
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">{pending_count}</div>
            </div>
            <div style="background: #d1fae5; padding: 15px; border-radius: 6px;">
              <div style="font-size: 12px; color: #065f46;">Completed Today</div>
              <div style="font-size: 24px; font-weight: bold; color: #22c55e;">{completed_today}</div>
            </div>
          </div>
          {due_today_html}
          <p style="margin-top: 30px; font-size: 14px; color: #9ca3af;">
            Keep up the great work! 💪
          </p>
        </div>
      </body>
    </html>
    """
    
    body_text = f"""
    📊 Your Daily Digest
    
    Pending Activities: {pending_count}
    Completed Today: {completed_today}
    {due_today_text}
    
    Keep up the great work! 💪
    """
    
    return send_email(to_email, subject, body_html, body_text)
