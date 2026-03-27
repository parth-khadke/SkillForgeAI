// =================================
// ONBOARDING FLOW
// =================================

// State
const state = {
  currentStep: 1,
  totalSteps: 6,
  skill: '',
  goal: '',
  level: '',
  dailyTime: '',
  resources: []
};

// =================================
// INIT
// =================================

document.addEventListener('DOMContentLoaded', () => {
  // Redirect to login if not logged in
  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  // Redirect to dashboard if onboarding already done
  if (currentUser.hasCompletedOnboarding) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Populate user info in nav
  populateUserNav(currentUser);

  // Setup interactions
  setupHelpDropdown();
  setupLevelCards();
  setupTimePills();
  setupResourceCards();
  setupNavButtons();
  setupEnterKey();

  // Set initial progress
  updateProgress();
});

// =================================
// USER NAV
// =================================

function populateUserNav(user) {
  const nameEl = document.getElementById('userName');
  const avatarEl = document.getElementById('userAvatar');

  // Show first name only
  const firstName = user.name ? user.name.split(' ')[0] : 'User';
  nameEl.textContent = firstName;

  // Avatar: first letter of full name
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';
  avatarEl.textContent = initials;
}

// =================================
// HELP DROPDOWN
// =================================

function setupHelpDropdown() {
  const helpBtn = document.getElementById('helpBtn');
  const dropdown = document.getElementById('helpDropdown');

  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  // Close on outside click
  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
  });
}

// =================================
// STEP 2 — LEVEL CARDS (single select)
// =================================

function setupLevelCards() {
  const cards = document.querySelectorAll('.level-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.level = card.dataset.value;
      hideError('levelError');
    });
  });
}

// =================================
// STEP 3 — TIME PILLS (single select)
// =================================

function setupTimePills() {
  const pills = document.querySelectorAll('.time-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      state.dailyTime = pill.dataset.value;
      hideError('timeError');
    });
  });
}

// =================================
// STEP 4 — RESOURCE CARDS (multi select)
// =================================

function setupResourceCards() {
  const cards = document.querySelectorAll('.resource-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      const value = card.dataset.value;

      if (card.classList.contains('selected')) {
        if (!state.resources.includes(value)) {
          state.resources.push(value);
        }
      } else {
        state.resources = state.resources.filter(r => r !== value);
      }
      hideError('resourceError');
    });
  });
}

// =================================
// NAVIGATION BUTTONS
// =================================

function setupNavButtons() {
  const btnNext = document.getElementById('btnNext');
  const btnBack = document.getElementById('btnBack');

  btnNext.addEventListener('click', handleNext);
  btnBack.addEventListener('click', handleBack);

  // Hide back on step 1
  updateButtonStates();
}

function handleNext() {
  if (!validateCurrentStep()) return;

  if (state.currentStep < state.totalSteps) {
    goToStep(state.currentStep + 1);
  } else {
    // Final step — save and redirect
    finishOnboarding();
  }
}

function handleBack() {
  if (state.currentStep > 1) {
    goToStep(state.currentStep - 1);
  }
}

// Allow Enter key on text inputs
function setupEnterKey() {
  document.getElementById('skillInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleNext();
  });
  document.getElementById('goalInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleNext();
  });
}

// =================================
// STEP NAVIGATION
// =================================

function goToStep(targetStep) {
  document.getElementById(`step${state.currentStep}`).classList.remove('active');
  state.currentStep = targetStep;
  document.getElementById(`step${state.currentStep}`).classList.add('active');

  // Populate review panel when reaching step 6
  if (targetStep === 6) populateReview();

  updateProgress();
  updateButtonStates();
}

// Label maps for display
const levelLabels = { beginner: '🌱 Beginner', intermediate: '⚡ Intermediate', advanced: '🚀 Advanced' };
const timeLabels = { '30min': '30 minutes', '1hr': '1 hour', '1.5hr': '1.5 hours', '2hr+': '2+ hours' };
const resourceLabels = { youtube: 'YouTube Videos', projects: 'Hands-on Projects', books: 'Books / PDFs', courses: 'Courses' };

function populateReview() {
  document.getElementById('reviewSkill').textContent = state.skill;
  document.getElementById('reviewGoal').textContent = state.goal;
  document.getElementById('reviewLevel').textContent = levelLabels[state.level] || state.level;
  document.getElementById('reviewTime').textContent = timeLabels[state.dailyTime] || state.dailyTime;
  document.getElementById('reviewResources').textContent =
    state.resources.map(r => resourceLabels[r] || r).join(', ');
}

function updateProgress() {
  const percent = (state.currentStep / state.totalSteps) * 100;
  document.getElementById('progressFill').style.width = `${percent}%`;
  document.getElementById('progressLabel').textContent = `Step ${state.currentStep} of ${state.totalSteps}`;
}

function updateButtonStates() {
  const btnBack = document.getElementById('btnBack');
  const btnNext = document.getElementById('btnNext');

  // Back button
  btnBack.disabled = state.currentStep === 1;
  btnBack.style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';

  if (state.currentStep === state.totalSteps) {
    btnNext.textContent = 'Generate My Roadmap →';
  } else {
    btnNext.textContent = 'Next →';
  }
}

// =================================
// VALIDATION
// =================================

function validateSkillInput(value) {
  if (!value) return 'Please enter a skill to continue.';
  if (value.length > 100) return 'Keep it under 100 characters.';

  // Whitelist short/symbol-heavy but valid skills
  const whitelist = [
    // 1-2 character languages
    'c', 'r', 'go',
    // Symbol-containing languages
    'c++', 'c#', 'f#', 'q#',
    // 3-char languages/tools that look suspicious
    'php', 'sql', 'css', 'lua', 'nim', 'elm', 'zig', 'tcl', 'apl', 'awk', 'sed',
    // Common abbreviations/acronyms
    'ai', 'ml', 'dl', 'nlp', 'cv',
    // Frameworks/tools with symbols or short names
    'vue', 'ios', 'git', 'svn', 'gcc', 'gdb', 'vim',
    // Database shorthands
    'mysql', 'nosql',
    // Other edge cases
    'vba', 'vbs', 'sas', 'spss', 'matlab',
  ];
  if (whitelist.includes(value.toLowerCase())) return null;

  if (value.length < 3) return 'Please enter at least 3 characters.';
  if (/^[^a-zA-Z]+$/.test(value)) return 'Please enter a valid skill name.';
  if (/[!@#$%^&*()+=\[\]{};':"\\|,.<>\/?]/.test(value)) return 'No special characters allowed.';

  return null;
}

function validateGoalInput(value) {
  if (!value) return 'Please enter your goal to continue.';
  if (value.length < 3) return 'Please enter at least 3 characters.';
  if (value.length > 200) return 'Keep it under 200 characters.';
  if (/^[^a-zA-Z]+$/.test(value)) return 'Please enter a valid goal.';
  return null;
}

function validateCurrentStep() {
  switch (state.currentStep) {
    case 1:
      state.skill = document.getElementById('skillInput').value.trim();
      const skillError = validateSkillInput(state.skill);
      if (skillError) {
        showError('skillError', skillError);
        return false;
      }
      return true;

    case 2:
      state.goal = document.getElementById('goalInput').value.trim();
      const goalError = validateGoalInput(state.goal);
      if (goalError) {
        showError('goalError', goalError);
        return false;
      }
      return true;

    case 3:
      if (!state.level) {
        showError('levelError', 'Please select your level.');
        return false;
      }
      return true;

    case 4:
      if (!state.dailyTime) {
        showError('timeError', 'Please select your daily time.');
        return false;
      }
      return true;

    case 5:
      if (state.resources.length === 0) {
        showError('resourceError', 'Please select at least one resource type.');
        return false;
      }
      return true;

    case 6:
      // Review step — no validation needed, user confirmed
      return true;

    default:
      return true;
  }
}

// =================================
// ERROR HELPERS
// =================================

function showError(id, message = null) {
  const el = document.getElementById(id);
  if (!el) return;
  if (message) el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// =================================
// FINISH ONBOARDING
// =================================

function finishOnboarding() {
  const btnNext = document.getElementById('btnNext');
  btnNext.textContent = 'Generating...';
  btnNext.classList.add('loading');

  // Build onboarding data object
  const onboardingData = {
    skill: state.skill,
    goal: state.goal,
    level: state.level,
    dailyTime: state.dailyTime,
    resources: state.resources,
    completedAt: new Date().toISOString()
  };

  // Save to localStorage
  const currentUser = getCurrentUser();
  const isSessionUser = !!sessionStorage.getItem('skillforge_current_user');
  currentUser.hasCompletedOnboarding = true;
  currentUser.onboardingData = onboardingData;

  // Update user in current session storage mode
  if (isSessionUser) {
    sessionStorage.setItem('skillforge_current_user', JSON.stringify(currentUser));
  } else {
    localStorage.setItem('skillforge_current_user', JSON.stringify(currentUser));
  }

  // Also update in users array
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex] = currentUser;
    localStorage.setItem('skillforge_users', JSON.stringify(users));
  }

  // Save roadmap stub (to be filled by AI generation on dashboard)
  const roadmapStub = {
    id: `roadmap_${Date.now()}`,
    userId: currentUser.id,
    skill: state.skill,
    goal: state.goal,
    level: state.level,
    dailyTime: state.dailyTime,
    resources: state.resources,
    totalWeeks: 12,
    status: 'generating',
    createdAt: new Date().toISOString(),
    modules: []
  };

  localStorage.setItem('skillforge_current_roadmap', JSON.stringify(roadmapStub));

  // Short delay for UX, then redirect
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 800);
}

// =================================
// LOCALSTORAGE HELPERS
// (mirrors auth.js — keep in sync)
// =================================

function getCurrentUser() {
  const sessionUser = parseStoredJSON(sessionStorage, 'skillforge_current_user', null);
  if (sessionUser) return sessionUser;
  return parseStoredJSON(localStorage, 'skillforge_current_user', null);
}

function getUsers() {
  return parseStoredJSON(localStorage, 'skillforge_users', []);
}

function parseStoredJSON(storage, key, fallback) {
  const raw = storage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Invalid JSON in ${key}. Resetting it.`, error);
    storage.removeItem(key);
    return fallback;
  }
}
