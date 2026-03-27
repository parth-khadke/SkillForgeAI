### SkillForge AI - BCA Final Semester Project

## Project Summary
SkillForge AI is a frontend prototype of an AI-powered learning roadmap platform. The product is designed to help users avoid random learning paths by generating a structured 12-week roadmap, tracking weekly progress, and unlocking the next module only after passing a validation quiz.

## Final Submission Status
- Submission stage: Final college project submission
- Submission date: 27 March 2026
- Current state: Submitted as-is
- Overall status: Working frontend MVP / prototype
- Delivery scope: End-to-end browser flow from signup to roadmap progression and weekly quiz validation
- Live demo: https://parth-khadke.github.io/SkillForgeAI/

## What Is Implemented
- Landing page with project concept and product messaging
- Login and signup flow using localStorage
- Password validation with basic rules
- Multi-step onboarding flow for skill, goal, level, time commitment, and preferred resources
- 12-week roadmap generation based on onboarding inputs
- Gemini API integration for roadmap and quiz generation
- Automatic fallback roadmap and quiz data when live AI generation fails
- Dashboard with weekly module cards
- Sequential module unlocking
- Weekly checklist progress tracking
- Quiz page for weekly validation
- Quiz scoring with pass/fail logic
- Persistent user and roadmap state in localStorage
- Frontend deployment on GitHub Pages

## What Is Not Implemented
- Backend server
- Database integration
- JWT authentication
- Secure password hashing
- Cross-device sync
- Progress analytics such as charts, streaks, or time tracking
- Separate module detail page
- Advanced adaptive retry flow with easier regenerated questions
- Production-grade security and deployment architecture

## Current Tech Stack

### Frontend
- HTML5
- CSS3
- Tailwind CSS via CDN
- Vanilla JavaScript

### AI Layer
- Google Gemini API
- Fallback hardcoded roadmap and quiz generation for demo continuity

### Storage
- Browser localStorage

### Deployment
- GitHub Pages

## Current File Structure
```text
SkillForgeAI/
|-- index.html
|-- auth.html
|-- onboarding.html
|-- dashboard.html
|-- quiz.html
|-- project_overview.md
|-- README.md
|-- css/
|   |-- index.css
|   |-- animation.css
|   |-- auth.css
|   |-- onboarding.css
|   |-- dashboard.css
|   `-- quiz.css
`-- js/
    |-- app.js
    |-- auth.js
    |-- onboarding.js
    |-- dashboard.js
    |-- quiz.js
    `-- roadmap-generator.js
```

## Feature Status Snapshot

### Completed
- Landing page
- Authentication UI and logic
- Onboarding flow
- AI and fallback roadmap generation
- Dashboard roadmap rendering
- Module checklist system
- Progressive unlocking
- Weekly quiz generation and evaluation
- Local persistence
- GitHub Pages deployment

### Partial / Demo-Only
- Live AI generation depends on API availability
- Security is only suitable for prototype/demo use
- State persistence works only in the same browser via localStorage

### Not Started or Deferred
- Backend migration
- Database schema
- Analytics and reporting
- Production authentication
- Admin or instructor features

## Key Design Decisions
- Frontend-first build: Chosen to ensure a complete working demo within the project timeline
- localStorage persistence: Used to avoid backend dependency during submission
- AI fallback mode: Added so roadmap and quiz flows still work even if Gemini is unavailable
- Sequential unlocking: Implemented to support the main product idea of mastery before progression
- Separate quiz page: Used to keep weekly validation focused and easy to navigate

## Known Limitations
- Passwords are stored in localStorage and are not secure for real-world use
- API usage is handled from the frontend, which is not suitable for production security
- The application is a prototype and does not include a backend or database
- User progress is tied to one browser/device
- Some planned roadmap items from the original vision were reduced to meet the submission deadline

## Final Evaluation
This submission successfully demonstrates the core concept of SkillForge AI:
- a learner can sign up,
- complete onboarding,
- generate a personalized roadmap,
- work through weekly tasks,
- and unlock progress through quiz validation.

The project should be treated as a functional college prototype rather than a production-ready product. The main concept is implemented and demonstrable, while scalability, security, analytics, and backend architecture remain future work.

## Post-Submission Future Scope
- Move AI calls to a secure backend
- Add database-backed user accounts and progress storage
- Hash passwords and implement proper session handling
- Add richer analytics and learner insights
- Improve retry logic and adaptive quiz difficulty
- Expand roadmap customization and resource quality control

## Project Owner
- Name: Parth Khadke
- College: Sri Brijlal Biyani Science College
- Course: BCA Final Semester
- Email: parthkhadke720@gmail.com

## Submission Note
This document reflects the final state of the repository at the project deadline. The project is being submitted in its current implemented form without additional planned changes before evaluation.
