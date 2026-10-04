const ACCOUNT_STORAGE_KEY = 'xoAmAccounts';
const AUTH_ITERATIONS = 210000;
const ACCOUNT_STAT_KEYS = ['wins', 'losses', 'draws', 'points'];

function getAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || '[]');
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function setAuthMessage(message, isError = true) {
  const messageElement = document.getElementById('authMessage');
  if (!messageElement) return;

  messageElement.textContent = message;
  messageElement.classList.toggle('error', Boolean(message) && isError);
  messageElement.classList.toggle('success', Boolean(message) && !isError);
}

function validateSignupInput({ displayName, email, password, confirmPassword }) {
  const trimmedName = displayName.trim();
  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 24) {
    return 'Display name must be 2-24 characters long.';
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
    return 'Display name can only include letters, numbers, spaces, underscores, and hyphens.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return '';
}

function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: AUTH_ITERATIONS,
    hash: 'SHA-256'
  }, key, 256);
  return new Uint8Array(bits);
}

function activateAccount(account) {
  localStorage.setItem('username', account.displayName);
  ACCOUNT_STAT_KEYS.forEach(key => {
    localStorage.setItem(key, String(account.stats?.[key] ?? 0));
  });
  localStorage.setItem('matchHistory', JSON.stringify(account.matchHistory || []));
}

function saveCurrentAccountData() {
  const username = localStorage.getItem('username');
  if (!username) return;

  const accounts = getAccounts();
  const account = accounts.find(item => item.displayName.toLowerCase() === username.toLowerCase());
  if (!account) return;

  account.stats = Object.fromEntries(ACCOUNT_STAT_KEYS.map(key => [
    key,
    Number.parseInt(localStorage.getItem(key) || '0', 10) || 0
  ]));
  try {
    account.matchHistory = JSON.parse(localStorage.getItem('matchHistory') || '[]');
  } catch {
    account.matchHistory = [];
  }
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
}

function applyTheme(isDarkMode) {
  const theme = isDarkMode ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('darkMode', String(isDarkMode));

  const themeButton = document.getElementById('themeToggleButton');
  if (themeButton) {
    themeButton.dataset.theme = theme;
    themeButton.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
    themeButton.setAttribute('aria-pressed', String(isDarkMode));
  }

  const settingsToggle = document.getElementById('darkToggle');
  if (settingsToggle) settingsToggle.checked = isDarkMode;
}

function bindPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    const wrapper = button.closest('.password-input-wrap');
    const input = wrapper?.querySelector('input');
    if (!wrapper || !input) return;

    button.addEventListener('click', () => {
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      button.textContent = isVisible ? 'Show' : 'Hide';
      button.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
      button.setAttribute('aria-pressed', String(!isVisible));
    });
  });
}

async function handleSignup(event) {
  event.preventDefault();
  setAuthMessage('', true);

  const displayName = document.getElementById('displayName').value;
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const validationMessage = validateSignupInput({ displayName, email, password, confirmPassword });
  if (validationMessage) {
    setAuthMessage(validationMessage, true);
    return;
  }

  const accounts = getAccounts();
  if (accounts.some(account => account.email.toLowerCase() === email || account.displayName.toLowerCase() === displayName.trim().toLowerCase())) {
    setAuthMessage('That email or display name is already registered.', true);
    return;
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordHash = await hashPassword(password, salt);
    const account = {
      displayName: displayName.trim(),
      email,
      salt: toHex(salt),
      passwordHash: toHex(passwordHash),
      stats: { wins: 0, losses: 0, draws: 0, points: 0 },
      matchHistory: []
    };
    accounts.push(account);
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
    activateAccount(account);
    window.location.href = 'index.html';
  } catch {
    setAuthMessage('Could not create your account in this browser. Try serving the app from localhost.', true);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setAuthMessage('');

  const identifier = document.getElementById('username').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const account = getAccounts().find(item =>
    item.email.toLowerCase() === identifier || item.displayName.toLowerCase() === identifier
  );

  if (!account) {
    setAuthMessage('Account not found. Check your details or create an account.');
    return;
  }

  try {
    const salt = Uint8Array.from(account.salt.match(/.{2}/g), byte => Number.parseInt(byte, 16));
    const passwordHash = toHex(await hashPassword(password, salt));
    let difference = passwordHash.length ^ account.passwordHash.length;
    for (let index = 0; index < Math.min(passwordHash.length, account.passwordHash.length); index++) {
      difference |= passwordHash.charCodeAt(index) ^ account.passwordHash.charCodeAt(index);
    }
    if (difference !== 0) {
      setAuthMessage('Incorrect password. Please try again.');
      return;
    }

    saveCurrentAccountData();
    activateAccount(account);
    window.location.href = 'index.html';
  } catch {
    setAuthMessage('Could not verify your account in this browser. Try serving the app from localhost.');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const themeButton = document.createElement('button');
  themeButton.id = 'themeToggleButton';
  themeButton.className = 'theme-toggle-button';
  themeButton.type = 'button';
  themeButton.innerHTML = '<span class="theme-toggle-thumb" aria-hidden="true"></span><span class="theme-toggle-icon" aria-hidden="true"></span>';
  document.body.append(themeButton);
  applyTheme(localStorage.getItem('darkMode') !== 'false');
  themeButton.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light');
  });
  document.getElementById('darkToggle')?.addEventListener('change', event => {
    applyTheme(event.target.checked);
  });

  const activeName = localStorage.getItem('username');
  const activeAccount = getAccounts().find(account => account.displayName === activeName);
  if (activeAccount) activateAccount(activeAccount);

  const protectedPages = ['index.html', 'modes.html', 'records.html', 'settings.html'];
  if (protectedPages.includes(location.pathname.split('/').pop()) && !activeAccount) {
    window.location.replace('login.html');
    return;
  }

  bindPasswordToggles();

  document.getElementById('signupForm')?.addEventListener('submit', handleSignup);
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.querySelectorAll('[data-auth-logout]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      if (!window.confirm('Are you sure you want to log out?')) return;

      saveCurrentAccountData();
      localStorage.removeItem('username');
      window.location.href = 'login.html';
    });
  });
});

window.addEventListener('pagehide', saveCurrentAccountData);