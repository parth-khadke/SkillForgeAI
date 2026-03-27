// =================================
// WEEKLY QUIZ PAGE
// =================================

let currentUser = null;
let currentRoadmap = null;
let currentModule = null;
let currentQuiz = null;
let currentResult = null;

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
  if (!currentRoadmap || currentRoadmap.schemaVersion !== ROADMAP_SCHEMA_VERSION) {
    window.location.href = 'dashboard.html';
    return;
  }

  currentRoadmap = syncRoadmapState(currentRoadmap);

  const weekNumber = getWeekNumberFromURL();
  currentModule = getModuleByWeek(currentRoadmap.modules, weekNumber);

  if (!currentModule || !currentModule.isUnlocked) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (!currentModule.isCompleted && !areAllTasksComplete(currentModule)) {
    window.location.href = 'dashboard.html';
    return;
  }

  populateUserNav(currentUser);
  bindQuizActions();
  await loadQuiz();
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

function bindQuizActions() {
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('regenQuizBtn').addEventListener('click', () => loadQuiz({ forceRefresh: true }));
  document.getElementById('retryBtn').addEventListener('click', () => loadQuiz({ forceRefresh: true }));
  document.getElementById('retrySameQuizBtn').addEventListener('click', resetQuizAttempt);
  document.getElementById('quizForm').addEventListener('submit', handleQuizSubmit);
}

async function loadQuiz(options = {}) {
  const { forceRefresh = false } = options;

  updateHeroCopy(
    `${getFirstName(currentUser.name)}, Week ${currentModule.weekNumber} test is loading.`,
    `This quiz checks whether you are ready to move beyond ${currentModule.title}.`
  );

  setActionButtonsDisabled(true);
  clearHelperMessage();

  const cachedQuiz = forceRefresh ? null : getCachedQuiz(currentRoadmap.id, currentModule.weekNumber);
  if (cachedQuiz) {
    currentQuiz = cachedQuiz;
    currentResult = null;
    renderQuiz(cachedQuiz);
    setActionButtonsDisabled(false);
    return;
  }

  showLoadingState(
    forceRefresh ? 'Regenerating your weekly quiz' : 'Generating your weekly quiz',
    forceRefresh
      ? 'We are asking for a fresh set of questions for this week and replacing the saved quiz.'
      : 'We only generate quizzes on demand so the roadmap stays fast and API calls stay focused.'
  );

  try {
    const quiz = await generateModuleQuiz(currentUser.onboardingData, currentModule);
    currentQuiz = quiz;
    currentResult = null;

    saveQuiz(currentRoadmap.id, currentModule.weekNumber, quiz);
    renderQuiz(quiz);
  } catch (error) {
    console.error('[Quiz] Failed to build quiz:', error);
    showErrorState(error?.message || 'Try again in a moment.');
  } finally {
    setActionButtonsDisabled(false);
  }
}

function renderQuiz(quiz) {
  const sourceEl = document.getElementById('quizSource');

  updateHeroCopy(
    `${getFirstName(currentUser.name)}, Week ${currentModule.weekNumber} test is ready.`,
    `Pass this quiz to unlock the next module in your ${currentRoadmap.skill} roadmap.`
  );

  sourceEl.textContent = quiz.source === 'gemini' ? 'Gemini live' : 'Fallback mode';
  sourceEl.className = `source-badge${quiz.source === 'gemini' ? '' : ' source-badge--fallback'}`;

  document.getElementById('generatedStamp').textContent = formatGeneratedAt(quiz.generatedAt);
  document.getElementById('quizWeekLabel').textContent = `Week ${currentModule.weekNumber} validation`;
  document.getElementById('quizTitle').textContent = currentModule.title;
  document.getElementById('quizDescription').textContent = quiz.description;
  document.getElementById('passingScoreValue').textContent = `${quiz.passingScore}%`;
  document.getElementById('attemptsValue').textContent = String(currentModule.attempts);
  document.getElementById('bestScoreValue').textContent = currentModule.quizScore !== null
    ? `${currentModule.quizScore}%`
    : 'Not attempted';
  document.getElementById('moduleStatusValue').textContent = currentModule.isCompleted
    ? 'Completed'
    : currentModule.quizStatus === 'failed'
      ? 'Retry available'
      : 'Ready';

  renderQuestions(quiz.questions, currentResult);

  document.getElementById('statusPanel').classList.add('hidden');
  document.getElementById('errorPanel').classList.add('hidden');
  document.getElementById('quizWrap').classList.remove('hidden');

  const submitQuizBtn = document.getElementById('submitQuizBtn');
  submitQuizBtn.disabled = Boolean(currentResult);
  submitQuizBtn.textContent = currentResult ? 'Quiz submitted' : 'Submit quiz';

  const resultPanel = document.getElementById('resultPanel');
  if (!currentResult) {
    resultPanel.classList.add('hidden');
    resultPanel.className = 'result-panel hidden';
    return;
  }

  renderResultPanel();
}

function renderQuestions(questions, result) {
  const questionList = document.getElementById('questionList');

  questionList.innerHTML = questions
    .map((question, questionIndex) => buildQuestionMarkup(question, questionIndex, result))
    .join('');
}

function buildQuestionMarkup(question, questionIndex, result) {
  const selectedAnswer = result ? result.selectedAnswers[questionIndex] : null;
  const optionsMarkup = question.options
    .map((option, optionIndex) => {
      const isChecked = selectedAnswer === optionIndex;
      const isCorrect = question.correctAnswerIndex === optionIndex;
      const optionClass = result
        ? isCorrect
          ? ' option-row--correct'
          : isChecked
            ? ' option-row--wrong'
            : ''
        : '';

      return `
        <label class="option-row${optionClass}">
          <input
            type="radio"
            name="question_${questionIndex}"
            value="${optionIndex}"
            ${isChecked ? 'checked' : ''}
            ${result ? 'disabled' : ''}
          >
          <span>${escapeHTML(option)}</span>
        </label>
      `;
    })
    .join('');

  const feedbackMarkup = result
    ? `
        <div class="feedback-box">
          <span class="feedback-label">Explanation</span>
          <p class="feedback-copy">${escapeHTML(question.explanation)}</p>
        </div>
      `
    : '';

  return `
    <article class="question-card">
      <span class="question-number">Question ${questionIndex + 1}</span>
      <h3 class="question-title">${escapeHTML(question.prompt)}</h3>
      <div class="option-list">${optionsMarkup}</div>
      ${feedbackMarkup}
    </article>
  `;
}

function handleQuizSubmit(event) {
  event.preventDefault();

  const selectedAnswers = currentQuiz.questions.map((question, questionIndex) => {
    const checkedInput = document.querySelector(`input[name="question_${questionIndex}"]:checked`);
    return checkedInput ? Number(checkedInput.value) : null;
  });

  if (selectedAnswers.some((answer) => answer === null)) {
    showHelperMessage('Answer all questions before submitting.', true);
    return;
  }

  const correctCount = currentQuiz.questions.reduce((count, question, questionIndex) => {
    return count + (selectedAnswers[questionIndex] === question.correctAnswerIndex ? 1 : 0);
  }, 0);

  const score = Math.round((correctCount / currentQuiz.questions.length) * 100);
  const passed = score >= currentQuiz.passingScore;

  currentResult = {
    selectedAnswers,
    correctCount,
    score,
    passed
  };

  updateRoadmapAfterQuiz(score, passed);
  renderQuiz(currentQuiz);
}

function updateRoadmapAfterQuiz(score, passed) {
  const timestamp = new Date().toISOString();
  const module = getModuleByWeek(currentRoadmap.modules, currentModule.weekNumber);

  if (!module) return;

  module.attempts += 1;
  module.quizScore = module.quizScore === null ? score : Math.max(module.quizScore, score);
  module.lastQuizAt = timestamp;

  if (passed) {
    module.quizStatus = 'passed';
    module.isCompleted = true;
    module.completedAt = module.completedAt || timestamp;
    module.instructions = module.instructions.map((task) => ({ ...task, completed: true }));

    const nextModule = getModuleByWeek(currentRoadmap.modules, currentModule.weekNumber + 1);
    if (nextModule) {
      nextModule.isUnlocked = true;
    }
  } else {
    module.quizStatus = 'failed';
  }

  currentRoadmap.updatedAt = timestamp;
  currentRoadmap = syncRoadmapState(currentRoadmap);
  currentModule = getModuleByWeek(currentRoadmap.modules, currentModule.weekNumber);
  persistRoadmap(currentRoadmap);
}

function renderResultPanel() {
  const resultPanel = document.getElementById('resultPanel');
  const resultTitle = document.getElementById('resultTitle');
  const resultCopy = document.getElementById('resultCopy');
  const retrySameQuizBtn = document.getElementById('retrySameQuizBtn');

  resultPanel.className = `result-panel ${currentResult.passed ? 'result-panel--pass' : 'result-panel--fail'}`;

  if (currentResult.passed) {
    const nextWeek = getModuleByWeek(currentRoadmap.modules, currentModule.weekNumber + 1);

    resultTitle.textContent = `You passed with ${currentResult.score}%`;
    resultCopy.textContent = nextWeek
      ? `Week ${nextWeek.weekNumber} is now unlocked on your dashboard. You can return to the roadmap and continue when you are ready.`
      : 'You completed the final weekly validation. Your roadmap is fully complete.';
    retrySameQuizBtn.textContent = 'Retake this quiz';
  } else {
    resultTitle.textContent = `You scored ${currentResult.score}%`;
    resultCopy.textContent = `You need ${currentQuiz.passingScore}% to pass. Review the explanations above, then try again when you feel ready.`;
    retrySameQuizBtn.textContent = 'Try again';
  }

  resultPanel.classList.remove('hidden');
}

function resetQuizAttempt() {
  currentResult = null;
  clearHelperMessage();
  renderQuiz(currentQuiz);
}

function showLoadingState(title, copy) {
  document.getElementById('statusTitle').textContent = title;
  document.getElementById('statusCopy').textContent = copy;
  document.getElementById('statusPanel').classList.remove('hidden');
  document.getElementById('quizWrap').classList.add('hidden');
  document.getElementById('errorPanel').classList.add('hidden');
}

function showErrorState(message) {
  updateHeroCopy(
    'We hit a problem while preparing the quiz.',
    'Use the retry button below to request a fresh set of questions.'
  );

  document.getElementById('statusPanel').classList.add('hidden');
  document.getElementById('quizWrap').classList.add('hidden');
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorPanel').classList.remove('hidden');
}

function updateHeroCopy(title, subtitle) {
  document.getElementById('quizHeroTitle').textContent = title;
  document.getElementById('quizHeroSubtitle').textContent = subtitle;
}

function setActionButtonsDisabled(disabled) {
  document.getElementById('regenQuizBtn').disabled = disabled;
  document.getElementById('retryBtn').disabled = disabled;
}

function showHelperMessage(message, isError = false) {
  const helper = document.getElementById('quizHelperCopy');
  helper.textContent = message;
  helper.className = `helper-copy${isError ? ' helper-copy--error' : ''}`;
}

function clearHelperMessage() {
  showHelperMessage('Answer all questions, then submit. Passing this quiz unlocks the next week.');
}

function getWeekNumberFromURL() {
  const params = new URLSearchParams(window.location.search);
  const weekNumber = Number(params.get('week'));
  return Number.isInteger(weekNumber) && weekNumber > 0 ? weekNumber : 1;
}

function areAllTasksComplete(module) {
  return module.instructions.length > 0 && module.instructions.every((task) => task.completed);
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
    instructions: instructions.map((instruction) => ({
      ...instruction,
      completed: isCompleted ? true : instruction.completed
    })),
    resources: Array.isArray(module.resources) ? module.resources : [],
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

function getModuleByWeek(modules, weekNumber) {
  return modules.find((module) => module.weekNumber === weekNumber) || null;
}

function getCachedQuiz(roadmapId, weekNumber) {
  return parseStoredJSON(localStorage, getQuizCacheKey(roadmapId, weekNumber), null);
}

function saveQuiz(roadmapId, weekNumber, quiz) {
  localStorage.setItem(getQuizCacheKey(roadmapId, weekNumber), JSON.stringify(quiz));
}

function getQuizCacheKey(roadmapId, weekNumber) {
  return `skillforge_module_quiz_${QUIZ_CACHE_VERSION}_${roadmapId}_${weekNumber}`;
}

function persistRoadmap(roadmap) {
  localStorage.setItem('skillforge_current_roadmap', JSON.stringify(roadmap));
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
