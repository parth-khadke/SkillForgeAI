### SkillForge AI - BCA Final Semester Project

## Project Summary
An AI-powered learning roadmap generator with progressive validation system. Users create personalized learning paths, unlock modules by passing validation tests, and track their skill acquisition journey.

## Project Status
- Phase: Development (Week 1 of 4)
- Completion: ~25%
- Demo Date: 26 March 2026
- Current Focus: Building a complete MVP for college demo and real world use to check PMF for future financial escalation.

## Tech Stack

# Frontend
- HTML5 (semantic structure)
- CSS3 (custom styling + Tailwind CDN)
- Vanilla JavaScript (ES6+)
- No frameworks/libraries (project requirement)

# Backend (Phase 2 - Not Yet Implemented)
- Node.js v18+
- Express.js
- SQLite (development) → PostgreSQL (production)
- JWT authentication

# AI Integration
- Primary: Google Gemini API 
- Backup: Groq API (Llama 3.1)
- Fallback: Hardcoded realistic fake data

# Storage
- Current: localStorage (demo/prototype)
- Future: Backend database + JWT sessions. 

# Deployment
- Frontend: GitHub Pages
- Live URL: 
- Local Dev: Live Server (http://127.0.0.1:5500)
- Mobile Testing: ngrok tunnel

## File Structure
```
frontend/
├── index.html              # Landing page (COMPLETE ✅)
├── auth.html               # Login/Signup (COMPLETE ✅)
├── onboarding.html         # Skill selection (COMPLETE ✅)
├── dashboard.html          # Roadmap display (PLANNED ⏳)
├── module.html             # Individual week view (PLANNED ⏳)
├── quiz.html               # Validation tests (PLANNED ⏳)
├── css/
│   ├── index.css           # Main styles + landing page
│   ├── animation.css       # Keyframe animations
│   ├── auth.css            # Authentication page styles
│   └── onboarding.css      # Onboarding styles
└── js/
    ├── app.js              # Landing page interactions
    ├── auth.js             # Authentication logic + localStorage
    └── onboarding.js       # Onboarding flow 

backend/ (Future)
├── server.js
├── routes/
├── middleware/
└── config/
```

## Features Roadmap

# Phase 1: Core MVP (Week 1) 🚧
- [x] Landing page with project info
- [x] User authentication (localStorage)
- [x] Password validation (8+ chars, 1 number, 1 special char)
- [x] Login/signup with proper error handling
- [x] Multi-step onboarding flow (6 steps)
- [ ] AI roadmap generation (Gemini/Groq)
- [ ] Dashboard with module cards
- [ ] Progressive module unlocking system
- [ ] One skill roadmap should be completely available for users

# Phase 2: Validation System (Weeks 1-2) ⏳
- [ ] AI quiz generation per module
- [ ] Quiz UI with multiple choice questions
- [ ] Scoring and pass/fail logic (70% threshold)
- [ ] Retry mechanism with easier questions
- [ ] Detailed feedback on wrong answers

# Phase 3: Progress Tracking (Week 2) ⏳
- [ ] Progress visualization (charts)
- [ ] Streak tracking
- [ ] Module completion history
- [ ] Time spent analytics

# Phase 4: Backend Migration (Weeks 3) ⏳
- [ ] Backend API setup
- [ ] Database schema implementation
- [ ] JWT authentication
- [ ] Migrate localStorage to database

# Phase 5: Polish & Deploy (End of week 3. Ready for demo) ⏳
- [ ] Bug fixes
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Documentation

## Key Design Decisions

# Authentication
- Choice: localStorage for MVP
- Rationale: Fast prototyping, no backend setup needed
- Trade-off: Not production-ready, no cross-device sync
- Future: Upgrade to backend + JWT

# Password Security
- Requirements: 8+ chars, 1 number, 1 special character
- Storage: Plaintext in localStorage (DEMO ONLY)
- Future: bcrypt hashing with backend

# User Flow
- New users: Signup → Onboarding → Dashboard
- Returning users: Login → Dashboard (if completed onboarding)
- Validation: 70% pass rate, retry with easier questions on fail

# Roadmap Structure
- Duration: 12 weeks per skill
- Granularity: Weekly modules
- Unlocking: Sequential (must complete week N to unlock week N+1)
- Validation: Quiz/coding challenge per module

# AI Integration Strategy
- Phase 1: Hardcoded fake roadmaps (unblocked development)
- Phase 2: Real API integration when available
- Architecture: Swappable API layer (easy migration)

# Data Models

# User (localStorage)
```javascript
{
  id: "user_1234567890_abc123",
  name: "John Doe",
  email: "john@test.com",
  password: "plaintext", // Will be hashed with backend
  createdAt: "2025-03-02T...",
  hasCompletedOnboarding: false
}
```

# Roadmap (localStorage)
```javascript
{
  id: "roadmap_xyz",
  userId: "user_123",
  skill: "Python Programming",
  goal: "Get a job as backend developer",
  dailyTime: "1-2 hours",
  level: "Beginner",
  style: "Mixed (videos + hands-on)",
  totalWeeks: 12,
  createdAt: "2025-03-02T...",
  modules: [...]
}
```

# Module
```javascript
{
  weekNumber: 1,
  title: "Python Basics",
  isUnlocked: true,
  isCompleted: false,
  learningObjectives: ["Understand variables", "Write loops"],
  topics: ["Variables", "Data types", "Control flow"],
  resources: [
    {type: "video", title: "...", link: "..."},
    {type: "article", title: "...", link: "..."}
  ],
  validationType: "quiz",
  testScore: null,
  attempts: 0
}
```

# Development Guidelines

# Code Style
- Variables: camelCase, descriptive names
- Functions: Small, single-purpose, well-named
- Comments: Explain WHY, with WHAT. Very brief
- localStorage keys: Prefix with `skillforge_`
- CSS classes: BEM-like naming (block__element--modifier)

# File Organization
- One feature per file when possible
- Group related functions together
- Extract reusable utilities

# Testing Checklist
- [ ] Works in Chrome/Edge
- [ ] Works in Firefox
- [ ] Mobile responsive (375px, 768px, 1024px)
- [ ] Works on actual phone (ngrok)
- [ ] No console errors
- [ ] localStorage operations succeed
- [ ] Forms validate properly
- [ ] Error messages clear and helpful

# Known Issues & Technical Debt
# Current Issues
- ❌ Gemini API blocked (suspicious activity)
- ⚠️ Tailwind CDN warning (acceptable for demo)
- ⚠️ Passwords stored in plaintext (will fix with backend)

# Technical Debt
- High Priority (Before Demo)
  - [ ] Add proper error logging
  - [ ] Implement loading states for all async operations
  - [ ] Add input sanitization

- Medium Priority (Before Submission)
  - [ ] Replace Tailwind CDN with installed version
  - [ ] Hash passwords (backend implementation)
  - [ ] Add session expiration

- Low Priority (Nice to Have)
  - [ ] Dark mode toggle
  - [ ] Keyboard shortcuts
  - [ ] Offline support

# API Integration Notes

# Gemini API
- Status: Blocked (suspicious activity error)
- Retry: Wait 24-48 hours
- Key Location: Will be in `.env` file (not committed)

# Groq API (Backup)
- Model: llama-3.1-70b-versatile
- Endpoint: https://api.groq.com/openai/v1/chat/completions
- Status: Ready to use if Gemini fails
- Key: To be obtained from console.groq.com

# Fallback Strategy
- Hardcoded realistic roadmap data
- Allows development to continue
- Easy to swap for real API later

# Success Criteria

# Minimum Viable Product (Demo Day)
- ✅ Working authentication
- ✅ Onboarding flow collects all inputs
- ✅ Roadmap generation (AI or fake data)
- ✅ Dashboard shows modules
- ✅ Progressive unlocking works
- ✅ At least one quiz works
- ✅ Mobile responsive
- ✅ Deployed and accessible for now with free hosting with backend compatibility

# Ideal Complete Product !!! The real goal !!!
- All of MVP +
- Real AI integration
- Backend with database
- Full validation system
- Progress analytics
- Polished UI/UX

# Resources & References

# Documentation
- localStorage API: MDN Web Docs
- Gemini API: ai.google.dev/gemini-api/docs
- Groq API: console.groq.com/docs

# Inspiration
- Roadmap.sh (visual roadmaps)
- Duolingo (gamified learning, progressive unlocking)
- Khan Academy (skill mastery approach)
- freecodecamp.org (self learning free courses)

# Contact & Notes

# Project Owner
- Name: Parth Khadke
- College: Sri Brijlal Biyani Science College
- Course: BCA Final Semester
- Email: parthkhadke720@gmail.com


# Notes for Future Reference
- This is a college project, not production software yet.
- Focus on demonstrating core concept, not perfection
- AI assistance used for code generation (documented)
- Prioritize working demo over advanced features.