// =================================
// ROADMAP AND QUIZ GENERATION
// Gemini -> Hardcoded fallback
// Both paths return stable object shapes.
// =================================

const GEMINI_API_KEY = 'AIzaSyD9fVF7-hxPmrzQP_FYmM6r_oU8-rXebKA';
const ROADMAP_WEEKS = 12;
const QUIZ_QUESTION_COUNT = 5;
const DEFAULT_RESOURCE_TYPES = ['youtube', 'article', 'book', 'course', 'project'];

async function generateRoadmap(onboardingData) {
  const input = normalizeOnboardingData(onboardingData);
  const resourceSummary = input.preferredResourceLabels.length
    ? input.preferredResourceLabels.join(', ')
    : 'Any helpful resource type';

  try {
    console.log(
      `[Roadmap] Trying Gemini for "${input.skill}" | goal="${input.goal}" | level=${input.levelLabel} | dailyTime=${input.dailyTimeLabel} | resources=${resourceSummary}`
    );

    const roadmap = await callGeminiRoadmapAPI(input);

    console.log(
      `[Roadmap] Gemini success for "${input.skill}". Received ${roadmap.modules.length} weekly modules.`
    );

    return {
      ...roadmap,
      source: 'gemini',
      generatedAt: new Date().toISOString()
    };
  } catch (geminiError) {
    console.warn('[Roadmap] Gemini failed:', geminiError.message);
    return {
      ...getFallbackRoadmap(input),
      source: 'fallback',
      generatedAt: new Date().toISOString()
    };
  }
}

async function generateModuleQuiz(onboardingData, module) {
  const input = normalizeOnboardingData(onboardingData);
  const normalizedModule = normalizeQuizModule(module);

  try {
    console.log(
      `[Quiz] Trying Gemini for "${input.skill}" week ${normalizedModule.weekNumber} (${normalizedModule.title}).`
    );

    const quiz = await callGeminiQuizAPI(input, normalizedModule);

    console.log(
      `[Quiz] Gemini success for week ${normalizedModule.weekNumber}. Received ${quiz.questions.length} questions.`
    );

    return {
      ...quiz,
      source: 'gemini',
      generatedAt: new Date().toISOString()
    };
  } catch (geminiError) {
    console.warn('[Quiz] Gemini failed:', geminiError.message);
    return {
      ...getFallbackQuiz(normalizedModule),
      source: 'fallback',
      generatedAt: new Date().toISOString()
    };
  }
}

function normalizeOnboardingData(onboardingData = {}) {
  const skill = String(onboardingData.skill || 'New Skill').trim();
  const goal = String(onboardingData.goal || 'build practical fluency').trim();
  const level = String(onboardingData.level || 'beginner').trim();
  const dailyTime = String(onboardingData.dailyTime || '30min').trim();
  const resources = Array.isArray(onboardingData.resources) ? onboardingData.resources : [];

  return {
    skill,
    goal,
    level,
    levelLabel: formatLevel(level),
    dailyTime,
    dailyTimeLabel: formatDailyTime(dailyTime),
    resources,
    preferredResourceTypes: normalizeResourcePreferences(resources),
    preferredResourceLabels: resources.map((resource) => formatResourcePreference(resource)).filter(Boolean)
  };
}

function buildRoadmapPrompt(input) {
  const allowedResources = input.preferredResourceTypes.length
    ? input.preferredResourceTypes.join(', ')
    : DEFAULT_RESOURCE_TYPES.join(', ');

  const preferredLabels = input.preferredResourceLabels.length
    ? input.preferredResourceLabels.join(', ')
    : 'any helpful resource type';

  const weeklyTaskCount = getWeeklyTaskCount(input.dailyTime);
  const dayInstructionExample = buildInstructionExample(weeklyTaskCount);

  return `You are creating a crisp 12-week learning roadmap for one user.

User details:
- Skill: ${input.skill}
- Goal: ${input.goal}
- Current level: ${input.levelLabel}
- Daily time: ${input.dailyTimeLabel}
- Preferred resource styles: ${preferredLabels}

Return ONLY one valid JSON object. No markdown. No explanation.

Use this exact shape:
{
  "skillTitle": "Short title",
  "summary": "2-3 sentences describing how the user should approach the next 12 weeks.",
  "whyItMatters": "1-2 sentences on why this skill matters for this user's goal.",
  "milestone": "One sentence describing what the user should be able to do by week 12.",
  "modules": [
    {
      "weekNumber": 1,
      "title": "Short weekly title",
      "summary": "1-2 sentences for the week's theme.",
      "goal": "One clear weekly goal.",
      "instructions": ${dayInstructionExample},
      "deliverable": "One concrete output for the week.",
      "quizFocus": "What the quiz should validate.",
      "resources": [
        { "type": "youtube", "title": "Specific resource title", "reason": "Why it fits this week" }
      ]
    }
  ]
}

Rules:
- Return exactly 12 modules numbered 1 through 12
- Keep each weekly title under 7 words
- Make the roadmap feel sequential and realistic
- Return exactly ${weeklyTaskCount} instructions per week
- Each instruction must represent one meaningful study day, so the checklist covers ${weeklyTaskCount} focused days of the week
- Each instruction should be substantial enough to take most of one study day at ${input.dailyTimeLabel}
- For shorter daily time, make each day focused and realistic; for longer daily time, make each day more ambitious without becoming bloated
- The first week must feel like a full week of progress, not a one-day starter pack
- Avoid tiny standalone tasks like "set up environment" or "take notes" unless they are paired with real practice
- Keep each instruction concise enough to display as a checklist item
- Return 1-2 resources per week
- Resource type must be one of: ${allowedResources}
- Tailor everything to the user's goal, current level, daily time, and resource preferences
- Keep the roadmap practical and achievable, not motivational fluff`;
}

function buildQuizPrompt(input, module) {
  const instructionText = getInstructionTexts(module.instructions)
    .map((instruction) => `- ${instruction}`)
    .join('\n');

  return `You are creating a short weekly validation quiz for one user.

User details:
- Skill: ${input.skill}
- Goal: ${input.goal}
- Current level: ${input.levelLabel}

Week details:
- Week number: ${module.weekNumber}
- Title: ${module.title}
- Weekly summary: ${module.summary}
- Weekly goal: ${module.goal}
- Checklist:
${instructionText}
- Deliverable: ${module.deliverable}
- Quiz focus: ${module.quizFocus}

Return ONLY one valid JSON object. No markdown. No explanation.

Use this exact shape:
{
  "title": "Week 1 Validation",
  "description": "1-2 sentences describing what this quiz checks.",
  "passingScore": 70,
  "questions": [
    {
      "prompt": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Short explanation of the right answer"
    }
  ]
}

Rules:
- Return exactly 5 questions
- Each question must have exactly 4 options
- correctAnswerIndex must be an integer from 0 to 3
- Questions should validate the concepts and actions from this week only
- Make the quiz practical and clear, not tricky
- Keep explanations concise but useful
- Keep the passingScore at 70`;
}

async function callGeminiRoadmapAPI(input) {
  const prompt = buildRoadmapPrompt(input);
  const responseJsonSchema = buildRoadmapResponseSchema(
    input.preferredResourceTypes,
    getWeeklyTaskCount(input.dailyTime)
  );

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 5200,
          responseMimeType: 'application/json',
          responseJsonSchema
        }
      })
    }
  );

  if (!response.ok) {
    const err = await safeReadJSON(response);
    throw new Error(`Gemini HTTP ${response.status}: ${err?.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
  }

  return normalizeRoadmap(parseJSONObjectFromText(rawText), input);
}

async function callGeminiQuizAPI(input, module) {
  const prompt = buildQuizPrompt(input, module);
  const responseJsonSchema = buildQuizResponseSchema();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2400,
          responseMimeType: 'application/json',
          responseJsonSchema
        }
      })
    }
  );

  if (!response.ok) {
    const err = await safeReadJSON(response);
    throw new Error(`Gemini HTTP ${response.status}: ${err?.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
  }

  return normalizeQuiz(parseJSONObjectFromText(rawText), module);
}

async function safeReadJSON(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function parseJSONObjectFromText(text) {
  let clean = String(text || '').replace(/```json|```/g, '').trim();

  const startIdx = clean.indexOf('{');
  const endIdx = clean.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No JSON object found in response');
  }

  clean = clean.slice(startIdx, endIdx + 1);

  try {
    return JSON.parse(clean);
  } catch (error) {
    try {
      return JSON.parse(repairJSONString(clean));
    } catch (repairError) {
      throw new Error(`JSON parse failed: ${error.message}${formatJSONErrorContext(clean, error.message)}`);
    }
  }
}

function normalizeRoadmap(rawRoadmap, input) {
  const fallback = getFallbackRoadmap(input);
  const allowedTypes = input.preferredResourceTypes.length
    ? input.preferredResourceTypes
    : DEFAULT_RESOURCE_TYPES;
  const weeklyTaskCount = getWeeklyTaskCount(input.dailyTime);

  return {
    skillTitle: sanitizeText(rawRoadmap.skillTitle) || fallback.skillTitle,
    summary: sanitizeText(rawRoadmap.summary) || fallback.summary,
    whyItMatters: sanitizeText(rawRoadmap.whyItMatters) || fallback.whyItMatters,
    milestone: sanitizeText(rawRoadmap.milestone) || fallback.milestone,
    modules: normalizeRoadmapModules(rawRoadmap.modules, fallback.modules, allowedTypes, weeklyTaskCount)
  };
}

function normalizeRoadmapModules(rawModules, fallbackModules, allowedTypes, weeklyTaskCount) {
  const moduleList = Array.isArray(rawModules) ? rawModules : [];

  return fallbackModules.map((fallbackModule, index) => {
    const weekNumber = index + 1;
    const rawByWeekNumber = moduleList.find((module) => Number(module?.weekNumber) === weekNumber);
    const rawModule = rawByWeekNumber || moduleList[index] || null;
    return normalizeRoadmapModule(rawModule, fallbackModule, allowedTypes, weekNumber, weeklyTaskCount);
  });
}

function normalizeRoadmapModule(rawModule, fallbackModule, allowedTypes, weekNumber, weeklyTaskCount) {
  const resources = Array.isArray(rawModule?.resources)
    ? rawModule.resources
        .map((resource) => normalizeResource(resource, allowedTypes))
        .filter(Boolean)
        .slice(0, 2)
    : [];

  return {
    weekNumber,
    title: sanitizeText(rawModule?.title) || fallbackModule.title,
    summary: sanitizeText(rawModule?.summary) || fallbackModule.summary,
    goal: sanitizeText(rawModule?.goal) || fallbackModule.goal,
    instructions: normalizeStringArray(
      rawModule?.instructions,
      fallbackModule.instructions,
      weeklyTaskCount,
      weeklyTaskCount
    ),
    deliverable: sanitizeText(rawModule?.deliverable) || fallbackModule.deliverable,
    quizFocus: sanitizeText(rawModule?.quizFocus) || fallbackModule.quizFocus,
    resources: resources.length ? resources : fallbackModule.resources
  };
}

function normalizeQuiz(rawQuiz, module) {
  const fallback = getFallbackQuiz(module);
  const rawQuestions = Array.isArray(rawQuiz.questions) ? rawQuiz.questions : [];

  const questions = fallback.questions.map((fallbackQuestion, index) =>
    normalizeQuizQuestion(rawQuestions[index], fallbackQuestion, index)
  );

  return {
    weekNumber: module.weekNumber,
    title: sanitizeText(rawQuiz.title) || fallback.title,
    description: sanitizeText(rawQuiz.description) || fallback.description,
    passingScore: normalizePassingScore(rawQuiz.passingScore, fallback.passingScore),
    questions
  };
}

function normalizeQuizQuestion(rawQuestion, fallbackQuestion, index) {
  const prompt = sanitizeText(rawQuestion?.prompt) || fallbackQuestion.prompt;
  const options = normalizeStringArray(rawQuestion?.options, fallbackQuestion.options, 4, 4);
  const explanation = sanitizeText(rawQuestion?.explanation) || fallbackQuestion.explanation;

  let correctAnswerIndex = Number(rawQuestion?.correctAnswerIndex);
  if (!Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex > 3) {
    correctAnswerIndex = fallbackQuestion.correctAnswerIndex;
  }

  return {
    id: fallbackQuestion.id || `q${index + 1}`,
    prompt,
    options,
    correctAnswerIndex,
    explanation
  };
}

function normalizeQuizModule(module = {}) {
  return {
    weekNumber: Number(module.weekNumber) || 1,
    title: sanitizeText(module.title) || 'Weekly validation',
    summary: sanitizeText(module.summary) || 'Review the key concepts for this week.',
    goal: sanitizeText(module.goal) || 'Demonstrate practical understanding of the weekly module.',
    instructions: getInstructionTexts(module.instructions),
    deliverable: sanitizeText(module.deliverable) || 'A small proof of weekly progress.',
    quizFocus: sanitizeText(module.quizFocus) || 'Core concepts and task understanding.'
  };
}

function normalizeResource(resource, allowedTypes) {
  if (!resource || typeof resource !== 'object') return null;

  const type = normalizeResourceType(resource.type);
  if (!type || !allowedTypes.includes(type)) return null;

  const title = sanitizeText(resource.title);
  const reason = sanitizeText(resource.reason);

  if (!title || !reason) return null;

  return { type, title, reason };
}

function normalizeStringArray(value, fallback, minItems = 1, maxItems = 3) {
  const cleaned = Array.isArray(value)
    ? value.map((item) => sanitizeText(item)).filter(Boolean).slice(0, maxItems)
    : [];

  if (cleaned.length >= minItems) {
    return cleaned;
  }

  return Array.isArray(fallback) ? fallback.slice(0, maxItems) : [];
}

function normalizePassingScore(value, fallback) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 50 || score > 100) {
    return fallback;
  }

  return Math.round(score);
}

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function repairJSONString(json) {
  return json
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/;\s*([}\]])/g, '$1')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function formatJSONErrorContext(json, errorMessage) {
  const match = errorMessage.match(/position (\d+)/i);
  if (!match) return '';

  const position = Number(match[1]);
  const start = Math.max(0, position - 80);
  const end = Math.min(json.length, position + 80);
  const snippet = json.slice(start, end).replace(/\s+/g, ' ');

  return ` | Near: ${snippet}`;
}

function buildRoadmapResponseSchema(preferredResourceTypes, weeklyTaskCount) {
  const allowedResourceTypes = preferredResourceTypes.length
    ? preferredResourceTypes
    : DEFAULT_RESOURCE_TYPES;

  return {
    type: 'object',
    properties: {
      skillTitle: { type: 'string' },
      summary: { type: 'string' },
      whyItMatters: { type: 'string' },
      milestone: { type: 'string' },
      modules: {
        type: 'array',
        minItems: ROADMAP_WEEKS,
        maxItems: ROADMAP_WEEKS,
        items: {
          type: 'object',
          properties: {
            weekNumber: { type: 'integer' },
            title: { type: 'string' },
            summary: { type: 'string' },
            goal: { type: 'string' },
            instructions: {
              type: 'array',
              items: { type: 'string' },
              minItems: weeklyTaskCount,
              maxItems: weeklyTaskCount
            },
            deliverable: { type: 'string' },
            quizFocus: { type: 'string' },
            resources: {
              type: 'array',
              minItems: 1,
              maxItems: 2,
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: allowedResourceTypes },
                  title: { type: 'string' },
                  reason: { type: 'string' }
                },
                required: ['type', 'title', 'reason']
              }
            }
          },
          required: ['weekNumber', 'title', 'summary', 'goal', 'instructions', 'deliverable', 'quizFocus', 'resources']
        }
      }
    },
    required: ['skillTitle', 'summary', 'whyItMatters', 'milestone', 'modules']
  };
}

function buildQuizResponseSchema() {
  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      passingScore: { type: 'integer' },
      questions: {
        type: 'array',
        minItems: QUIZ_QUESTION_COUNT,
        maxItems: QUIZ_QUESTION_COUNT,
        items: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            options: {
              type: 'array',
              items: { type: 'string' },
              minItems: 4,
              maxItems: 4
            },
            correctAnswerIndex: {
              type: 'integer',
              minimum: 0,
              maximum: 3
            },
            explanation: { type: 'string' }
          },
          required: ['prompt', 'options', 'correctAnswerIndex', 'explanation']
        }
      }
    },
    required: ['title', 'description', 'passingScore', 'questions']
  };
}

function getFallbackRoadmap(input) {
  const weeklyTaskCount = getWeeklyTaskCount(input.dailyTime);
  const stages = [
    {
      title: 'Foundations and Setup',
      summary: `Start with the tools, vocabulary, and habits that make ${input.skill} easier to practice consistently.`,
      goal: `Set up your ${input.skill} environment and understand the core beginner ideas.`,
      instructions: [
        `Set up the tools you need to practice ${input.skill} every day.`,
        `Learn the first essential concepts at a ${input.levelLabel.toLowerCase()} pace.`,
        `Write a short note after each session to reinforce what you learned.`
      ],
      deliverable: `A working setup plus a short note explaining the basics of ${input.skill}.`,
      quizFocus: `Setup steps, core terms, and the first concepts needed before building anything.`
    },
    {
      title: 'Core Workflow Practice',
      summary: `Move from theory into repetition so the main ${input.skill} workflow starts feeling familiar.`,
      goal: `Repeat the basic workflow until it feels natural and less intimidating.`,
      instructions: [
        `Practice the core ${input.skill} workflow in small repeatable exercises.`,
        `Review mistakes from the first week before adding new complexity.`,
        `Keep one simple example that you can rebuild without looking up every step.`
      ],
      deliverable: `A tiny repeatable practice example you can explain from start to finish.`,
      quizFocus: `Basic workflow decisions and the purpose of the core steps you practiced.`
    },
    {
      title: 'Guided Skill Building',
      summary: `Use guided practice to connect the basics to real tasks related to ${input.goal}.`,
      goal: `Apply the fundamentals to a small guided task that matches your goal.`,
      instructions: [
        `Follow one structured exercise that resembles a real ${input.goal} task.`,
        `Break the exercise into smaller parts and understand each part clearly.`,
        `Record which topics still slow you down so you can revisit them later.`
      ],
      deliverable: `A guided example tied to ${input.goal} with notes on what felt clear and unclear.`,
      quizFocus: `How the weekly concepts show up in a guided real-world example.`
    },
    {
      title: 'Mini Build One',
      summary: `Shift into doing by creating a tight first build instead of staying in study mode.`,
      goal: `Finish a very small build that proves you can use the week's skills in context.`,
      instructions: [
        `Choose a tiny build that uses the basics of ${input.skill} in one flow.`,
        `Keep the scope small enough to finish during your available study time.`,
        `Fix at least one mistake yourself before searching for the full answer.`
      ],
      deliverable: `A tiny working build that demonstrates the main beginner workflow.`,
      quizFocus: `Why each part of the mini build matters and how the pieces fit together.`
    },
    {
      title: 'Stronger Concepts',
      summary: `Deepen your understanding so you are not just copying steps but making decisions with intent.`,
      goal: `Understand the next layer of concepts that improve your control over the workflow.`,
      instructions: [
        `Study one deeper concept that directly improves your ${input.goal} progress.`,
        `Compare a weak approach with a better approach and explain the difference.`,
        `Refactor one earlier example using what you learned this week.`
      ],
      deliverable: `An improved version of an earlier exercise with clearer reasoning behind your choices.`,
      quizFocus: `The deeper concept you studied and when to apply it.`
    },
    {
      title: 'Debug and Review',
      summary: `Learning speeds up when you can diagnose problems instead of freezing at the first bug or mistake.`,
      goal: `Build confidence in reviewing errors, gaps, and weak points in your current understanding.`,
      instructions: [
        `Revisit one confusing concept and explain it in simpler words.`,
        `Debug one broken example and document the fix step by step.`,
        `Turn your repeat mistakes into a short review checklist.`
      ],
      deliverable: `A troubleshooting note that shows how you solved a real issue this week.`,
      quizFocus: `Common mistakes, debugging logic, and how to recover when something goes wrong.`
    },
    {
      title: 'Real World Patterns',
      summary: `Bridge the gap between isolated exercises and the patterns people actually use in real work.`,
      goal: `Recognize and practice a few patterns that appear in real ${input.skill} tasks.`,
      instructions: [
        `Study one pattern that shows up often in practical ${input.skill} work.`,
        `Apply that pattern to a slightly larger example than previous weeks.`,
        `Explain why this pattern matters for your ${input.goal}.`
      ],
      deliverable: `A practical example that uses one real-world pattern correctly.`,
      quizFocus: `When to use the weekly pattern and why it improves the solution.`
    },
    {
      title: 'Project Sprint One',
      summary: `Now the roadmap starts consolidating into a goal-aligned project instead of disconnected exercises.`,
      goal: `Start a mini project that clearly supports your long-term goal.`,
      instructions: [
        `Define a narrow project scope connected to ${input.goal}.`,
        `Set up the first version of the project and finish the core skeleton.`,
        `Track one open question that you will answer during the next sprint.`
      ],
      deliverable: `The first working version of a mini project related to ${input.goal}.`,
      quizFocus: `Project planning choices, scope control, and the first implementation decisions.`
    },
    {
      title: 'Project Sprint Two',
      summary: `Build on last week so the project becomes something you can show, test, and explain.`,
      goal: `Expand the project with one meaningful feature or improvement.`,
      instructions: [
        `Add one feature that makes the project more useful or realistic.`,
        `Test the feature using a few clear examples or scenarios.`,
        `Document what changed and why it improved the project.`
      ],
      deliverable: `A stronger second version of the project with a visible improvement.`,
      quizFocus: `Feature decisions, tradeoffs, and how the project evolved this week.`
    },
    {
      title: 'Polish and Explain',
      summary: `A useful skill is not only about building but also about making your work understandable and dependable.`,
      goal: `Polish the project and make your workflow easier to explain to someone else.`,
      instructions: [
        `Clean up one messy part of the project or workflow.`,
        `Write a short explanation of how your project works from start to finish.`,
        `Improve the weakest part of your project based on your own review.`
      ],
      deliverable: `A polished project update plus a short explanation of your workflow.`,
      quizFocus: `Quality improvements, explanation skills, and identifying the weakest link.`
    },
    {
      title: 'Mock Challenge Week',
      summary: `Before the final week, test yourself with a challenge that feels closer to real independent work.`,
      goal: `Solve a realistic challenge with less guidance and more self-direction.`,
      instructions: [
        `Attempt one realistic task without following a step-by-step guide.`,
        `Use your notes and past work before searching for outside help.`,
        `Reflect on which parts now feel easy and which still feel slow.`
      ],
      deliverable: `A completed mock challenge and a short reflection on performance.`,
      quizFocus: `Independent decision making and applying multiple weeks together.`
    },
    {
      title: 'Capstone and Next Steps',
      summary: `Close the roadmap by consolidating what you learned and preparing the next level of practice.`,
      goal: `Finish a presentable version of your work and define what to improve next.`,
      instructions: [
        `Finalize your best project or artifact from this roadmap.`,
        `Review the biggest progress you made across all 12 weeks.`,
        `Choose the next 2 or 3 topics that would deepen your ${input.skill} ability.`
      ],
      deliverable: `A presentable capstone artifact plus a short next-step plan.`,
      quizFocus: `How the full roadmap fits together and what you can now do independently.`
    }
  ];

  return {
    skillTitle: `${input.skill} roadmap`,
    summary: `To reach your goal of ${input.goal}, use your ${input.dailyTimeLabel.toLowerCase()} sessions for short study blocks, repeated practice, and one visible build every few weeks. This roadmap starts with fundamentals, then shifts into guided application, project work, and independent problem solving so the skill feels usable instead of theoretical.`,
    whyItMatters: `${input.skill} becomes valuable when you can use it to make decisions, finish small outputs, and explain your reasoning. A weekly structure helps you build that consistency without drifting through random tutorials.`,
    milestone: `By week ${ROADMAP_WEEKS}, you should be able to use ${input.skill} for ${input.goal} through a repeatable workflow and a small proof-of-skill project.`,
    modules: stages.map((stage, index) => ({
      weekNumber: index + 1,
      title: stage.title,
      summary: stage.summary,
      goal: stage.goal,
      instructions: expandWeeklyInstructions(stage.instructions, input, stage.title, weeklyTaskCount),
      deliverable: stage.deliverable,
      quizFocus: stage.quizFocus,
      resources: buildFallbackWeekResources(input.preferredResourceTypes, input.skill, stage.title, index + 1)
    }))
  };
}

function getFallbackQuiz(module) {
  const instructions = getInstructionTexts(module.instructions);
  const firstInstruction = instructions[0] || `Practice the core ideas from ${module.title}.`;
  const secondInstruction = instructions[1] || `Review the main workflow for ${module.title}.`;

  return {
    weekNumber: module.weekNumber,
    title: `Week ${module.weekNumber} Validation`,
    description: `This quiz checks whether you understand the key ideas, actions, and deliverable from ${module.title}.`,
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        prompt: `Which checklist item belongs to Week ${module.weekNumber}?`,
        options: [
          firstInstruction,
          'Skip practice and move straight to advanced topics.',
          'Ignore the weekly goal and study unrelated material.',
          'Avoid reviewing mistakes until the final week.'
        ],
        correctAnswerIndex: 0,
        explanation: `The roadmap explicitly includes this checklist item for ${module.title}.`
      },
      {
        id: 'q2',
        prompt: `What is the main goal of Week ${module.weekNumber}?`,
        options: [
          module.goal,
          'Master every advanced concept in a single session.',
          'Replace the roadmap with random tutorials.',
          'Focus only on theory and avoid practical work.'
        ],
        correctAnswerIndex: 0,
        explanation: `The weekly goal describes the main outcome this module is trying to achieve.`
      },
      {
        id: 'q3',
        prompt: `Which statement best matches this week's deliverable?`,
        options: [
          'The week has no clear output or proof of progress.',
          module.deliverable,
          'The only goal is to watch as many videos as possible.',
          'The week ends without applying anything practical.'
        ],
        correctAnswerIndex: 1,
        explanation: `The deliverable is the concrete output you should finish by the end of the week.`
      },
      {
        id: 'q4',
        prompt: `Which topic should the Week ${module.weekNumber} quiz validate most directly?`,
        options: [
          'Completely unrelated topics from future weeks.',
          'Trivia that does not affect practical progress.',
          module.quizFocus,
          'Only memorizing resource titles.'
        ],
        correctAnswerIndex: 2,
        explanation: `The quiz should stay focused on the weekly concepts and actions named in the module.`
      },
      {
        id: 'q5',
        prompt: `Which action best supports strong progress in ${module.title}?`,
        options: [
          'Rush through the module without checking understanding.',
          secondInstruction,
          'Skip deliverables and rely on motivation alone.',
          'Study many unrelated tools at the same time.'
        ],
        correctAnswerIndex: 1,
        explanation: `The roadmap moves forward through practical repetition and completion of the weekly checklist.`
      }
    ]
  };
}

function buildFallbackWeekResources(preferredTypes, skill, stageTitle, weekNumber) {
  const rotation = preferredTypes.length ? preferredTypes : ['youtube', 'article', 'course'];
  const selectedType = rotation[(weekNumber - 1) % rotation.length];

  const templates = {
    youtube: {
      title: `${skill} week ${weekNumber} walkthrough`,
      reason: `Useful when you want to watch the ${stageTitle.toLowerCase()} workflow step by step.`
    },
    article: {
      title: `${skill} week ${weekNumber} guide`,
      reason: `Good for a focused read on the key ideas behind ${stageTitle.toLowerCase()}.`
    },
    book: {
      title: `${skill} fundamentals chapter`,
      reason: `Helpful when you want a slower explanation and a reference you can revisit.`
    },
    course: {
      title: `${skill} structured lesson`,
      reason: `Helpful for learning ${stageTitle.toLowerCase()} in a clear sequence.`
    },
    project: {
      title: `${skill} week ${weekNumber} mini build`,
      reason: `Best for learning by doing and turning this week's ideas into visible output.`
    }
  };

  const fallbackResource = templates[selectedType] || templates.course;

  return [
    {
      type: selectedType in templates ? selectedType : 'course',
      title: fallbackResource.title,
      reason: fallbackResource.reason
    }
  ];
}

function getWeeklyTaskCount(dailyTime) {
  return dailyTime === '30min' ? 4 : 5;
}

function buildInstructionExample(taskCount) {
  return JSON.stringify(
    Array.from({ length: taskCount }, (_, index) => `day ${index + 1} task`)
  );
}

function expandWeeklyInstructions(baseInstructions, input, stageTitle, weeklyTaskCount) {
  const stageLabel = String(stageTitle || input.skill || 'this module').toLowerCase();
  const instructions = Array.isArray(baseInstructions)
    ? baseInstructions.map((instruction) => sanitizeText(instruction)).filter(Boolean)
    : [];

  const extraInstructions = [
    `Use one full study session to apply ${stageLabel} ideas in a fresh practice example of your own.`,
    `Use one full study session to review mistakes, improve weak spots, and tighten this week's work.`,
    `Spend one study session explaining what you learned and connecting it back to ${input.goal}.`
  ];

  while (instructions.length < weeklyTaskCount) {
    instructions.push(extraInstructions[instructions.length - Math.min(3, instructions.length)] || extraInstructions[0]);
  }

  return instructions.slice(0, weeklyTaskCount);
}

function getInstructionTexts(instructions = []) {
  return instructions
    .map((instruction) => {
      if (typeof instruction === 'string') return sanitizeText(instruction);
      if (instruction && typeof instruction === 'object') return sanitizeText(instruction.text);
      return '';
    })
    .filter(Boolean);
}

function normalizeResourcePreferences(resources = []) {
  return resources
    .map((resource) => normalizeResourceType(resource))
    .filter(Boolean)
    .filter((resource, index, list) => list.indexOf(resource) === index);
}

function normalizeResourceType(type) {
  const mapping = {
    youtube: 'youtube',
    article: 'article',
    articles: 'article',
    book: 'book',
    books: 'book',
    course: 'course',
    courses: 'course',
    project: 'project',
    projects: 'project'
  };

  return mapping[String(type || '').toLowerCase()] || null;
}

function formatResourcePreference(resource) {
  const labels = {
    youtube: 'YouTube videos',
    projects: 'Hands-on projects',
    books: 'Books and PDFs',
    courses: 'Courses',
    articles: 'Articles'
  };

  return labels[resource] || '';
}

function formatLevel(level) {
  const labels = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  };

  return labels[level] || 'Beginner';
}

function formatDailyTime(dailyTime) {
  const labels = {
    '30min': '30 minutes',
    '1hr': '1 hour',
    '1.5hr': '1.5 hours',
    '2hr+': '2+ hours'
  };

  return labels[dailyTime] || '30 minutes';
}

window.generateRoadmap = generateRoadmap;
window.generateSkillInsight = generateRoadmap;
window.generateModuleQuiz = generateModuleQuiz;
