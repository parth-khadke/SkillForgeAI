# Code Review Updates Log

This file tracks all changes made after project code reviews.

## Entry 1
- Reviewed by: Codex
- Review date: 2026-03-06
- Change timestamp (Asia/Calcutta): 2026-03-06 22:18:02 +05:30
- Scope: Post-review fixes requested by project owner
- Summary of reviewed and implemented changes:
  - Fixed remember-me behavior to correctly use `localStorage` only when selected, and `sessionStorage` otherwise.
  - Added safe JSON parsing guards for storage reads to prevent app crashes on malformed data.
  - Normalized login/signup email handling to lowercase to avoid case-variant account issues.
  - Updated onboarding flow to persist current-user state in the active storage mode (session vs local).
  - Scoped conflicting CSS selectors (`.step-number`, `.step-text`) to avoid cross-section style collisions.
  - Replaced placeholder `href="#"` interactions with meaningful behavior (`Forgot password` button and contact mailto link).
  - Removed duplicate global export assignments in auth script.

## Template For Future Entries
- Reviewed by: Codex
- Review date: YYYY-MM-DD
- Change timestamp (Asia/Calcutta): YYYY-MM-DD HH:mm:ss +05:30
- Scope: <short scope>
- Summary of reviewed and implemented changes:
  - <change 1>
  - <change 2>
