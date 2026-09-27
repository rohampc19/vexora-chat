// ============================================
// VEXORA CHAT - Main App Logic
// ============================================

const API_BASE = '/api';
let currentPage = 1;

// ============== AUTH GUARD ==============

const accessToken = localStorage.getItem('vexora_access_token');
if (!accessToken) {
  // در دمو غیرفعال - در پروداکشن فعال کن:
  // window.location.href = 'auth.html';
}

// ============== TOAST ==============

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ============== API HELPER (با Auto Token Refresh) ==============

async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('vexora_access_token');

  let response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 || response.status === 403) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vexora_access_token')}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  const data = await response.json();
  if (!response.ok) throw data;
  return data;
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('vexora_refresh_token');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('vexora_access_token', data.accessToken);
      localStorage.setItem('vexora_refresh_token', data.refreshToken);
      return true;
    }
  } catch (err) {
    localStorage.removeItem('vexora_access_token');
    localStorage.removeItem('vexora_refresh_token');
    window.location.href = 'auth.html';
  }
  return false;
}

// ============== TIME FORMATTING ==============

function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'همین الان';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

// ============== RENDER FEED ==============

function renderPostCard(post) {
  const isPinned = post.isPinned ? `
    <div class="pin-badge">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-.7z"/></svg>
      پست ویژه
    </div>` : '';

  return `
    <article class="post-card" data-id="${post.id}">
      ${isPinned}
      <div class="post-header">
        <div class="avatar">
          <img src="${post.user?.avatarUrl || 'https://ui-avatars.com/api/?name=U'}" alt="${post.user?.username}">
        </div>
        <div>
          <div class="post-author">${post.user?.username || 'کاربر'}</div>
          <div class="post-meta">${timeAgo(post.createdAt)}</div>
        </div>
      </div>
      <div class="post-title">${escapeHtml(post.title)}</div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-actions">
        <button class="action-btn like-btn ${post.likedByMe ? 'liked' : ''}" data-id="${post.id}">
          <svg viewBox="0 0 24 24" fill="${post.likedByMe ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span>${post._count?.likes ?? post.likesCount ?? 0}</span>
        </button>
        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
          <span>${post._count?.comments ?? post.commentsCount ?? 0}</span>
        </button>
        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
          اشتراک
        </button>
      </div>
    </article>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============== LOAD FEED ==============

async function loadFeed() {
  const container = document.getElementById('feedContainer');
  try {
    const data = await apiRequest(`/chats?page=${currentPage}&limit=10`);
    if (data.data.length === 0 && currentPage === 1) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:var(--space-8) var(--space-5);">
          <div style="font-size:2.5rem; margin-bottom:var(--space-3);">🎮</div>
          <h3>هنوز پستی نیست!</h3>
          <p class="text-muted" style="margin-top:8px;">اولین نفری باش که چیزی به اشتراک می‌ذاره</p>
        </div>`;
      return;
    }
    container.innerHTML = data.data.map(renderPostCard).join('');
    attachLikeHandlers();
  } catch (error) {
    console.log('در انتظار اتصال به سرور...', error);
  }
}

// ============== LIKE HANDLER ==============

function attachLikeHandlers() {
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const chatId = btn.dataset.id;
      btn.style.transform = 'scale(1.15)';
      setTimeout(() => btn.style.transform = '', 150);

      try {
        const data = await apiRequest(`/chats/${chatId}/like`, 'POST');
        btn.classList.toggle('liked', data.liked);
        const countSpan = btn.querySelector('span');
        let count = parseInt(countSpan.textContent);
        countSpan.textContent = data.liked ? count + 1 : count - 1;
      } catch (error) {
        showToast('خطا در ثبت لایک', 'error');
      }
    });
  });
}

// ============== CREATE POST (Composer) ==============

function openComposer() {
  const title = prompt('عنوان پست:');
  if (!title) return;
  const content = prompt('متن پست:');
  if (!content) return;
  createPost(title, content);
}

async function createPost(title, content) {
  try {
    await apiRequest('/chats', 'POST', { title, content });
    showToast('پست منتشر شد! 🎉', 'success');
    currentPage = 1;
    loadFeed();
  } catch (error) {
    showToast(error.message || 'خطا در انتشار پست', 'error');
  }
}

document.getElementById('openComposer')?.addEventListener('click', openComposer);
document.getElementById('publishBtn')?.addEventListener('click', openComposer);
document.getElementById('mobileComposeBtn')?.addEventListener('click', openComposer);

// ============== NOTIFICATIONS ==============

document.getElementById('notifBtn')?.addEventListener('click', async () => {
  try {
    const data = await apiRequest('/notifications');
    if (data.notifications.length === 0) {
      showToast('اعلان جدیدی نداری', 'success');
    } else {
      showToast(`${data.unreadCount} اعلان جدید داری`, 'success');
    }
  } catch (error) {
    showToast('برای دیدن اعلان‌ها باید وارد بشی', 'error');
  }
});

// ============== WEBSOCKET (Real-time) ==============

function initWebSocket() {
  if (typeof io === 'undefined' || !accessToken) return;

  const socket = io({ auth: { token: accessToken } });

  socket.on('connect', () => console.log('✅ متصل به سرور real-time'));

  socket.on('new_chat', (chat) => {
    const container = document.getElementById('feedContainer');
    container.insertAdjacentHTML('afterbegin', renderPostCard(chat));
    attachLikeHandlers();
  });

  socket.on('notification', (data) => {
    showToast('اعلان جدید دریافت شد!', 'success');
    document.querySelector('.notif-dot')?.style.setProperty('display', 'block');
  });

  setInterval(() => socket.emit('heartbeat'), 30000);
}

// ============== MOBILE NAV ACTIVE STATE ==============

document.querySelectorAll('.bottomnav-item, .topnav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (link.getAttribute('href') === '#') e.preventDefault();
    document.querySelectorAll('.bottomnav-item, .topnav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// ============== INIT ==============

loadFeed();
initWebSocket();
