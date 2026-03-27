// =================================
// ROADMAP DASHBOARD
// =================================

let currentUser = null;
let currentRoadmap = null;
let expandedWeeks = new Set();

const ROADMAP_SCHEMA_VERSION = 'roadmap_v1';
const QUIZ_CACHE_VERSION = 'v1';

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'auth.html';
    return;
  }

  if (!currentUser.hasCompletedOnboarding || !currentUser.onboardingData) {
    window.location.href = 'onboarding.html';
    return;
  }

  currentRoadmap = getRoadmapRecord();
  if (!currentRoadmap) {
    window.location.href = 'onboarding.html';
    return;
  }

  populateUserNav(currentUser);
  bindDashboardActions();
  await loadRoadmap();
});

function populateUserNav(user) {
  const nameEl = document.getElementById('userName');
  const avatarEl = document.getElementById('userAvatar');

  const fullName = user.name || 'User';
  const initials = fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  nameEl.textContent = fullName;
  avatarEl.textContent = initials || '?';
}

function bindDashboardActions() {
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('refreshRoadmapBtn').addEventListener('click', () => loadRoadmap({ forceRefresh: true }));
  document.getElementById('retryBtn').addEventListener('click', () => loadRoadmap({ forceRefresh: true }));

  const moduleList = document.getElementById('moduleList');
  moduleList.addEventListener('click', handleModuleListClick);
  moduleList.addEventListener('change', handleModuleListChange);
}

async function loadRoadmap(options = {}) {
  const { forceRefresh = false } = options;
  const onboardingData = currentUser?.onboardingData;

  if (!onboardingData?.skill || !onboardingData?.goal) {
    window.location.href = 'onboarding.html';
    return;
  }

  updateHeroCopy(
    `${getFirstName(currentUser.name)}, we are building your ${onboardingData.skill} roadmap.`,
    `Your goal is ${onboardingData.goal}. We are turning that into a guided weekly sequence.`
  );

  setActionButtonsDisabled(true);

  const existingRoadmap = forceRefresh ? null : getRenderableRoadmap(currentRoadmap);
  if (existingRoadmap) {
    currentRoadmap = existingRoadmap;
    renderRoadmap(existingRoadmap);
    setActionButtonsDisabled(false);
    return;
  }

  showLoadingState(
    forceRefresh ? 'Regenerating your weekly roadmap' : 'Generating your weekly roadmap',
    forceRefresh
      ? 'We are asking the AI for a fresh 12-week plan and resetting the saved quiz cache.'
      : 'We are creating a 12-week roadmap with checklists, unlocks, and weekly validation.'
  );

  try {
    const generatedRoadmap = await generateRoadmap(onboardingData);
    const preparedRoadmap = buildRoadmapRecord(currentRoadmap, generatedRoadmap);

    clearAllCachedQuizzes(preparedRoadmap.id);

    currentRoadmap = preparedRoadmap;
    persistRoadmap(preparedRoadmap);
    renderRoadmap(preparedRoadmap);
  } catch (error) {
    console.error('[Dashboard] Failed to build roadmap:', error);
    showErrorState(error?.message || 'Try again in a moment.');
  } finally {
    setActionButtonsDisabled(false);
  }
}

function buildRoadmapRecord(baseRoadmap, generatedRoadmap) {
  const onboarding = currentUser.onboardingData;

  expandedWeeks = new Set([1]);

  return {
    id: baseRoadmap?.id || `roadmap_${Date.now()}`,
    schemaVersion: ROADMAP_SCHEMA_VERSION,
    userId: baseRoadmap?.userId || currentUser.id,
    skill: onboarding.skill,
    goal: onboarding.goal,
    level: onboarding.level,
    dailyTime: onboarding.dailyTime,
    resources: onboarding.resources,
    status: 'ready',
    source: generatedRoadmap.source,
    createdAt: baseRoadmap?.createdAt || new Date().toISOString(),
    generatedAt: generatedRoadmap.generatedAt,
    updatedAt: new Date().toISOString(),
    skillTitle: generatedRoadmap.skillTitle,
    summary: generatedRoadmap.summary,
    whyItMatters: generatedRoadmap.whyItMatters,
    milestone: generatedRoadmap.milestone,
    modules: generatedRoadmap.modules.map(createModuleState)
  };
}

function createModuleState(module) {
  return {
    weekNumber: module.weekNumber,
    title: module.title,
    summary: module.summary,
    goal: module.goal,
    deliverable: module.deliverable,
    quizFocus: module.quizFocus,
    resources: Array.isArray(module.resources) ? module.resources : [],
    instructions: Array.isArray(module.instructions)
      ? module.instructions.map((instruction, index) => ({
          id: `w${module.weekNumber}_t${index + 1}`,
          text: instruction,
          completed: false
        }))
      : [],
    isUnlocked: module.weekNumber === 1,
    isCompleted: false,
    quizStatus: 'not_started',
    quizScore: null,
    attempts: 0,
    completedAt: null,
    lastQuizAt: null
  };
}

function getRenderableRoadmap(roadmap) {
  if (!roadmap || roadmap.schemaVersion !== ROADMAP_SCHEMA_VERSION) {
    return null;
  }

  if (!Array.isArray(roadmap.modules) || roadmap.modules.length !== 12) {
    return null;
  }

  return syncRoadmapState(roadmap);
}

function syncRoadmapState(roadmap) {
  const modules = roadmap.modules.map((module, index) => hydrateModule(module, index + 1));

  modules.forEach((module, index) => {
    if (module.quizStatus === 'passed') {
      module.isCompleted = true;
      module.instructions = module.instructions.map((task) => ({ ...task, completed: true }));
    }

    module.isUnlocked = index === 0 || modules[index - 1].isCompleted;
  });

  return {
    ...roadmap,
    status: 'ready',
    modules
  };
}

function hydrateModule(module, weekNumber) {
  const instructions = Array.isArray(module.instructions)
    ? module.instructions
        .map((instruction, index) => normalizeTask(instruction, weekNumber, index + 1))
        .filter((instruction) => instruction.text)
    : [];

  const isCompleted = Boolean(module.isCompleted || module.quizStatus === 'passed');

  return {
    weekNumber,
    title: String(module.title || `Week ${weekNumber}`).trim(),
    summary: String(module.summary || '').trim(),
    goal: String(module.goal || '').trim(),
    deliverable: String(module.deliverable || '').trim(),
    quizFocus: String(module.quizFocus || '').trim(),
    resources: Array.isArray(module.resources) ? module.resources : [],
    instructions: instructions.map((instruction) => ({
      ...instruction,
      completed: isCompleted ? true : instruction.completed
    })),
    isUnlocked: Boolean(module.isUnlocked),
    isCompleted,
    quizStatus: isCompleted ? 'passed' : String(module.quizStatus || 'not_started'),
    quizScore: Number.isFinite(Number(module.quizScore)) ? Number(module.quizScore) : null,
    attempts: Number.isInteger(module.attempts) ? module.attempts : 0,
    completedAt: module.completedAt || null,
    lastQuizAt: module.lastQuizAt || null
  };
}

function normalizeTask(instruction, weekNumber, taskNumber) {
  if (typeof instruction === 'string') {
    return {
      id: `w${weekNumber}_t${taskNumber}`,
      text: instruction.trim(),
      completed: false
    };
  }

  return {
    id: instruction?.id || `w${weekNumber}_t${taskNumber}`,
    text: String(instruction?.text || '').trim(),
    completed: Boolean(instruction?.completed)
  };
}

function renderRoadmap(roadmap) {
  const onboarding = currentUser.onboardingData;
  const currentModule = getCurrentModule(roadmap.modules);
  const progress = getRoadmapProgress(roadmap.modules);
  const source = roadmap.source === 'gemini' ? 'Gemini live' : 'Fallback mode';
  const sourceEl = document.getElementById('roadmapSource');

  if (!expandedWeeks.size) {
    expandedWeeks = new Set([currentModule ? currentModule.weekNumber : 1]);
  }

  updateHeroCopy(
    `${getFirstName(currentUser.name)}, your ${onboarding.skill} roadmap is ready.`,
    'Finish each weekly checklist, take the test, and unlock the next module.'
  );

  sourceEl.textContent = source;
  sourceEl.className = `source-badge${roadmap.source === 'gemini' ? '' : ' source-badge--fallback'}`;

  document.getElementById('generatedStamp').textContent = formatGeneratedAt(roadmap.generatedAt);
  document.getElementById('skillTitle').textContent = roadmap.skillTitle || onboarding.skill;
  document.getElementById('goalLine').textContent = `Goal: ${onboarding.goal}`;
  document.getElementById('skillLevel').textContent = formatLevel(onboarding.level);
  document.getElementById('dailyCommitment').textContent = formatDailyTime(onboarding.dailyTime);
  document.getElementById('preferredResources').textContent = formatResourcePreferences(onboarding.resources);
  document.getElementById('progressValue').textContent = `${progress.completed}/${roadmap.modules.length} weeks complete`;
  document.getElementById('currentWeekValue').textContent = currentModule
    ? `Week ${currentModule.weekNumber}`
    : 'Roadmap completed';
  document.getElementById('skillSummary').textContent = roadmap.summary;
  document.getElementById('whyItMatters').textContent = roadmap.whyItMatters;
  document.getElementById('milestone').textContent = roadmap.milestone;

  renderModules(roadmap.modules);

  document.getElementById('statusPanel').classList.add('hidden');
  document.getElementById('errorPanel').classList.add('hidden');
  document.getElementById('roadmapWrap').classList.remove('hidden');
}

function renderModules(modules) {
  const list = document.getElementById('moduleList');
  list.innerHTML = modules.map((module) => buildModuleCardMarkup(module)).join('');
}

function buildModuleCardMarkup(module) {
  const isCurrent = module.isUnlocked && !module.isCompleted;
  const isLocked = !module.isUnlocked;
  const isExpanded = expandedWeeks.has(module.weekNumber);
  const completedTasks = module.instructions.filter((task) => task.completed).length;
  const totalTasks = module.instructions.length;
  const allTasksComplete = areAllTasksComplete(module);
  const canTakeQuiz = module.isCompleted || (module.isUnlocked && allTasksComplete);
  const actionLabel = module.isCompleted ? 'Retake Test' : 'Take Test';
  const statusLabel = module.isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Locked';
  const statusClass = module.isCompleted ? 'module-status--done' : isCurrent ? 'module-status--current' : 'module-status--locked';
  const scoreMarkup = module.quizScore !== null
    ? `<span class="score-pill">Best score ${module.quizScore}%</span>`
    : '';

  const taskMarkup = module.instructions
    .map((task) => {
      const checkedClass = task.completed ? ' task-row--checked' : '';
      const disabled = module.isCompleted ? 'disabled' : '';
      const checked = task.completed ? 'checked' : '';

      return `
        <label class="task-row${checkedClass}">
          <input
            type="checkbox"
            class="task-checkbox"
            data-week="${module.weekNumber}"
            data-task="${escapeHTML(task.id)}"
            ${checked}
            ${disabled}
          >
          <span>${escapeHTML(task.text)}</span>
        </label>
      `;
    })
    .join('');

  const resourceMarkup = module.resources.length
    ? module.resources
        .map(
          (resource) => `
            <article class="resource-card">
              <span class="resource-type">${escapeHTML(formatResourceType(resource.type))}</span>
              <strong class="resource-name">${escapeHTML(resource.title)}</strong>
              <p class="resource-reason">${escapeHTML(resource.reason)}</p>
            </article>
          `
        )
        .join('')
    : '<p class="muted-copy">Resources will appear when this week is available.</p>';

  const actionHint = module.isCompleted
    ? 'This week is complete. You can revisit the test any time.'
    : allTasksComplete
      ? 'Checklist complete. You can take the weekly test now.'
      : `Complete ${Math.max(totalTasks - completedTasks, 0)} more task(s) to unlock the test.`;

  const detailsMarkup = isLocked
    ? `
        <div class="module-locked">
          <p class="module-summary">${escapeHTML(module.summary)}</p>
          <div class="detail-stack">
            <div class="detail-box">
              <span class="detail-label">Week goal</span>
              <p>${escapeHTML(module.goal)}</p>
            </div>
          </div>
          <p class="locked-copy">Pass Week ${module.weekNumber - 1} to unlock this module's checklist, resources, and test.</p>
        </div>
      `
    : `
        <div class="module-content-grid">
          <div class="module-main">
            <p class="module-summary">${escapeHTML(module.summary)}</p>

            <div class="detail-stack">
              <div class="detail-box">
                <span class="detail-label">Week goal</span>
                <p>${escapeHTML(module.goal)}</p>
              </div>

              <div class="detail-box">
                <span class="detail-label">Deliverable</span>
                <p>${escapeHTML(module.deliverable)}</p>
              </div>

              <div class="detail-box">
                <span class="detail-label">Test focus</span>
                <p>${escapeHTML(module.quizFocus)}</p>
              </div>
            </div>

            <div class="task-block">
              <p class="subheading">Checklist</p>
              <div class="task-list">${taskMarkup}</div>
            </div>
          </div>

          <aside class="resource-panel">
            <p class="subheading">Recommended resources</p>
            <div class="resource-list">${resourceMarkup}</div>
          </aside>
        </div>

        <div class="module-footer">
          <p class="action-copy">${escapeHTML(actionHint)}</p>
          <button
            type="button"
            class="test-btn"
            data-take-test="${module.weekNumber}"
            ${canTakeQuiz ? '' : 'disabled'}
          >
            ${actionLabel}
          </button>
        </div>
      `;

  return `
    <article class="module-card${module.isCompleted ? ' module-card--done' : isCurrent ? ' module-card--current' : ' module-card--locked'}">
      <button
        type="button"
        class="module-toggle"
        data-toggle-week="${module.weekNumber}"
        aria-expanded="${isExpanded}"
      >
        <div class="module-toggle-main">
          <div class="module-topline">
            <span class="module-week">Week ${module.weekNumber}</span>
            <span class="module-status ${statusClass}">${statusLabel}</span>
          </div>
          <h3 class="module-title">${escapeHTML(module.title)}</h3>
          <p class="module-goal">${escapeHTML(module.goal)}</p>
        </div>

        <div class="module-toggle-side">
          <span class="task-progress">${completedTasks}/${totalTasks} tasks</span>
          ${scoreMarkup}
          <span class="toggle-copy">${isExpanded ? 'Hide details' : 'View details'}</span>
        </div>
      </button>

      <div class="module-details${isExpanded ? '' : ' hidden'}">
        ${detailsMarkup}
      </div>
    </article>
  `;
}

function handleModuleListClick(event) {
  const toggleButton = event.target.closest('[data-toggle-week]');
  if (toggleButton) {
    toggleWeekExpansion(Number(toggleButton.dataset.toggleWeek));
    return;
  }

  const testButton = event.target.closest('[data-take-test]');
  if (testButton) {
    openQuizPage(Number(testButton.dataset.takeTest));
  }
}

function handleModuleListChange(event) {
  const checkbox = event.target.closest('.task-checkbox');
  if (!checkbox) return;

  updateTaskCompletion(Number(checkbox.dataset.week), checkbox.dataset.task, checkbox.checked);
}

function toggleWeekExpansion(weekNumber) {
  if (expandedWeeks.has(weekNumber)) {
    expandedWeeks.delete(weekNumber);
  } else {
    expandedWeeks.add(weekNumber);
  }

  renderModules(currentRoadmap.modules);
}

function updateTaskCompletion(weekNumber, taskId, checked) {
  const module = getModuleByWeek(currentRoadmap.modules, weekNumber);
  if (!module || !module.isUnlocked || module.isCompleted) {
    return;
  }

  module.instructions = module.instructions.map((task) =>
    task.id === taskId ? { ...task, completed: checked } : task
  );

  currentRoadmap.updatedAt = new Date().toISOString();
  persistRoadmap(currentRoadmap);
  renderRoadmap(currentRoadmap);
}

function openQuizPage(weekNumber) {
  const module = getModuleByWeek(currentRoadmap.modules, weekNumber);
  if (!module || !module.isUnlocked) {
    return;
  }

  if (!module.isCompleted && !areAllTasksComplete(module)) {
    return;
  }

  window.location.href = `quiz.html?week=${weekNumber}`;
}

function areAllTasksComplete(module) {
  return module.instructions.length > 0 && module.instructions.every((task) => task.completed);
}

function getCurrentModule(modules) {
  return modules.find((module) => module.isUnlocked && !module.isCompleted) || null;
}

function getRoadmapProgress(modules) {
  return {
    completed: modules.filter((module) => module.isCompleted).length
  };
}

function getModuleByWeek(modules, weekNumber) {
  return modules.find((module) => module.weekNumber === weekNumber) || null;
}

function showLoadingState(title, copy) {
  document.getElementById('statusTitle').textContent = title;
  document.getElementById('statusCopy').textContent = copy;
  document.getElementById('statusPanel').classList.remove('hidden');
  document.getElementById('roadmapWrap').classList.add('hidden');
  document.getElementById('errorPanel').classList.add('hidden');
}

function showErrorState(message) {
  updateHeroCopy(
    'We hit a problem while building the roadmap.',
    'Use the button below to request a fresh generation.'
  );

  document.getElementById('statusPanel').classList.add('hidden');
  document.getElementById('roadmapWrap').classList.add('hidden');
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorPanel').classList.remove('hidden');
}

function updateHeroCopy(title, subtitle) {
  document.getElementById('heroTitle').textContent = title;
  document.getElementById('heroSubtitle').textContent = subtitle;
}

function setActionButtonsDisabled(disabled) {
  document.getElementById('refreshRoadmapBtn').disabled = disabled;
  document.getElementById('retryBtn').disabled = disabled;
}

function persistRoadmap(roadmap) {
  localStorage.setItem('skillforge_current_roadmap', JSON.stringify(roadmap));
}

function clearAllCachedQuizzes(roadmapId) {
  for (let weekNumber = 1; weekNumber <= 12; weekNumber += 1) {
    localStorage.removeItem(getQuizCacheKey(roadmapId, weekNumber));
  }
}

function formatGeneratedAt(value) {
  if (!value) return 'Generated just now';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Generated just now';

  return `Generated ${date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })}`;
}

function formatLevel(level) {
  const labels = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  };

  return labels[level] || 'Not set';
}

function formatDailyTime(dailyTime) {
  const labels = {
    '30min': '30 minutes',
    '1hr': '1 hour',
    '1.5hr': '1.5 hours',
    '2hr+': '2+ hours'
  };

  return labels[dailyTime] || 'Flexible';
}

function formatResourcePreferences(resources = []) {
  const labels = {
    youtube: 'YouTube videos',
    projects: 'Hands-on projects',
    books: 'Books and PDFs',
    courses: 'Courses',
    articles: 'Articles'
  };

  if (!resources.length) {
    return 'No preference selected';
  }

  return resources.map((resource) => labels[resource] || resource).join(', ');
}

function formatResourceType(type) {
  const labels = {
    youtube: 'YouTube',
    project: 'Project',
    book: 'Book',
    course: 'Course',
    article: 'Article'
  };

  return labels[type] || 'Resource';
}

function getQuizCacheKey(roadmapId, weekNumber) {
  return `skillforge_module_quiz_${QUIZ_CACHE_VERSION}_${roadmapId}_${weekNumber}`;
}

function getFirstName(name) {
  return (name || 'User').split(' ')[0];
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

function getCurrentUser() {
  const sessionUser = parseStoredJSON(sessionStorage, 'skillforge_current_user', null);
  if (sessionUser) return sessionUser;
  return parseStoredJSON(localStorage, 'skillforge_current_user', null);
}

function getRoadmapRecord() {
  return parseStoredJSON(localStorage, 'skillforge_current_roadmap', null);
}

function logout() {
  localStorage.removeItem('skillforge_current_user');
  sessionStorage.removeItem('skillforge_current_user');
  sessionStorage.removeItem('skillforge_remember');
  window.location.href = 'index.html';
}

function escapeHTML(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.logout = logout;
