// =================================
// AUTH SYSTEM (localStorage)
// =================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initAuthPage();
});

// =================================
// INITIALIZATION
// =================================

function initAuthPage() {
  // Check if user is already logged in
  const currentUser = getCurrentUser();
  if (currentUser) {
    // Redirect to dashboard if already logged in
    window.location.href = 'dashboard.html';
    return;
  }

  // Setup tab switching
  setupTabs();
  
  // Setup password toggles
  setupPasswordToggles();
  
  // Setup form submissions
  setupForms();
}

// =================================
// TAB SWITCHING
// =================================

function setupTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active form
      forms.forEach(form => {
        if (form.id === `${targetTab}Form`) {
          form.classList.add('active');
        } else {
          form.classList.remove('active');
        }
      });
      
      // Clear any alerts
      hideAlert();
    });
  });
}

// =================================
// PASSWORD VISIBILITY TOGGLE
// =================================

function setupPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      const input = document.getElementById(targetId);
      
      if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = `
          <svg class="eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
          </svg>
        `;
      } else {
        input.type = 'password';
        button.innerHTML = `
          <svg class="eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
        `;
      }
    });
  });
}

// =================================
// FORM SUBMISSIONS
// =================================

function setupForms() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  
  // Add real-time password match validation
  setupPasswordMatchValidation();
}

// =================================
// LOGIN HANDLER
// =================================

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  
  // Validate inputs
  if (!email || !password) {
    showAlert('Please fill in all fields', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showAlert('Please enter a valid email address', 'error');
    return;
  }
  
  // Get users from localStorage
  const users = getUsers();
  
  // Find user
  const user = users.find(u => u.email === email);
  
  if (!user) {
    showAlert('Invalid email or password', 'error');
    return;
  }
  
  // Check password
  if (user.password !== password) {
    showAlert('Invalid email or password', 'error');
    return;
  }
  
  // Login successful
  setCurrentUser(user, rememberMe);
  showAlert('Login successful! Redirecting...', 'success');
  
  // Redirect to dashboard after short delay
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1000);
}

// =================================
// SIGNUP HANDLER
// =================================

async function handleSignup(e) {
  e.preventDefault();
  
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
  const agreeTerms = document.getElementById('agreeTerms').checked;
  
  // Validate inputs
  if (!name || !email || !password || !passwordConfirm) {
    showAlert('Please fill in all fields', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showAlert('Please enter a valid email address', 'error');
    return;
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    showAlert(passwordValidation.message, 'error');
    return;
  }
  
  if (password !== passwordConfirm) {
    showAlert('Passwords do not match', 'error');
    return;
  }
  
  if (!agreeTerms) {
    showAlert('Please agree to the Terms of Service', 'error');
    return;
  }
  
  // Check if user already exists
  const users = getUsers();
  const existingUser = users.find(u => u.email === email);
  
  if (existingUser) {
    showAlert('An account with this email already exists', 'error');
    return;
  }
  
  // Create new user
  const newUser = {
    id: generateUserId(),
    name: name,
    email: email,
    password: password, // In production, this should be hashed!
    createdAt: new Date().toISOString(),
    hasCompletedOnboarding: false
  };
  
  // Save user
  users.push(newUser);
  saveUsers(users);
  
  // Set as current user
  setCurrentUser(newUser, true);
  
  showAlert('Account created successfully! Redirecting...', 'success');
  
  // Redirect to onboarding after short delay
  setTimeout(() => {
    window.location.href = 'onboarding.html';
  }, 1000);
}

// =================================
// PASSWORD VALIDATION
// =================================

function validatePassword(password) {
  // Min 8 characters
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long'
    };
  }
  
  // Must contain at least 1 number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least 1 number'
    };
  }
  
  // Must contain at least 1 special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least 1 special character (!@#$%^&*...)'
    };
  }
  
  return { valid: true };
}

// =================================
// EMAIL VALIDATION
// =================================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// =================================
// ALERT DISPLAY
// =================================

function showAlert(message, type) {
  const alertBox = document.getElementById('authAlert');
  alertBox.textContent = message;
  alertBox.className = `auth-alert ${type}`;
  alertBox.classList.remove('hidden');
  
  // Auto-hide error messages after 5 seconds
  if (type === 'error') {
    setTimeout(() => {
      hideAlert();
    }, 5000);
  }
}

function hideAlert() {
  const alertBox = document.getElementById('authAlert');
  alertBox.classList.add('hidden');
}

// =================================
// LOCALSTORAGE HELPERS
// =================================

function getUsers() {
  const usersJSON = localStorage.getItem('skillforge_users');
  return usersJSON ? JSON.parse(usersJSON) : [];
}

function saveUsers(users) {
  localStorage.setItem('skillforge_users', JSON.stringify(users));
}

function getCurrentUser() {
  const userJSON = localStorage.getItem('skillforge_current_user');
  return userJSON ? JSON.parse(userJSON) : null;
}

function setCurrentUser(user, remember) {
  // Store in localStorage (persists even after browser close)
  localStorage.setItem('skillforge_current_user', JSON.stringify(user));
  
  // If "remember me" is checked, also store in sessionStorage
  if (remember) {
    sessionStorage.setItem('skillforge_remember', 'true');
  }
}

function logout() {
  localStorage.removeItem('skillforge_current_user');
  sessionStorage.removeItem('skillforge_remember');
  window.location.href = 'index.html';
}

// =================================
// UTILITY FUNCTIONS
// =================================

function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
// =================================
// REAL-TIME PASSWORD MATCH VALIDATION
// =================================

function setupPasswordMatchValidation() {
  const passwordInput = document.getElementById('signupPassword');
  const confirmInput = document.getElementById('signupPasswordConfirm');
  const indicator = document.getElementById('passwordMatchIndicator');
  
  if (!passwordInput || !confirmInput || !indicator) return;
  
  // Validate on confirm password input
  confirmInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    
    // Only show indicator if user has typed something in confirm field
    if (confirm.length === 0) {
      indicator.classList.remove('show', 'error', 'success');
      return;
    }
    
    // Check if passwords match
    if (password === confirm) {
      indicator.classList.remove('error');
      indicator.classList.add('show', 'success');
      indicator.innerHTML = '✓ Passwords match';
    } else {
      indicator.classList.remove('success');
      indicator.classList.add('show', 'error');
      indicator.innerHTML = '✗ Passwords do not match';
    }
  });
  
  // Also validate when main password changes
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    
    // Only update if user has already started typing in confirm field
    if (confirm.length > 0) {
      if (password === confirm) {
        indicator.classList.remove('error');
        indicator.classList.add('show', 'success');
        indicator.innerHTML = '✓ Passwords match';
      } else {
        indicator.classList.remove('success');
        indicator.classList.add('show', 'error');
        indicator.innerHTML = '✗ Passwords do not match';
      }
    }
  });
}

// Export logout function for use in other pages
window.logout = logout;
window.getCurrentUser = getCurrentUser;

// Export logout function for use in other pages
window.logout = logout;
window.getCurrentUser = getCurrentUser;