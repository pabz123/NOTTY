// API Configuration
const API_BASE = 'http://127.0.0.1:8000';
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Theme Management
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeRadios();
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function updateThemeRadios() {
  const current = document.documentElement.getAttribute('data-theme');
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.checked = radio.value === current;
  });
}

// ============= CUSTOM CONFIRMATION MODAL =============

function showConfirm(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    modal.classList.add('active');
    
    const cleanup = () => {
      modal.classList.remove('active');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };
    
    okBtn.onclick = () => {
      cleanup();
      resolve(true);
    };
    
    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
    
    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    };
  });
}

// ============= AUTHENTICATION =============

function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      authToken = data.access_token;
      localStorage.setItem('authToken', authToken);
      showApp();
      showToast('Welcome back!', 'success');
    } else {
      showToast(data.detail || 'Login failed', 'error');
    }
  } catch (error) {
    showToast('Network error. Please try again.', 'error');
  }
}

async function register() {
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  
  if (!email || !password || !confirm) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      authToken = data.access_token;
      localStorage.setItem('authToken', authToken);
      showApp();
      showToast('Account created successfully!', 'success');
    } else {
      showToast(data.detail || 'Registration failed', 'error');
    }
  } catch (error) {
    showToast('Network error. Please try again.', 'error');
  }
}

function logout() {
  disconnectSSE();
  localStorage.removeItem('authToken');
  authToken = null;
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  showToast('Logged out successfully', 'success');
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  initApp();
}

// ============= NAVIGATION =============

document.addEventListener('click', (e) => {
  const navItem = e.target.closest('.nav-item');
  if (navItem) {
    e.preventDefault();
    const view = navItem.dataset.view;
    switchView(view);
  }
});

function switchView(viewName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    }
  });
  
  // Update views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active-view');
  });
  document.getElementById(viewName + 'View').classList.add('active-view');
  
  // Load view data
  if (viewName === 'dashboard') loadDashboard();
  else if (viewName === 'activities') loadActivities();
  else if (viewName === 'analytics') loadAnalytics();
  else if (viewName === 'templates') loadTemplates();
  else if (viewName === 'settings') loadSettings();
}

// ============= API HELPERS =============

async function apiRequest(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...options.headers
    }
  };
  
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (response.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  
  return response;
}

// ============= DASHBOARD =============

let categoryChart, priorityChart;

async function loadDashboard() {
  try {
    // Load activities
    const response = await apiRequest('/activities');
    const activities = await response.json();
    
    // Calculate stats
    const pending = activities.filter(a => a.status === 'pending').length;
    const missed = activities.filter(a => a.status === 'missed').length;
    const completed = activities.filter(a => a.status === 'completed').length;
    
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statMissed').textContent = missed;
    document.getElementById('statCompleted').textContent = completed;
    
    // Load streak
    const streakResponse = await apiRequest('/goal-status');
    const streakData = await streakResponse.json();
    document.getElementById('statStreak').textContent = streakData.current_streak || 0;
    
    // Update charts
    updateCategoryChart(activities);
    updatePriorityChart(activities);
    
    // Show recent activities
    showRecentActivities(activities.slice(0, 5));
    
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

function updateCategoryChart(activities) {
  const categories = {};
  activities.forEach(a => {
    categories[a.category] = (categories[a.category] || 0) + 1;
  });
  
  const ctx = document.getElementById('categoryChart');
  if (categoryChart) categoryChart.destroy();
  
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', 
          '#ef4444', '#8b5cf6', '#ec4899'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function updatePriorityChart(activities) {
  const priorities = { high: 0, medium: 0, low: 0 };
  activities.forEach(a => {
    priorities[a.priority]++;
  });
  
  const ctx = document.getElementById('priorityChart');
  if (priorityChart) priorityChart.destroy();
  
  priorityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [priorities.high, priorities.medium, priorities.low],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function showRecentActivities(activities) {
  const container = document.getElementById('recentActivities');
  if (activities.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">No activities yet. Create your first one!</p>';
    return;
  }
  
  container.innerHTML = activities.map(activity => `
    <div class="activity-card priority-${activity.priority}">
      <div class="activity-title">${activity.title}</div>
      <div class="activity-meta">
        <span class="activity-badge badge-${activity.status}">${activity.status}</span>
        <span style="color: var(--text-secondary); font-size: 13px;">
          ${new Date(activity.deadline).toLocaleString()}
        </span>
      </div>
    </div>
  `).join('');
}

// ============= ACTIVITIES =============

async function loadActivities() {
  const search = document.getElementById('searchInput').value;
  const status = document.getElementById('statusFilter').value;
  const priority = document.getElementById('priorityFilter').value;
  const category = document.getElementById('categoryFilter').value;
  
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);
  if (category) params.append('category', category);
  
  try {
    const response = await apiRequest(`/activities?${params}`);
    const activities = await response.json();
    
    const grid = document.getElementById('activitiesGrid');
    if (activities.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">No activities found</p>';
      return;
    }
    
    grid.innerHTML = activities.map(activity => `
      <div class="activity-card priority-${activity.priority}">
        <div class="activity-title">${activity.title}</div>
        ${activity.description ? `<div class="activity-description">${activity.description}</div>` : ''}
        <div class="activity-meta">
          <span class="activity-badge badge-${activity.status}">${activity.status}</span>
          <span style="color: var(--text-secondary); font-size: 13px;">
            📅 ${new Date(activity.deadline).toLocaleString()}
          </span>
        </div>
        <div class="activity-actions">
          ${activity.status === 'pending' ? 
            `<button class="btn-success btn-sm" onclick="completeActivity(${activity.id})">✓ Complete</button>` : ''}
          <button class="btn-danger btn-sm" onclick="deleteActivity(${activity.id})">🗑 Delete</button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Failed to load activities:', error);
  }
}

// Setup search
document.getElementById('searchInput')?.addEventListener('input', () => {
  clearTimeout(window.searchTimeout);
  window.searchTimeout = setTimeout(loadActivities, 300);
});

function showFilterPanel() {
  const panel = document.getElementById('filterPanel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

// ============= CREATE ACTIVITY =============

function showCreateModal() {
  document.getElementById('createModal').classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

async function createActivity() {
  const title = document.getElementById('activityTitle').value;
  const description = document.getElementById('activityDescription').value;
  const deadline = document.getElementById('activityDeadline').value;
  const priority = document.getElementById('activityPriority').value;
  const category = document.getElementById('activityCategory').value;
  const notifyMinutes = parseInt(document.getElementById('activityNotifyMinutes').value);
  const isRecurring = document.getElementById('isRecurring').checked;
  const recurrencePattern = document.getElementById('recurrencePattern').value;
  
  if (!title || !deadline) {
    showToast('Please fill required fields', 'error');
    return;
  }
  
  const activityData = {
    title,
    description,
    deadline,
    priority,
    category,
    notification_minutes: notifyMinutes,
    is_recurring: isRecurring,
    recurrence_pattern: isRecurring ? recurrencePattern : null
  };
  
  try {
    const response = await apiRequest('/activities', {
      method: 'POST',
      body: JSON.stringify(activityData)
    });
    
    if (response.ok) {
      showToast(isRecurring ? 'Recurring activity created!' : 'Activity created!', 'success');
      closeModal('createModal');
      loadActivities();
      loadDashboard();
      
      // Clear form
      document.getElementById('activityTitle').value = '';
      document.getElementById('activityDescription').value = '';
      document.getElementById('activityDeadline').value = '';
      document.getElementById('isRecurring').checked = false;
      toggleRecurringOptions();
    }
  } catch (error) {
    showToast('Failed to create activity', 'error');
  }
}
  const description = document.getElementById('activityDescription').value;
  const deadline = document.getElementById('activityDeadline').value;
  const priority = document.getElementById('activityPriority').value;
  const category = document.getElementById('activityCategory').value;
  const notificationMinutes = parseInt(document.getElementById('activityNotifyMinutes').value);
  
  if (!title || !deadline) {
    showToast('Please fill required fields', 'error');
    return;
  }
  
  try {
    const response = await apiRequest('/activities', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        deadline,
        priority,
        category,
        notification_minutes: notificationMinutes,
        is_recurring: false
      })
    });
    
    if (response.ok) {
      showToast('Activity created successfully!', 'success');
      closeModal('createModal');
      loadDashboard();
      // Clear form
      document.getElementById('activityTitle').value = '';
      document.getElementById('activityDescription').value = '';
      document.getElementById('activityDeadline').value = '';
    } else {
      const error = await response.json();
      showToast(error.detail || 'Failed to create activity', 'error');
    }
  } catch (error) {
    showToast('Network error', 'error');
  }
}

// ============= ACTIVITY ACTIONS =============

async function completeActivity(id) {
  try {
    const response = await apiRequest(`/activities/${id}/complete`, { method: 'POST' });
    if (response.ok) {
      showToast('Activity completed!', 'success');
      loadActivities();
      loadDashboard();
    }
  } catch (error) {
    showToast('Failed to complete activity', 'error');
  }
}

async function deleteActivity(id) {
  const confirmed = await showConfirm(
    'Are you sure you want to delete this activity? This action cannot be undone.',
    'Delete Activity'
  );
  
  if (!confirmed) return;
  
  try {
    const response = await apiRequest(`/activities/${id}`, { method: 'DELETE' });
    if (response.ok) {
      showToast('Activity deleted', 'success');
      loadActivities();
      loadDashboard();
    }
  } catch (error) {
    showToast('Failed to delete activity', 'error');
  }
}

// ============= ANALYTICS =============

async function loadAnalytics() {
  try {
    const response = await apiRequest('/stats');
    const stats = await response.json();
    
    // Display metrics
    const metricsHTML = `
      <div style="display: grid; gap: 16px;">
        <div class="metric-item">
          <div class="metric-label">Total Activities</div>
          <div class="metric-value">${stats.total_activities || 0}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Completion Rate</div>
          <div class="metric-value">${((stats.completion_rate || 0) * 100).toFixed(1)}%</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Average per Category</div>
          <div class="metric-value">${stats.avg_per_category || 0}</div>
        </div>
      </div>
    `;
    document.getElementById('metricsContent').innerHTML = metricsHTML;
    
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

// ============= TEMPLATES =============

async function loadTemplates() {
  try {
    const response = await apiRequest('/templates');
    const templates = await response.json();
    
    const grid = document.getElementById('templatesGrid');
    if (templates.length === 0) {
      grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No templates yet. Create one to get started!</p>';
      return;
    }
    
    grid.innerHTML = templates.map(t => `
      <div class="activity-card">
        <div class="activity-title">${t.name}</div>
        <div class="activity-description">${t.title_template}</div>
        <div class="activity-actions">
          <button class="btn-primary btn-sm" onclick="useTemplate(${t.id})">Use Template</button>
          <button class="btn-danger btn-sm" onclick="deleteTemplate(${t.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load templates:', error);
    showToast('Failed to load templates', 'error');
  }
}

async function deleteTemplate(id) {
  const confirmed = await showConfirm(
    'Delete this template?',
    'Delete Template'
  );
  
  if (!confirmed) return;
  
  try {
    const response = await apiRequest(`/templates/${id}`, { method: 'DELETE' });
    if (response.ok) {
      showToast('Template deleted', 'success');
      loadTemplates();
    }
  } catch (error) {
    showToast('Failed to delete template', 'error');
  }
}

// ============= SETTINGS =============

function toggleRecurringOptions() {
  const checkbox = document.getElementById('isRecurring');
  const patternSelect = document.getElementById('recurrencePattern');
  
  if (checkbox.checked) {
    patternSelect.disabled = false;
    patternSelect.style.display = 'block';
  } else {
    patternSelect.disabled = true;
    patternSelect.style.display = 'none';
  }
}

async function changePassword() {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmNewPassword').value;
  
  if (!current || !newPass || !confirm) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  if (newPass !== confirm) {
    showToast('New passwords do not match', 'error');
    return;
  }
  
  if (newPass.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    const response = await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: current, new_password: newPass })
    });
    
    if (response.ok) {
      showToast('Password updated successfully', 'success');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmNewPassword').value = '';
    } else {
      const data = await response.json();
      showToast(data.detail || 'Failed to update password', 'error');
    }
  } catch (error) {
    showToast('Failed to update password', 'error');
  }
}

function toggleBrowserNotifications() {
  const enabled = document.getElementById('enableBrowserNotifications').checked;
  
  if (enabled) {
    requestNotificationPermission();
  }
}

async function loadSettings() {
  // Load user info
  try {
    const response = await apiRequest('/auth/me');
    const user = await response.json();
    currentUser = user;
    document.getElementById('profileEmail').value = user.email;
  } catch (error) {
    console.error('Failed to load user info:', error);
  }
  
  // Set theme radios
  updateThemeRadios();
  
  // Set notification preferences
  const notificationPerm = Notification.permission === 'granted';
  document.getElementById('enableBrowserNotifications').checked = notificationPerm;
}

// ============= UTILITIES =============

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => toast.remove(), 4000);
}

function updateTime() {
  const now = new Date();
  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    timeElement.textContent = now.toLocaleString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

// ============= SSE NOTIFICATIONS =============

let eventSource = null;

function connectSSE() {
  if (eventSource) {
    eventSource.close();
  }
  
  try {
    eventSource = new EventSource(`${API_BASE}/events`);
    
    eventSource.onopen = () => {
      console.log('SSE Connected');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleNotification(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
      // Reconnect after 5 seconds
      setTimeout(connectSSE, 5000);
    };
  } catch (error) {
    console.error('Failed to connect SSE:', error);
  }
}

function handleNotification(data) {
  console.log('Notification received:', data);
  
  switch (data.type) {
    case 'connected':
      console.log('SSE connection established');
      break;
      
    case 'due_soon':
      showToast(`⏰ ${data.title} is due in ${data.minutes} minutes!`, 'warning');
      // Show browser notification if permitted
      showBrowserNotification('Activity Due Soon', `${data.title} is due in ${data.minutes} minutes`);
      break;
      
    case 'created':
      showToast(`✅ Activity created: ${data.title}`, 'success');
      loadDashboard();
      break;
      
    case 'updated':
      showToast(`📝 Activity updated: ${data.title}`, 'info');
      loadDashboard();
      break;
      
    case 'completed':
      showToast(`🎉 Activity completed: ${data.title}`, 'success');
      loadDashboard();
      break;
      
    case 'deleted':
      showToast(`🗑️ Activity deleted: ${data.title}`, 'info');
      loadDashboard();
      break;
      
    case 'snoozed':
      showToast(`😴 Activity snoozed: ${data.title}`, 'info');
      break;
      
    default:
      console.log('Unknown notification type:', data.type);
  }
}

function showBrowserNotification(title, body) {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '📊',
        tag: 'accountability-notification',
        requireInteraction: false
      });
    } else if (Notification.permission === 'default') {
      // Auto-request if not decided
      requestNotificationPermission().then(() => {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '📊'
          });
        }
      });
    }
  }
}

function requestNotificationPermission() {
  return new Promise((resolve) => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Browser notifications enabled!', 'success');
          document.getElementById('enableBrowserNotifications').checked = true;
        } else {
          showToast('Browser notifications denied', 'warning');
          document.getElementById('enableBrowserNotifications').checked = false;
        }
        resolve(permission);
      });
    } else if (Notification.permission === 'granted') {
      document.getElementById('enableBrowserNotifications').checked = true;
      resolve('granted');
    } else {
      resolve(Notification.permission);
    }
  });
}

function disconnectSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

// ============= INITIALIZATION =============

function initApp() {
  updateTime();
  setInterval(updateTime, 30000);
  loadDashboard();
  
  // Connect to SSE for real-time notifications
  connectSSE();
  
  // Request browser notification permission
  requestNotificationPermission();
}

// Check authentication on load
if (authToken) {
  showApp();
} else {
  document.getElementById('authScreen').style.display = 'flex';
}

// Clean up SSE on page unload
window.addEventListener('beforeunload', () => {
  disconnectSSE();
});
