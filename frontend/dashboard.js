// API Configuration
const API_BASE = 'http://127.0.0.1:8000';
let authToken = localStorage.getItem('auth_token'); // Changed from 'authToken' to 'auth_token'
let currentUser = null;

// Make functions globally accessible
window.login = login;
window.register = register;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.deleteNotification = deleteNotification;
window.clearAllNotifications = clearAllNotifications;
window.saveSoundPreference = saveSoundPreference;
window.saveDefaultNotificationTime = saveDefaultNotificationTime;

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
  console.log('Login function called');
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  console.log('Email:', email);
  console.log('Password length:', password.length);
  
  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  try {
    console.log('Sending login request to:', `${API_BASE}/auth/login`);
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      authToken = data.access_token;
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('authToken', authToken);
      console.log('Token saved, showing app');
      showApp();
      showToast('Welcome back!', 'success');
    } else {
      console.error('Login failed:', data);
      showToast(data.detail || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Network error: ' + error.message, 'error');
  }
}

async function register() {
  console.log('Register function called');
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  
  console.log('Email:', email);
  console.log('Password length:', password.length);
  console.log('Passwords match:', password === confirm);
  
  if (!email || !password || !confirm) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }
  
  try {
    console.log('Sending register request to:', `${API_BASE}/auth/register`);
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      authToken = data.access_token;
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('authToken', authToken);
      console.log('Token saved, showing app');
      showApp();
      showToast('Account created successfully!', 'success');
    } else {
      console.error('Registration failed:', data);
      showToast(data.detail || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error('Register error:', error);
    showToast('Network error: ' + error.message, 'error');
  }
}

function logout() {
  disconnectSSE();
  localStorage.removeItem('auth_token'); // Remove both token keys
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

// Override fetch to automatically add auth headers (like app.js)
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  const token = localStorage.getItem('auth_token');
  
  // Add auth header for API requests
  if (token && typeof url === 'string' && url.includes(API_BASE)) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  const response = await originalFetch(url, options);
  
  // If unauthorized, logout
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authToken');
    authToken = null;
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  }
  
  return response;
};

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
  else if (viewName === 'notifications') loadNotifications();
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
    
    grid.innerHTML = activities.map((activity, index) => {
      // Store activity data in a global array for easy access
      window.activitiesData = window.activitiesData || {};
      window.activitiesData[activity.id] = activity;
      
      return `
      <div class="activity-card priority-${activity.priority}">
        <div class="activity-title">${activity.title}${activity.is_recurring ? ' 🔄' : ''}</div>
        ${activity.description ? `<div class="activity-description">${activity.description}</div>` : ''}
        <div class="activity-meta">
          <span class="activity-badge badge-${activity.status}">${activity.status}</span>
          ${activity.is_recurring ? '<span class="activity-badge" style="background: #8b5cf6;">Daily Routine</span>' : ''}
          <span style="color: var(--text-secondary); font-size: 13px;">
            📅 ${new Date(activity.deadline).toLocaleString()}
          </span>
        </div>
        <div class="activity-actions">
          ${activity.status === 'pending' || activity.status === 'missed' ? 
            `<button class="btn-success btn-sm" onclick="completeActivity(${activity.id})">✓ Complete</button>` : ''}
          <button class="btn-secondary btn-sm" onclick="editActivityById(${activity.id})">✏️ Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteActivity(${activity.id})">🗑 Delete</button>
        </div>
      </div>
    `;
    }).join('');
    
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

// ============= EDIT ACTIVITY =============

function showEditModal(activity) {
  document.getElementById('editActivityId').value = activity.id;
  document.getElementById('editActivityTitle').value = activity.title;
  document.getElementById('editActivityDescription').value = activity.description || '';
  
  // Format deadline for datetime-local input
  const deadline = new Date(activity.deadline);
  const formattedDeadline = deadline.toISOString().slice(0, 16);
  document.getElementById('editActivityDeadline').value = formattedDeadline;
  
  document.getElementById('editActivityPriority').value = activity.priority;
  document.getElementById('editActivityCategory').value = activity.category;
  document.getElementById('editActivityNotifyMinutes').value = activity.notification_minutes || 30;
  
  // Set recurring checkbox
  const isRecurring = activity.is_recurring || false;
  document.getElementById('editIsRecurring').checked = isRecurring;
  
  if (isRecurring && activity.recurrence_pattern) {
    document.getElementById('editRecurrencePattern').value = activity.recurrence_pattern;
  }
  
  toggleEditRecurringOptions();
  document.getElementById('editModal').classList.add('active');
}

function toggleEditRecurringOptions() {
  const checkbox = document.getElementById('editIsRecurring');
  const select = document.getElementById('editRecurrencePattern');
  
  if (checkbox.checked) {
    select.disabled = false;
    select.style.display = 'block';
  } else {
    select.disabled = true;
    select.style.display = 'none';
  }
}

async function saveEditActivity() {
  const id = document.getElementById('editActivityId').value;
  const title = document.getElementById('editActivityTitle').value;
  const description = document.getElementById('editActivityDescription').value;
  const deadline = document.getElementById('editActivityDeadline').value;
  const priority = document.getElementById('editActivityPriority').value;
  const category = document.getElementById('editActivityCategory').value;
  const notifyMinutes = parseInt(document.getElementById('editActivityNotifyMinutes').value);
  const isRecurring = document.getElementById('editIsRecurring').checked;
  const recurrencePattern = isRecurring ? document.getElementById('editRecurrencePattern').value : null;
  
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
    recurrence_pattern: recurrencePattern
  };
  
  try {
    const response = await apiRequest(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(activityData)
    });
    
    if (response.ok) {
      showToast(isRecurring ? 'Activity updated and converted to daily routine!' : 'Activity updated successfully!', 'success');
      closeModal('editModal');
      loadActivities();
      loadDashboard();
    } else {
      const error = await response.json();
      showToast(error.detail || 'Failed to update activity', 'error');
    }
  } catch (error) {
    console.error('Edit activity error:', error);
    showToast('Failed to update activity', 'error');
  }
}

// Make edit functions globally accessible
window.showEditModal = showEditModal;
window.toggleEditRecurringOptions = toggleEditRecurringOptions;
window.saveEditActivity = saveEditActivity;

// Helper function to edit by ID
function editActivityById(id) {
  const activity = window.activitiesData[id];
  if (activity) {
    showEditModal(activity);
  } else {
    showToast('Activity not found', 'error');
  }
}
window.editActivityById = editActivityById;

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

function showCreateTemplateModal() {
  document.getElementById('createTemplateModal').classList.add('active');
  // Clear form
  document.getElementById('templateName').value = '';
  document.getElementById('templateTitle').value = '';
  document.getElementById('templateDescription').value = '';
  document.getElementById('templatePriority').value = 'medium';
  document.getElementById('templateCategory').value = 'general';
  document.getElementById('templateEstimatedMinutes').value = '';
  document.getElementById('templateNotifyMinutes').value = '30';
}

async function createTemplate() {
  const name = document.getElementById('templateName').value.trim();
  const title = document.getElementById('templateTitle').value.trim();
  const description = document.getElementById('templateDescription').value.trim();
  const priority = document.getElementById('templatePriority').value;
  const category = document.getElementById('templateCategory').value;
  const estimatedMinutes = document.getElementById('templateEstimatedMinutes').value;
  const notificationMinutes = parseInt(document.getElementById('templateNotifyMinutes').value) || 30;

  if (!name || !title) {
    showToast('Please fill in template name and title', 'warning');
    return;
  }

  try {
    const response = await apiRequest('/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        title_template: title,
        description_template: description || null,
        priority,
        category,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        notification_minutes: notificationMinutes
      })
    });

    if (response.ok) {
      showToast('Template created successfully', 'success');
      closeModal('createTemplateModal');
      loadTemplates();
    } else {
      const error = await response.json();
      showToast(error.detail || 'Failed to create template', 'error');
    }
  } catch (error) {
    console.error('Failed to create template:', error);
    showToast('Failed to create template', 'error');
  }
}

function useTemplate(templateId) {
  document.getElementById('useTemplateId').value = templateId;
  document.getElementById('useTemplateModal').classList.add('active');
  
  // Set default deadline to tomorrow at current time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('templateDeadline').value = formatDatetimeLocal(tomorrow);
}

async function createActivityFromTemplate() {
  const templateId = document.getElementById('useTemplateId').value;
  const deadline = document.getElementById('templateDeadline').value;

  if (!deadline) {
    showToast('Please set a deadline', 'warning');
    return;
  }

  try {
    const deadlineISO = new Date(deadline).toISOString();
    const response = await apiRequest(
      `/templates/${templateId}/create-activity?deadline=${encodeURIComponent(deadlineISO)}`,
      { method: 'POST' }
    );

    if (response.ok) {
      showToast('Activity created from template', 'success');
      closeModal('useTemplateModal');
      loadActivities();
      // Switch to activities view
      switchView('activities');
    } else {
      const error = await response.json();
      showToast(error.detail || 'Failed to create activity', 'error');
    }
  } catch (error) {
    console.error('Failed to create activity from template:', error);
    showToast('Failed to create activity', 'error');
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

function saveSoundPreference() {
  const enabled = document.getElementById('enableSoundNotifications').checked;
  localStorage.setItem('soundNotifications', enabled ? 'true' : 'false');
  showToast('Sound preference saved', 'success');
}

function saveDefaultNotificationTime() {
  const minutes = document.getElementById('defaultNotificationMinutes').value;
  if (minutes >= 5 && minutes <= 1440) {
    localStorage.setItem('defaultNotificationMinutes', minutes);
    showToast('Default notification time saved', 'success');
  } else {
    showToast('Please enter a value between 5 and 1440 minutes', 'error');
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
  
  // Set notification preferences from localStorage
  const notificationPerm = Notification.permission === 'granted';
  document.getElementById('enableBrowserNotifications').checked = notificationPerm;
  
  const soundEnabled = localStorage.getItem('soundNotifications') === 'true';
  document.getElementById('enableSoundNotifications').checked = soundEnabled;
  
  const defaultMinutes = localStorage.getItem('defaultNotificationMinutes') || '30';
  document.getElementById('defaultNotificationMinutes').value = defaultMinutes;
}

// ============= NOTIFICATIONS VIEW =============

async function loadNotifications() {
  try {
    const response = await apiRequest('/notifications');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const notifications = await response.json();
    
    const container = document.getElementById('notificationsList');
    
    if (!container) {
      console.error('Notifications container not found');
      return;
    }
    
    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="notification-empty">
          <div class="notification-empty-icon">🔔</div>
          <p>No notifications yet</p>
          <p style="font-size: 13px; margin-top: 8px;">You'll see notifications here for the past 24 hours</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = notifications.map(notif => {
      const icon = getNotificationIcon(notif.type);
      const timeAgo = getTimeAgo(notif.created_at);
      const unreadClass = notif.is_read ? '' : 'unread';
      
      return `
        <div class="notification-item ${unreadClass} type-${notif.type}" data-id="${notif.id}">
          <div class="notification-icon-large">${icon}</div>
          <div class="notification-content">
            <div class="notification-title">${notif.title}</div>
            ${notif.message ? `<div class="notification-message">${notif.message}</div>` : ''}
            <div class="notification-time">
              <span>🕐</span>
              <span>${timeAgo}</span>
            </div>
          </div>
          <div class="notification-actions">
            ${!notif.is_read ? `<button onclick="markNotificationRead(${notif.id})" class="btn-sm btn-secondary" title="Mark as read">✓</button>` : ''}
            <button onclick="deleteNotification(${notif.id})" class="btn-sm btn-danger" title="Delete">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
    
    // Update unread count
    await updateUnreadCount();
  } catch (error) {
    console.error('Failed to load notifications:', error);
    const container = document.getElementById('notificationsList');
    if (container) {
      container.innerHTML = `
        <div class="notification-empty">
          <div class="notification-empty-icon">⚠️</div>
          <p>Failed to load notifications</p>
          <p style="font-size: 13px; margin-top: 8px; color: var(--danger);">${error.message}</p>
        </div>
      `;
    }
  }
}

function getNotificationIcon(type) {
  const icons = {
    'due_soon': '⏰',
    'missed': '❌',
    'completed': '✅',
    'created': '➕',
    'updated': '📝',
    'deleted': '🗑️',
    'snoozed': '😴'
  };
  return icons[type] || '🔔';
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function updateUnreadCount() {
  try {
    const response = await apiRequest('/notifications/unread-count');
    const data = await response.json();
    const badge = document.getElementById('unreadBadge');
    
    if (data.unread_count > 0) {
      badge.textContent = data.unread_count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to update unread count:', error);
  }
}

async function markNotificationRead(id) {
  try {
    await apiRequest(`/notifications/${id}/read`, {
      method: 'PUT'
    });
    loadNotifications();
    showToast('Marked as read', 'success');
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    showToast('Failed to mark as read', 'error');
  }
}

async function markAllNotificationsRead() {
  try {
    await apiRequest('/notifications/mark-all-read', {
      method: 'PUT'
    });
    loadNotifications();
    showToast('All notifications marked as read', 'success');
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    showToast('Failed to mark all as read', 'error');
  }
}

async function deleteNotification(id) {
  try {
    await apiRequest(`/notifications/${id}`, {
      method: 'DELETE'
    });
    loadNotifications();
    showToast('Notification deleted', 'success');
  } catch (error) {
    console.error('Failed to delete notification:', error);
    showToast('Failed to delete notification', 'error');
  }
}

async function clearAllNotifications() {
  if (!confirm('Are you sure you want to delete all notifications? This cannot be undone.')) {
    return;
  }
  
  try {
    const response = await apiRequest('/notifications');
    const notifications = await response.json();
    
    for (const notif of notifications) {
      await apiRequest(`/notifications/${notif.id}`, {
        method: 'DELETE'
      });
    }
    
    loadNotifications();
    showToast('All notifications cleared', 'success');
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    showToast('Failed to clear notifications', 'error');
  }
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
  
  // Update unread count whenever a notification comes in
  updateUnreadCount();
  
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
  
  // Update unread notification count
  updateUnreadCount();
  setInterval(updateUnreadCount, 60000); // Update every minute
}

// Check authentication on load (use auth_token like app.js)
authToken = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
if (authToken) {
  // Save in both formats for compatibility
  localStorage.setItem('auth_token', authToken);
  showApp();
} else {
  document.getElementById('authScreen').style.display = 'flex';
}

// Add Enter key support for login form
document.getElementById('loginEmail')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

// Add Enter key support for register form
document.getElementById('registerEmail')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') register();
});
document.getElementById('registerPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') register();
});
document.getElementById('registerConfirm')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') register();
});

// Clean up SSE on page unload
window.addEventListener('beforeunload', () => {
  disconnectSSE();
});
