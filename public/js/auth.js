// ============================================
// VEXORA CHAT - Authentication Logic
// ============================================

const API_BASE = '/api';

// ============== TOAST NOTIFICATIONS ==============

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success'
    ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>'
    : '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastIn 0.2s ease-in reverse';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// ============== FORM SWITCHING ==============

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const authSwitch = document.getElementById('authSwitch');

function showSignup() {
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
  formTitle.textContent = 'بساز و شروع کن!';
  formSubtitle.textContent = 'به جامعه گیمرهای VEXORA بپیوند';
  authSwitch.innerHTML = 'قبلاً حساب داری؟ <a href="#" id="switchToLogin">وارد شو</a>';
  document.getElementById('switchToLogin').addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
}

function showLogin() {
  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
  formTitle.textContent = 'خوش برگشتی!';
  formSubtitle.textContent = 'وارد شو و به جمع گیمرها بپیوند';
  authSwitch.innerHTML = 'حساب کاربری نداری؟ <a href="#" id="switchToSignup">ثبت‌نام کن</a>';
  document.getElementById('switchToSignup').addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
}

document.getElementById('switchToSignup')?.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });

// ============== PASSWORD STRENGTH METER (Live) ==============

const signupPassword = document.getElementById('signupPassword');
const strengthBars = document.querySelectorAll('.pw-strength-bar');
const strengthText = document.getElementById('pwStrengthText');

signupPassword?.addEventListener('input', (e) => {
  const password = e.target.value;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;

  strengthBars.forEach((bar, i) => {
    bar.className = 'pw-strength-bar';
    if (i < score) {
      if (score <= 2) bar.classList.add('filled-weak');
      else if (score <= 4) bar.classList.add('filled-medium');
      else bar.classList.add('filled-strong');
    }
  });

  if (password.length === 0) strengthText.textContent = 'حداقل ۸ کاراکتر، شامل حرف بزرگ، کوچک و عدد';
  else if (score <= 2) strengthText.textContent = '🔴 ضعیف - نیاز به کاراکتر خاص و عدد';
  else if (score <= 4) strengthText.textContent = '🟡 متوسط';
  else strengthText.textContent = '🟢 قوی - عالیه!';
});

// ============== LIVE VALIDATION ==============

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(inputId, errorId, message) {
  document.getElementById(inputId).classList.add('error');
  document.getElementById(errorId).textContent = message;
}

function clearFieldError(inputId, errorId) {
  document.getElementById(inputId).classList.remove('error');
  document.getElementById(errorId).textContent = '';
}

// ============== API HELPER ==============

async function apiRequest(endpoint, method = 'POST', body = null) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) throw { status: response.status, ...data };
  return data;
}

function saveTokens(accessToken, refreshToken) {
  localStorage.setItem('vexora_access_token', accessToken);
  localStorage.setItem('vexora_refresh_token', refreshToken);
}

// ============== LOGIN SUBMIT ==============

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  clearFieldError('loginEmail', 'loginEmailError');
  clearFieldError('loginPassword', 'loginPasswordError');

  if (!validateEmail(email)) {
    showFieldError('loginEmail', 'loginEmailError', 'فرمت ایمیل نامعتبر است');
    return;
  }

  const btn = document.getElementById('loginSubmitBtn');
  const btnText = document.getElementById('loginBtnText');
  btn.disabled = true;
  btnText.textContent = 'در حال ورود...';

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });

    if (data.requires2FA) {
      showToast('کد تایید دو مرحله‌ای را وارد کنید', 'success');
      sessionStorage.setItem('vexora_temp_token', data.tempToken);
      window.location.href = 'verify-2fa.html';
      return;
    }

    saveTokens(data.accessToken, data.refreshToken);
    showToast(`خوش اومدی ${data.user.username}! 🎮`, 'success');
    setTimeout(() => window.location.href = 'index.html', 800);

  } catch (error) {
    showToast(error.message || 'خطا در ورود', 'error');
    if (error.status === 401) {
      showFieldError('loginPassword', 'loginPasswordError', 'ایمیل یا رمز عبور نادرست است');
    }
  } finally {
    btn.disabled = false;
    btnText.textContent = 'ورود';
  }
});

// ============== SIGNUP SUBMIT ==============

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

  ['signupUsername', 'signupEmail', 'signupPasswordConfirm'].forEach(id => {
    clearFieldError(id, id + 'Error');
  });

  let hasError = false;

  if (username.length < 3) {
    showFieldError('signupUsername', 'signupUsernameError', 'نام کاربری باید حداقل ۳ کاراکتر باشد');
    hasError = true;
  }
  if (!validateEmail(email)) {
    showFieldError('signupEmail', 'signupEmailError', 'فرمت ایمیل نامعتبر است');
    hasError = true;
  }
  if (password !== passwordConfirm) {
    showFieldError('signupPasswordConfirm', 'signupPasswordConfirmError', 'رمزهای عبور مطابقت ندارند');
    hasError = true;
  }

  if (hasError) return;

  const btn = document.getElementById('signupSubmitBtn');
  const btnText = document.getElementById('signupBtnText');
  btn.disabled = true;
  btnText.textContent = 'در حال ساخت حساب...';

  try {
    const data = await apiRequest('/auth/signup', 'POST', { username, email, password, passwordConfirm });
    saveTokens(data.accessToken, data.refreshToken);
    showToast('ثبت‌نام موفق! به VEXORA خوش اومدی 🎉', 'success');
    setTimeout(() => window.location.href = 'index.html', 800);

  } catch (error) {
    if (error.errors) {
      error.errors.forEach(err => {
        const fieldMap = { username: 'signupUsername', email: 'signupEmail', password: 'signupPassword' };
        const fieldId = fieldMap[err.field];
        if (fieldId) showFieldError(fieldId, fieldId + 'Error', err.message);
      });
    } else {
      showToast(error.message || 'خطا در ثبت‌نام', 'error');
    }
  } finally {
    btn.disabled = false;
    btnText.textContent = 'ساخت حساب کاربری';
  }
});

if (localStorage.getItem('vexora_access_token')) {
  // window.location.href = 'index.html'; // در دمو غیرفعال
}
