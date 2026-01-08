// Theme management
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Enable/disable recurrence pattern based on checkbox
document.getElementById('isRecurring').addEventListener('change', function() {
  document.getElementById('recurrencePattern').disabled = !this.checked;
  if (!this.checked) {
    document.getElementById('recurrencePattern').value = '';
  }
});

let notificationsPaused = localStorage.getItem('notificationsPaused') === 'true';
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 2000; // 2 seconds between notifications

function toggleNotifications() {
  notificationsPaused = !notificationsPaused;
  localStorage.setItem('notificationsPaused', notificationsPaused);
  updateNotificationStatus();
}

function canShowNotification() {
  if (notificationsPaused) return false;
  
  const now = Date.now();
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    return false;
  }
  
  lastNotificationTime = now;
  return true;
}

function showNotification(title, body) {
  if (!canShowNotification()) return;
  
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function updateNotificationStatus() {
  const el = document.getElementById("notificationStatus");
  const btn = document.getElementById("toggleNotifications");

  if (notificationsPaused) {
    el.textContent = "🔴 Notifications paused";
    el.style.color = "red";
    btn.textContent = "Resume Notifications";
    btn.classList.add('paused');
  } else if (Notification.permission === "granted") {
    el.textContent = "🟢 Notifications active";
    el.style.color = "green";
    btn.textContent = "Pause Notifications";
    btn.classList.remove('paused');
  } else if (Notification.permission === "denied") {
    el.textContent = "🔴 Notifications blocked";
    el.style.color = "red";
    btn.textContent = "Pause Notifications";
    btn.classList.remove('paused');
  } else {
    el.textContent = "🟡 Notifications not decided";
    el.style.color = "orange";
    btn.textContent = "Pause Notifications";
    btn.classList.remove('paused');
  }
}


async function loadStats() {
  const res = await fetch("http://127.0.0.1:8000/stats");
  const stats = await res.json();

  const el = document.getElementById("achievement");
  el.textContent = stats.goal_reached
    ? "🏆 Goal reached! Keep going!"
    : "🎯 Goal not reached yet";

  el.style.color = stats.goal_reached ? "green" : "gray";
}

// Pagination state
let currentPage = 1;
let currentPageSize = 50;

async function loadActivities() {
  const search = document.getElementById("searchInput")?.value || "";
  const status = document.getElementById("statusFilter")?.value || "";
  const priority = document.getElementById("priorityFilter")?.value || "";
  const category = document.getElementById("categoryFilter")?.value || "";
  const sortBy = document.getElementById("sortBy")?.value || "deadline";
  const sortOrder = document.getElementById("sortOrder")?.value || "asc";

  let url = "http://127.0.0.1:8000/activities?";
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (status) url += `status=${status}&`;
  if (priority) url += `priority=${priority}&`;
  if (category) url += `category=${category}&`;
  url += `sort_by=${sortBy}&sort_order=${sortOrder}`;
  url += `&page=${currentPage}&page_size=${currentPageSize}`;

  const res = await fetch(url);
  if (!res.ok) {
    alert("Failed to load activities");
    return;
  }
  
  const activities = await res.json();

  let pending = 0, missed = 0, completed = 0;
  const table = document.getElementById("activityTable");
  table.innerHTML = "";

  const categoryIcons = {
    general: "🔹", work: "💼", personal: "👤",
    health: "💪", finance: "💰", education: "📚", other: "📌"
  };

  activities.forEach(a => {
    if (a.status === "pending") pending++;
    if (a.status === "missed") { 
	  missed++;
      showNotification("⏰ Missed Activity", a.title);
    }

    if (a.status === "completed") completed++;

    const priorityClass = `priority-${a.priority}`;
    const prioritySymbol = a.priority === "high" ? "🔴" : a.priority === "medium" ? "🟡" : "🟢";
    const categoryIcon = categoryIcons[a.category] || "📌";
    const recurringBadge = a.is_recurring ? "🔄" : "";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="activity-checkbox" data-id="${a.id}"></td>
      <td>${a.title} ${recurringBadge}</td>
      <td>${categoryIcon} ${a.category}</td>
      <td class="${priorityClass}">${prioritySymbol} ${a.priority}</td>
      <td>${new Date(a.deadline).toLocaleString()}</td>
      <td>${a.estimated_minutes ? a.estimated_minutes + " min" : "-"}</td>
      <td><span class="badge ${a.status}">${a.status}</span></td>
      <td>
        ${a.status === "pending"
          ? `<button onclick="completeActivity(${a.id})">✔</button>
             <button onclick="snoozeActivity(${a.id})">⏰</button>`
          : ""}
        <button onclick="openSubtasksView(${a.id})">✅</button>
        <button onclick="openHistoryView(${a.id})">📜</button>
        <button onclick="openNotesView(${a.id})">📝</button>
        <button onclick="openAttachmentsView(${a.id})">📎</button>
        <button onclick="openEditForm(${a.id}, '${a.title.replace(/'/g, "\\'")}', '${(a.description || "").replace(/'/g, "\\'")}', '${a.deadline}', '${a.priority}', '${a.category}', ${a.notification_minutes}, ${a.estimated_minutes || 0})">✏️</button>
        <button onclick="deleteActivity(${a.id})">🗑</button>
      </td>
    `;
    table.appendChild(row);
  });

  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("missedCount").textContent = missed;
  document.getElementById("completedCount").textContent = completed;
  
  // Update pagination info
  document.getElementById("pageInfo").textContent = `Page ${currentPage}`;
  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = activities.length < currentPageSize;
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    loadActivities();
  }
}

function nextPage() {
  currentPage++;
  loadActivities();
}

function changePageSize() {
  currentPageSize = parseInt(document.getElementById("pageSize").value);
  currentPage = 1;
  loadActivities();
}

async function createActivity() {
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const localDeadline = document.getElementById("deadline").value;
  const priority = document.getElementById("priority").value;
  const category = document.getElementById("category").value;
  const notificationMinutes = parseInt(document.getElementById("notificationMinutes").value) || 30;
  const isRecurring = document.getElementById("isRecurring").checked;
  const recurrencePattern = document.getElementById("recurrencePattern").value;

  if (!title.trim()) {
    alert("Title is required");
    return;
  }

  if (!localDeadline) {
    alert("Deadline is required");
    return;
  }

  if (isRecurring && !recurrencePattern) {
    alert("Please select recurrence pattern");
    return;
  }

  const utcDeadline = new Date(localDeadline).toISOString();
  
  const res = await fetch("http://127.0.0.1:8000/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      title, 
      description, 
      deadline: utcDeadline, 
      priority,
      category,
      notification_minutes: notificationMinutes,
      is_recurring: isRecurring,
      recurrence_pattern: recurrencePattern || null
    })
  });

  if (!res.ok) {
    const error = await res.json();
    alert("Create failed: " + (error.detail || "Unknown error"));
    return;
  }

  // Clear form
  document.getElementById("title").value = "";
  document.getElementById("description").value = "";
  document.getElementById("deadline").value = "";
  document.getElementById("priority").value = "medium";
  document.getElementById("category").value = "general";
  document.getElementById("notificationMinutes").value = "30";
  document.getElementById("isRecurring").checked = false;
  document.getElementById("recurrencePattern").value = "";
  document.getElementById("recurrencePattern").disabled = true;

  loadActivities();
  loadStats();
}

function openEditForm(id, title, description, deadline, priority, category, notificationMinutes, estimatedMinutes) {
  document.getElementById("editId").value = id;
  document.getElementById("editTitle").value = title;
  document.getElementById("editDescription").value = description;
  
  // Convert ISO datetime to local datetime-local format
  const localDate = new Date(deadline);
  const offset = localDate.getTimezoneOffset() * 60000;
  const localISOTime = new Date(localDate - offset).toISOString().slice(0, 16);
  document.getElementById("editDeadline").value = localISOTime;
  
  document.getElementById("editPriority").value = priority;
  document.getElementById("editCategory").value = category;
  document.getElementById("editNotificationMinutes").value = notificationMinutes;
  document.getElementById("editEstimatedMinutes").value = estimatedMinutes || "";
  
  document.getElementById("overlay").style.display = "block";
  document.getElementById("editForm").style.display = "block";
}

function closeEditForm() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("editForm").style.display = "none";
}

async function saveEdit() {
  const id = document.getElementById("editId").value;
  const title = document.getElementById("editTitle").value;
  const description = document.getElementById("editDescription").value;
  const localDeadline = document.getElementById("editDeadline").value;
  const priority = document.getElementById("editPriority").value;
  const category = document.getElementById("editCategory").value;
  const notificationMinutes = parseInt(document.getElementById("editNotificationMinutes").value);
  const estimatedMinutes = parseInt(document.getElementById("editEstimatedMinutes").value) || 0;

  if (!title.trim()) {
    alert("Title is required");
    return;
  }

  const utcDeadline = new Date(localDeadline).toISOString();
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      title, 
      description, 
      deadline: utcDeadline, 
      priority,
      category,
      notification_minutes: notificationMinutes,
      estimated_minutes: estimatedMinutes
    })
  });

  if (!res.ok) {
    const error = await res.json();
    alert("Update failed: " + (error.detail || "Unknown error"));
    return;
  }

  closeEditForm();
  loadActivities();
  loadStats();
}

async function completeActivity(id) {
  const res = await fetch(`http://127.0.0.1:8000/activities/${id}/complete`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json();
    alert("Failed to complete: " + (error.detail || "Unknown error"));
    return;
  }
  loadActivities();
  loadStats();
}

async function deleteActivity(id) {
  if (!confirm("Are you sure you want to delete this activity?")) {
    return;
  }
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const error = await res.json();
    alert("Failed to delete: " + (error.detail || "Unknown error"));
    return;
  }
  loadActivities();
  loadStats();
}

async function snoozeActivity(id) {
  const minutes = prompt("Snooze for how many minutes?", "30");
  if (!minutes) return;
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${id}/snooze?minutes=${minutes}`, { method: "POST" });
  if (!res.ok) {
    const error = await res.json();
    alert("Failed to snooze: " + (error.detail || "Unknown error"));
    return;
  }
  alert(`Activity snoozed for ${minutes} minutes`);
  loadActivities();
}

async function showCalendarView() {
  const res = await fetch("http://127.0.0.1:8000/activities?status=pending&sort_by=deadline&sort_order=asc");
  if (!res.ok) {
    alert("Failed to load calendar");
    return;
  }
  
  const activities = await res.json();
  const content = document.getElementById("calendarContent");
  content.innerHTML = "";

  const groupedByDate = {};
  activities.forEach(a => {
    const date = new Date(a.deadline).toLocaleDateString();
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(a);
  });

  const categoryIcons = {
    general: "🔹", work: "💼", personal: "👤",
    health: "💪", finance: "💰", education: "📚", other: "📌"
  };

  for (const [date, acts] of Object.entries(groupedByDate)) {
    const dateDiv = document.createElement("div");
    dateDiv.style.marginBottom = "20px";
    dateDiv.innerHTML = `<h4>${date}</h4>`;
    
    acts.forEach(a => {
      const prioritySymbol = a.priority === "high" ? "🔴" : a.priority === "medium" ? "🟡" : "🟢";
      const categoryIcon = categoryIcons[a.category] || "📌";
      const time = new Date(a.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      const actDiv = document.createElement("div");
      actDiv.style.padding = "8px";
      actDiv.style.margin = "5px 0";
      actDiv.style.background = "#f3f4f6";
      actDiv.style.borderRadius = "4px";
      actDiv.innerHTML = `${time} - ${prioritySymbol} ${categoryIcon} ${a.title}`;
      dateDiv.appendChild(actDiv);
    });
    
    content.appendChild(dateDiv);
  }

  document.getElementById("calendarOverlay").style.display = "block";
  document.getElementById("calendarView").style.display = "block";
}

function closeCalendarView() {
  document.getElementById("calendarOverlay").style.display = "none";
  document.getElementById("calendarView").style.display = "none";
}

async function openNotesView(activityId) {
  document.getElementById("currentActivityId").value = activityId;
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${activityId}/notes`);
  if (!res.ok) {
    alert("Failed to load notes");
    return;
  }
  
  const notes = await res.json();
  const notesList = document.getElementById("notesList");
  notesList.innerHTML = "";

  if (notes.length === 0) {
    notesList.innerHTML = "<p style='color: gray;'>No notes yet</p>";
  } else {
    notes.forEach(note => {
      const noteDiv = document.createElement("div");
      noteDiv.style.padding = "10px";
      noteDiv.style.margin = "5px 0";
      noteDiv.style.background = "#f9fafb";
      noteDiv.style.borderRadius = "4px";
      noteDiv.style.borderLeft = "3px solid #3b82f6";
      noteDiv.innerHTML = `
        <div style="font-size: 12px; color: gray;">${new Date(note.created_at).toLocaleString()}</div>
        <div>${note.note}</div>
      `;
      notesList.appendChild(noteDiv);
    });
  }

  document.getElementById("notesOverlay").style.display = "block";
  document.getElementById("notesView").style.display = "block";
}

function closeNotesView() {
  document.getElementById("notesOverlay").style.display = "none";
  document.getElementById("notesView").style.display = "none";
  document.getElementById("newNote").value = "";
}

async function addNote() {
  const activityId = document.getElementById("currentActivityId").value;
  const note = document.getElementById("newNote").value;

  if (!note.trim()) {
    alert("Note cannot be empty");
    return;
  }

  const res = await fetch(`http://127.0.0.1:8000/activities/${activityId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note })
  });

  if (!res.ok) {
    const error = await res.json();
    alert("Failed to add note: " + (error.detail || "Unknown error"));
    return;
  }

  document.getElementById("newNote").value = "";
  openNotesView(activityId); // Reload notes
}

const source = new EventSource("http://127.0.0.1:8000/events");

source.onmessage = function(event) {
  const data = JSON.parse(event.data);

  showNotification("Accountability Update", `Task ${data.type}: ${data.title}`);

  loadActivities();
};

updateNotificationStatus();
loadActivities();
loadStats();

// Export activities
async function exportData() {
  try {
    const response = await fetch('/export');
    if (response.ok) {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accountability_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export data');
  }
}

// Import activities
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    const response = await fetch('/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const result = await response.json();
      alert(result.message);
      loadActivities();
    } else {
      alert('Import failed');
    }
  } catch (error) {
    console.error('Import failed:', error);
    alert('Failed to import data: ' + error.message);
  }
  
  // Reset file input
  event.target.value = '';
}

// Show statistics modal
async function showStatsModal() {
  try {
    const [statsResponse, achievementsResponse] = await Promise.all([
      fetch('http://127.0.0.1:8000/stats'),
      fetch('http://127.0.0.1:8000/achievements')
    ]);

    if (statsResponse.ok && achievementsResponse.ok) {
      const stats = await statsResponse.json();
      const achievements = await achievementsResponse.json();

      // Update stats in modal
      document.getElementById('statsTotalActivities').textContent = stats.total_activities || 0;
      document.getElementById('statsCompletedActivities').textContent = stats.completed_activities || 0;
      document.getElementById('statsPendingActivities').textContent = stats.pending_activities || 0;
      document.getElementById('statsCompletionRate').textContent = 
        `${(stats.completion_rate || 0).toFixed(1)}%`;
      document.getElementById('statsCurrentStreak').textContent = stats.current_streak || 0;
      document.getElementById('statsLongestStreak').textContent = stats.longest_streak || 0;

      // Category breakdown
      const categoryBreakdown = document.getElementById('categoryBreakdown');
      categoryBreakdown.innerHTML = '';
      if (stats.category_breakdown && stats.category_breakdown.length > 0) {
        stats.category_breakdown.forEach(item => {
          const div = document.createElement('div');
          div.className = 'stat-item';
          div.innerHTML = `<strong>${item.category}:</strong> ${item.count}`;
          categoryBreakdown.appendChild(div);
        });
      } else {
        categoryBreakdown.innerHTML = '<div class="stat-item">No data</div>';
      }

      // Priority breakdown
      const priorityBreakdown = document.getElementById('priorityBreakdown');
      priorityBreakdown.innerHTML = '';
      if (stats.priority_breakdown && stats.priority_breakdown.length > 0) {
        stats.priority_breakdown.forEach(item => {
          const div = document.createElement('div');
          div.className = 'stat-item';
          div.innerHTML = `<strong>${item.priority}:</strong> ${item.count}`;
          priorityBreakdown.appendChild(div);
        });
      } else {
        priorityBreakdown.innerHTML = '<div class="stat-item">No data</div>';
      }

      // Achievements
      const achievementsList = document.getElementById('achievementsList');
      achievementsList.innerHTML = '';
      if (achievements.achievements && achievements.achievements.length > 0) {
        achievements.achievements.forEach(ach => {
          const div = document.createElement('div');
          div.className = 'achievement-item';
          div.innerHTML = `
            <div><strong>${ach.title}</strong></div>
            <div style="font-size: 0.9em; color: #666;">${ach.description}</div>
          `;
          achievementsList.appendChild(div);
        });
      } else {
        achievementsList.innerHTML = '<div class="stat-item">No achievements yet. Complete activities to unlock!</div>';
      }

      document.getElementById('statsModal').style.display = 'flex';
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
    alert('Failed to load statistics');
  }
}

function closeStatsModal() {
  document.getElementById('statsModal').style.display = 'none';
}

function toggleDarkMode() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Update streak display in header
async function updateStreakDisplay() {
  try {
    const response = await fetch('http://127.0.0.1:8000/stats');
    if (response.ok) {
      const stats = await response.json();
      const streakInfo = document.getElementById('streakInfo');
      if (streakInfo) {
        streakInfo.innerHTML = `🔥 Current Streak: <strong>${stats.current_streak || 0}</strong> days | 🏆 Longest: <strong>${stats.longest_streak || 0}</strong> days`;
      }
    }
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
}

// Load theme and streak on page load
updateStreakDisplay();

// ==================== BATCH OPERATIONS ====================

function toggleSelectAll() {
  const selectAll = document.getElementById('selectAll').checked;
  document.querySelectorAll('.activity-checkbox').forEach(cb => {
    cb.checked = selectAll;
  });
}

function selectAllActivities() {
  document.getElementById('selectAll').checked = true;
  toggleSelectAll();
}

async function batchCompleteSelected() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    alert('No activities selected');
    return;
  }
  
  if (!confirm(`Complete ${ids.length} activities?`)) return;
  
  const res = await fetch('http://127.0.0.1:8000/activities/batch/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids)
  });
  
  if (res.ok) {
    const result = await res.json();
    alert(result.message);
    loadActivities();
  } else {
    alert('Batch complete failed');
  }
}

async function batchDeleteSelected() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    alert('No activities selected');
    return;
  }
  
  if (!confirm(`Delete ${ids.length} activities? This cannot be undone.`)) return;
  
  const res = await fetch('http://127.0.0.1:8000/activities/batch/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids)
  });
  
  if (res.ok) {
    const result = await res.json();
    alert(result.message);
    loadActivities();
  } else {
    alert('Batch delete failed');
  }
}

async function batchUpdateCategory() {
  const category = document.getElementById('batchCategory').value;
  if (!category) {
    alert('Please select a category');
    return;
  }
  
  const ids = getSelectedIds();
  if (ids.length === 0) {
    alert('No activities selected');
    return;
  }
  
  const res = await fetch(`http://127.0.0.1:8000/activities/batch/update-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_ids: ids, category })
  });
  
  if (res.ok) {
    const result = await res.json();
    alert(result.message);
    loadActivities();
    document.getElementById('batchCategory').value = '';
  } else {
    alert('Batch update failed');
  }
}

function getSelectedIds() {
  const checked = document.querySelectorAll('.activity-checkbox:checked');
  return Array.from(checked).map(cb => parseInt(cb.getAttribute('data-id')));
}

// ==================== SUBTASKS ====================

async function openSubtasksView(activityId) {
  document.getElementById('currentSubtaskActivityId').value = activityId;
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${activityId}/subtasks`);
  if (!res.ok) {
    alert('Failed to load subtasks');
    return;
  }
  
  const subtasks = await res.json();
  const list = document.getElementById('subtasksList');
  list.innerHTML = '';
  
  subtasks.forEach(sub => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 8px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;';
    div.innerHTML = `
      <input type="checkbox" ${sub.is_completed ? 'checked' : ''} onchange="toggleSubtask(${sub.id}, this.checked)">
      <span style="flex: 1; ${sub.is_completed ? 'text-decoration: line-through; color: #999;' : ''}">${sub.title}</span>
      <button onclick="deleteSubtask(${sub.id})">🗑️</button>
    `;
    list.appendChild(div);
  });
  
  document.getElementById('subtasksOverlay').style.display = 'block';
  document.getElementById('subtasksView').style.display = 'block';
}

function closeSubtasksView() {
  document.getElementById('subtasksOverlay').style.display = 'none';
  document.getElementById('subtasksView').style.display = 'none';
  document.getElementById('newSubtask').value = '';
}

async function addSubtask() {
  const activityId = document.getElementById('currentSubtaskActivityId').value;
  const title = document.getElementById('newSubtask').value;
  
  if (!title.trim()) {
    alert('Subtask title is required');
    return;
  }
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${activityId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, order: 0 })
  });
  
  if (res.ok) {
    document.getElementById('newSubtask').value = '';
    openSubtasksView(activityId);
  } else {
    alert('Failed to add subtask');
  }
}

async function toggleSubtask(subtaskId, isCompleted) {
  const res = await fetch(`http://127.0.0.1:8000/subtasks/${subtaskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_completed: isCompleted })
  });
  
  if (!res.ok) {
    alert('Failed to update subtask');
  }
}

async function deleteSubtask(subtaskId) {
  if (!confirm('Delete this subtask?')) return;
  
  const res = await fetch(`http://127.0.0.1:8000/subtasks/${subtaskId}`, { method: 'DELETE' });
  if (res.ok) {
    const activityId = document.getElementById('currentSubtaskActivityId').value;
    openSubtasksView(activityId);
  } else {
    alert('Failed to delete subtask');
  }
}

// ==================== TEMPLATES ====================

async function openTemplatesView() {
  const res = await fetch('http://127.0.0.1:8000/templates');
  if (!res.ok) {
    alert('Failed to load templates');
    return;
  }
  
  const templates = await res.json();
  const list = document.getElementById('templatesList');
  list.innerHTML = '';
  
  templates.forEach(tmpl => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
    div.innerHTML = `
      <div>
        <strong>${tmpl.name}</strong>
        <div style="font-size: 0.9em; color: #666;">${tmpl.title_template}</div>
      </div>
      <div style="display: flex; gap: 5px;">
        <button onclick="useTemplate(${tmpl.id})">Use</button>
        <button onclick="deleteTemplate(${tmpl.id})">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
  
  document.getElementById('templatesOverlay').style.display = 'block';
  document.getElementById('templatesView').style.display = 'block';
}

function closeTemplatesView() {
  document.getElementById('templatesOverlay').style.display = 'none';
  document.getElementById('templatesView').style.display = 'none';
}

async function createTemplate() {
  const name = document.getElementById('templateName').value;
  const title = document.getElementById('templateTitle').value;
  const description = document.getElementById('templateDescription').value;
  
  if (!name.trim() || !title.trim()) {
    alert('Template name and title are required');
    return;
  }
  
  const res = await fetch('http://127.0.0.1:8000/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, 
      title_template: title,
      description_template: description,
      priority: 'medium',
      category: 'general'
    })
  });
  
  if (res.ok) {
    document.getElementById('templateName').value = '';
    document.getElementById('templateTitle').value = '';
    document.getElementById('templateDescription').value = '';
    openTemplatesView();
  } else {
    alert('Failed to create template');
  }
}

async function useTemplate(templateId) {
  const deadline = prompt('Enter deadline (YYYY-MM-DDTHH:MM):');
  if (!deadline) return;
  
  const res = await fetch(`http://127.0.0.1:8000/templates/${templateId}/create-activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deadline })
  });
  
  if (res.ok) {
    closeTemplatesView();
    loadActivities();
  } else {
    alert('Failed to create activity from template');
  }
}

async function deleteTemplate(templateId) {
  if (!confirm('Delete this template?')) return;
  
  const res = await fetch(`http://127.0.0.1:8000/templates/${templateId}`, { method: 'DELETE' });
  if (res.ok) {
    openTemplatesView();
  } else {
    alert('Failed to delete template');
  }
}

// ==================== ACTIVITY HISTORY ====================

async function openHistoryView(activityId) {
  document.getElementById('currentHistoryActivityId').value = activityId;
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${activityId}/history`);
  if (!res.ok) {
    alert('Failed to load history');
    return;
  }
  
  const history = await res.json();
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  
  if (history.length === 0) {
    list.innerHTML = '<p style="color: #666;">No history yet</p>';
  } else {
    history.forEach(h => {
      const div = document.createElement('div');
      div.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee;';
      const actionEmoji = {
        'created': '➕',
        'updated': '✏️',
        'completed': '✅',
        'deleted': '🗑️',
        'snoozed': '⏰',
        'subtask_added': '➕✅',
        'subtask_completed': '✅',
        'created_from_template': '📋'
      }[h.action] || '📝';
      
      div.innerHTML = `
        <div><strong>${actionEmoji} ${h.action.replace('_', ' ').toUpperCase()}</strong></div>
        ${h.field_name ? `<div style="font-size: 0.9em; color: #666;">Field: ${h.field_name}</div>` : ''}
        ${h.old_value ? `<div style="font-size: 0.9em; color: #999;">Old: ${h.old_value}</div>` : ''}
        ${h.new_value ? `<div style="font-size: 0.9em; color: #666;">New: ${h.new_value}</div>` : ''}
        <div style="font-size: 0.85em; color: #aaa;">${new Date(h.timestamp).toLocaleString()}</div>
      `;
      list.appendChild(div);
    });
  }
  
  document.getElementById('historyOverlay').style.display = 'block';
  document.getElementById('historyView').style.display = 'block';
}

function closeHistoryView() {
  document.getElementById('historyOverlay').style.display = 'none';
  document.getElementById('historyView').style.display = 'none';
}

// ==================== ATTACHMENTS ====================

async function openAttachmentsView(activityId) {
  document.getElementById('currentAttachmentActivityId').value = activityId;
  
  const res = await fetch(`http://127.0.0.1:8000/activities/${activityId}/attachments`);
  if (!res.ok) {
    alert('Failed to load attachments');
    return;
  }
  
  const attachments = await res.json();
  const list = document.getElementById('attachmentsList');
  list.innerHTML = '';
  
  if (attachments.length === 0) {
    list.innerHTML = '<p style="color: #666;">No attachments yet</p>';
  } else {
    attachments.forEach(att => {
      const div = document.createElement('div');
      div.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
      
      const sizeKB = (att.filesize / 1024).toFixed(2);
      
      div.innerHTML = `
        <div>
          <strong>📎 ${att.filename}</strong>
          <div style="font-size: 0.9em; color: #666;">${sizeKB} KB</div>
        </div>
        <div style="display: flex; gap: 5px;">
          <button onclick="downloadAttachment(${att.id}, '${att.filename}')">⬇️ Download</button>
          <button onclick="deleteAttachment(${att.id})">🗑️</button>
        </div>
      `;
      list.appendChild(div);
    });
  }
  
  document.getElementById('attachmentsOverlay').style.display = 'block';
  document.getElementById('attachmentsView').style.display = 'block';
}

function closeAttachmentsView() {
  document.getElementById('attachmentsOverlay').style.display = 'none';
  document.getElementById('attachmentsView').style.display = 'none';
  document.getElementById('attachmentFile').value = '';
}

async function uploadAttachment() {
  const activityId = document.getElementById('currentAttachmentActivityId').value;
  const fileInput = document.getElementById('attachmentFile');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a file');
    return;
  }
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const res = await fetch(`http://127.0.0.1:8000/activities/${activityId}/attachments`, {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      fileInput.value = '';
      openAttachmentsView(activityId);
    } else {
      const error = await res.json();
      alert('Upload failed: ' + (error.detail || 'Unknown error'));
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload failed: ' + error.message);
  }
}

async function downloadAttachment(attachmentId, filename) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/attachments/${attachmentId}/download`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Download failed');
    }
  } catch (error) {
    console.error('Download error:', error);
    alert('Download failed');
  }
}

async function deleteAttachment(attachmentId) {
  if (!confirm('Delete this attachment?')) return;
  
  const res = await fetch(`http://127.0.0.1:8000/attachments/${attachmentId}`, { method: 'DELETE' });
  if (res.ok) {
    const activityId = document.getElementById('currentAttachmentActivityId').value;
    openAttachmentsView(activityId);
  } else {
    alert('Failed to delete attachment');
  }
}

setInterval(loadActivities, 30000);
